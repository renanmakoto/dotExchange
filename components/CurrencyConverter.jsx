import React, { useState, useEffect, useMemo } from 'react';
import { View, TextInput, Text, Button, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { LineChart } from 'react-native-chart-kit';

// --- helpers --------------------------------------------------------------

const toBCBDate = (d) => {
  // Format MM-DD-YYYY for BCB endpoints
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
};

const addDays = (d, delta) => {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
};

const weekdayShortEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Format amounts with locales
const fmtBRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v);
const fmtCAD = (v) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 }).format(v);

// Extract "YYYY-MM-DD HH:mm:ss" parts from BCB `dataHoraCotacao`
const parseBcbTimestamp = (stamp) => {
  // Example: "2025-08-07 13:10:28.166"
  // Treat as Brasília time already; just split
  if (!stamp || typeof stamp !== 'string') return { dateStr: '-', timeStr: '-' };
  const [datePart, timePartRaw] = stamp.split(' ');
  if (!datePart || !timePartRaw) return { dateStr: '-', timeStr: '-' };
  const timeStr = timePartRaw.slice(0, 5); // HH:mm
  // Convert YYYY-MM-DD to DD/MM/YYYY
  const [y, m, d] = datePart.split('-');
  const dateStr = `${d}/${m}/${y}`;
  return { dateStr, timeStr };
};

// Pick the *last* quote for each day; if a "Fechamento PTAX" exists for the day, prefer that
const pickDailyClose = (items) => {
  const byDate = new Map(); // date (YYYY-MM-DD) -> array of items for that day
  items.forEach((it) => {
    const datePart = (it.dataHoraCotacao || '').slice(0, 10);
    if (!datePart) return;
    if (!byDate.has(datePart)) byDate.set(datePart, []);
    byDate.get(datePart).push(it);
  });

  const perDayLast = [];
  for (const [date, arr] of Array.from(byDate.entries())) {
    // prefer Fechamento PTAX; otherwise last item in time order
    const fechamento = arr.find((a) => a.tipoBoletim && a.tipoBoletim.toLowerCase().includes('fechamento'));
    if (fechamento) perDayLast.push(fechamento);
    else {
      // sort by time asc, take last
      const sorted = arr.slice().sort((a, b) => (a.dataHoraCotacao > b.dataHoraCotacao ? 1 : -1));
      perDayLast.push(sorted[sorted.length - 1]);
    }
  }

  // sort days ascending by date
  perDayLast.sort((a, b) => (a.dataHoraCotacao < b.dataHoraCotacao ? -1 : 1));
  return perDayLast;
};

// --- component ------------------------------------------------------------

export default function CurrencyConverter() {
  const [amount, setAmount] = useState('1');
  const [isCadToBrl, setIsCadToBrl] = useState(true);

  // Latest quote
  const [latestRate, setLatestRate] = useState(null); // number
  const [latestStamp, setLatestStamp] = useState(null); // string from API
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [errorLatest, setErrorLatest] = useState('');

  // History
  const [historyRates, setHistoryRates] = useState([]); // numbers
  const [historyLabels, setHistoryLabels] = useState([]); // strings (Mon, Tue, ...)
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorHistory, setErrorHistory] = useState('');

  // Convert button handler
  const fetchLatestRate = async () => {
    setLoadingLatest(true);
    setErrorLatest('');
    try {
      // Try from today, fallback up to 7 previous days until we find at least one value
      const today = new Date();
      let found = null;
      let foundStamp = null;

      for (let back = 0; back < 8 && !found; back++) {
        const d = addDays(today, -back);
        const dateStr = toBCBDate(d);

        const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='CAD'&@dataCotacao='${dateStr}'&$format=json`;
        const { data } = await axios.get(url);
        const arr = (data && data.value) || [];
        if (arr.length > 0) {
          // take the last entry of that day (often Fechamento PTAX or latest intraday)
          const sorted = arr.slice().sort((a, b) => (a.dataHoraCotacao > b.dataHoraCotacao ? 1 : -1));
          const last = sorted[sorted.length - 1];
          found = Number(last.cotacaoVenda);
          foundStamp = last.dataHoraCotacao;
          break;
        }
      }

      if (!found) {
        setErrorLatest('No rate available.');
        setLatestRate(null);
        setLatestStamp(null);
      } else {
        setLatestRate(found);
        setLatestStamp(foundStamp);
      }
    } catch (e) {
      setErrorLatest('Failed to fetch exchange rate.');
      setLatestRate(null);
      setLatestStamp(null);
    } finally {
      setLoadingLatest(false);
    }
  };

  // Fetch history on mount (and you can re-use via a refresh button if you want)
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      setErrorHistory('');
      try {
        // Last 14 days window to ensure we collect at least 7 business days
        const end = new Date();
        const start = addDays(end, -14);
        const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@ini,dataFinalCotacao=@fim)?@moeda='CAD'&@ini='${toBCBDate(
          start
        )}'&@fim='${toBCBDate(end)}'&$format=json`;

        const { data } = await axios.get(url);
        const arr = (data && data.value) || [];

        if (!arr.length) {
          setErrorHistory('No history available.');
          setHistoryRates([]);
          setHistoryLabels([]);
          return;
        }

        const perDay = pickDailyClose(arr); // last quote per date
        const last7 = perDay.slice(-7); // last 7 days
        const rates = last7.map((x) => Number(x.cotacaoVenda));
        const labels = last7.map((x) => {
          const d = new Date(x.dataHoraCotacao.replace(' ', 'T')); // for weekday only
          return weekdayShortEn[d.getDay()];
        });

        setHistoryRates(rates);
        setHistoryLabels(labels);
      } catch (e) {
        setErrorHistory('Failed to fetch history.');
        setHistoryRates([]);
        setHistoryLabels([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, []);

  // Computed conversion text
  const resultText = useMemo(() => {
    if (!latestRate) return '';
    const amt = parseFloat(amount.replace(',', '.'));
    if (Number.isNaN(amt)) return '';

    if (isCadToBrl) {
      const v = amt * latestRate;
      return `${new Intl.NumberFormat('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amt)} CAD = ${fmtBRL(
        v
      )}`;
    } else {
      const v = amt / latestRate;
      return `${fmtBRL(amt)} = ${new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(v)}`;
    }
  }, [amount, isCadToBrl, latestRate]);

  // Rate date/time lines
  const { dateStr, timeStr } = useMemo(() => parseBcbTimestamp(latestStamp), [latestStamp]);

  return (
    <View style={styles.wrap}>
      {/* Amount input */}
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      {/* Switch button */}
      <TouchableOpacity style={styles.switchBtn} onPress={() => setIsCadToBrl((s) => !s)}>
        <Text style={styles.switchBtnText}>{isCadToBrl ? 'Switch to BRL → CAD' : 'Switch to CAD → BRL'}</Text>
      </TouchableOpacity>

      {/* Convert button */}
      <Button
        title={isCadToBrl ? 'Convert CAD to BRL' : 'Convert BRL to CAD'}
        onPress={fetchLatestRate}
        color="#00ADA2"
      />

      {/* Result */}
      {loadingLatest ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : errorLatest ? (
        <Text style={styles.error}>{errorLatest}</Text>
      ) : resultText ? (
        <Text style={styles.result}>{resultText}</Text>
      ) : null}

      {/* Rate date/time block */}
      {latestRate && (
        <View style={styles.rateBlock}>
          <Text style={styles.rateHeader}>Rate date (Brasília time):</Text>
          <Text style={styles.rateLine}>{timeStr}</Text>
          <Text style={styles.rateLine}>{dateStr}</Text>
        </View>
      )}

      {/* History chart */}
      <View style={{ width: '100%', marginTop: 24 }}>
        {loadingHistory ? (
          <ActivityIndicator />
        ) : errorHistory ? (
          <Text style={styles.error}>{errorHistory}</Text>
        ) : historyRates.length ? (
          <LineChart
            data={{
              labels: historyLabels,
              datasets: [{ data: historyRates }],
            }}
            width={Dimensions.get('window').width - 24}
            height={220}
            yAxisSuffix=""
            withVerticalLines={false}
            yLabelsOffset={6}
            withVerticalLabels
            chartConfig={{
              backgroundColor: '#2b2b2b',
              backgroundGradientFrom: '#2b2b2b',
              backgroundGradientTo: '#2b2b2b',
              decimalPlaces: 4,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              propsForDots: {
                r: '2.5',
                strokeWidth: '1',
                stroke: '#00ADA2',
              },
            }}
            bezier
            style={styles.chart}
          />
        ) : null}
      </View>
    </View>
  );
}

// --- styles ---------------------------------------------------------------

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    padding: 12,
    width: '100%',
  },
  input: {
    fontSize: 30,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    padding: 10,
    minWidth: 220,
    textAlign: 'center',
    borderRadius: 10,
  },
  switchBtn: {
    borderWidth: 1,
    borderColor: '#00ADA2',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginBottom: 10,
  },
  switchBtnText: {
    color: '#00ADA2',
    fontWeight: 'bold',
    fontSize: 14,
  },
  result: {
    fontSize: 22,
    marginTop: 20,
    color: 'white',
    textAlign: 'center',
  },
  rateBlock: {
    marginTop: 14,
    alignItems: 'center',
  },
  rateHeader: {
    fontSize: 14,
    color: '#d7d7d7',
    marginBottom: 2,
  },
  rateLine: {
    fontSize: 16,
    color: 'white',
    lineHeight: 22,
  },
  error: {
    marginTop: 16,
    color: '#ff6b6b',
    fontSize: 16,
  },
  chart: {
    borderRadius: 8,
    alignSelf: 'center',
  },
});
