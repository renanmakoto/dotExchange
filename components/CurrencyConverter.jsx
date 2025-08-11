import React, { useState } from 'react'
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import axios from 'axios';

export default function CurrencyConverter() {
  const [amount, setAmount] = useState('1');
  const [isCadToBrl, setIsCadToBrl] = useState(true);
  const [resultText, setResultText] = useState('');
  const [rateTime, setRateTime] = useState(''); // HH:mm (BRT)
  const [rateDate, setRateDate] = useState(''); // DD/MM/YYYY (BRT)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ---------- Helpers ----------
  const toMMDDYYYY = (d) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  };

  const formatCurrency = (value, currency) => {
    const locale = currency === 'BRL' ? 'pt-BR' : 'en-CA';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Be flexible with BRL-style input like "1.987,00": remove thousand sep, normalize comma to dot
  const sanitizeAmount = (text) => {
    // keep digits, dots, commas
    let cleaned = text.replace(/[^\d.,]/g, '');

    // if it contains a comma, treat '.' as thousands and drop them
    if (cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '');
      cleaned = cleaned.replace(',', '.');
    } else {
      // allow only one dot
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
      }
    }
    setAmount(cleaned);
  };

  const parseBcbTimestampToDisplay = (dataHoraCotacao) => {
    // "YYYY-MM-DD HH:mm:ss.SSS"
    if (!dataHoraCotacao) return { time: '-', date: '-' };
    const [datePart, timePartRaw] = String(dataHoraCotacao).split(' ');
    if (!datePart || !timePartRaw) return { time: '-', date: '-' };
    const [yyyy, mm, dd] = datePart.split('-');
    const hhmm = timePartRaw.slice(0, 5);
    return { time: hhmm, date: `${dd}/${mm}/${yyyy}` };
  };

  // ---------- API Calls ----------
  const getLatestViaAte = async (untilDateMMDDYYYY) => {
    const url =
      `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/` +
      `CotacaoMoedaAte(moeda=@moeda,dataCotacaoAte=@dataCotacaoAte)` +
      `?@moeda='CAD'&@dataCotacaoAte='${untilDateMMDDYYYY}'&$top=1&` +
      `$orderby=dataHoraCotacao%20desc&$format=json`;

    const { data } = await axios.get(url, { timeout: 10000 });
    const rows = data?.value || [];
    if (!rows.length) return null;
    return rows[0]; // { cotacaoVenda, dataHoraCotacao, ... }
  };

  const getLatestWalkingBack = async (maxDaysBack = 7) => {
    const today = new Date();
    for (let i = 0; i <= maxDaysBack; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const mmddyyyy = toMMDDYYYY(d);

      const url =
        `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/` +
        `CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)` +
        `?@moeda='CAD'&@dataCotacao='${mmddyyyy}'&$top=1&` +
        `$orderby=dataHoraCotacao%20desc&$format=json`;

      try {
        const { data } = await axios.get(url, { timeout: 10000 });
        const rows = data?.value || [];
        if (rows.length) return rows[0];
      } catch {
        // try next day back
      }
    }
    return null;
  };

  const fetchLatestRate = async () => {
    setLoading(true);
    setError('');
    setResultText('');
    setRateTime('');
    setRateDate('');

    try {
      const today = new Date();
      const mmddyyyy = toMMDDYYYY(today);

      // 1) Primary: up to *today* (should include Fri if Monday)
      let row = null;
      try {
        row = await getLatestViaAte(mmddyyyy);
      } catch {
        // proceed to fallback
      }

      // 2) Fallback: walk back up to 7 days (handles service glitches)
      if (!row) {
        row = await getLatestWalkingBack(7);
      }

      if (!row) {
        setError('No rate available (PTAX). Try again later.');
        return;
      }

      const { cotacaoVenda, dataHoraCotacao } = row;

      const input = parseFloat(amount);
      if (isNaN(input)) {
        setError('Enter a valid amount.');
        return;
      }

      // Convert
      let leftValue, rightValue, leftCcy, rightCcy;
      if (isCadToBrl) {
        leftValue = input;
        rightValue = input * cotacaoVenda;
        leftCcy = 'CAD';
        rightCcy = 'BRL';
      } else {
        leftValue = input;
        rightValue = input / cotacaoVenda;
        leftCcy = 'BRL';
        rightCcy = 'CAD';
      }

      const leftFormatted = formatCurrency(leftValue, leftCcy);
      const rightFormatted = formatCurrency(rightValue, rightCcy);
      setResultText(`${leftFormatted} = ${rightFormatted}`);

      const { time, date } = parseBcbTimestampToDisplay(dataHoraCotacao);
      setRateTime(time);
      setRateDate(date);
    } catch {
      setError('Failed to fetch exchange rate.');
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI ----------
  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={sanitizeAmount}
      />

      <TouchableOpacity
        onPress={() => setIsCadToBrl((v) => !v)}
        style={styles.switchBtn}
        activeOpacity={0.8}
      >
        <Text style={styles.switchText}>
          {isCadToBrl ? 'Switch to BRL → CAD' : 'Switch to CAD → BRL'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.convertBtn}
        onPress={fetchLatestRate}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.convertBtnText}>
            {isCadToBrl ? 'Convert CAD to BRL' : 'Convert BRL to CAD'}
          </Text>
        )}
      </TouchableOpacity>

      {!!resultText && <Text style={styles.result}>{resultText}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {(rateTime || rateDate) && (
        <View style={styles.rateBlock}>
          <Text style={styles.rateLabel}>Latest available rate (Brasília time):</Text>
          <Text style={styles.rateTime}>{rateTime || '-'}</Text>
          <Text style={styles.rateDate}>{rateDate || '-'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    padding: 20,
  },
  input: {
    fontSize: 30,
    marginBottom: 12,
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 220,
    textAlign: 'center',
    borderRadius: 12,
  },
  switchBtn: {
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#00ADA2',
    backgroundColor: 'transparent',
  },
  switchText: {
    color: '#00ADA2',
    fontWeight: '700',
  },
  convertBtn: {
    backgroundColor: '#00ADA2',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    minWidth: 220,
    alignItems: 'center',
  },
  convertBtnText: {
    color: 'white',
    fontWeight: '700',
  },
  result: {
    fontSize: 22,
    marginTop: 20,
    color: 'white',
    textAlign: 'center',
  },
  error: {
    marginTop: 12,
    color: '#ffb4b4',
  },
  rateBlock: {
    marginTop: 16,
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginBottom: 6,
  },
  rateTime: {
    fontSize: 16,
    color: 'white',
    marginBottom: 2,
  },
  rateDate: {
    fontSize: 16,
    color: 'white',
  },
});
