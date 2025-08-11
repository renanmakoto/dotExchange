import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import axios from 'axios';

export default function CurrencyConverter() {
  const [amount, setAmount] = useState('1');
  const [isCadToBrl, setIsCadToBrl] = useState(true);
  const [resultText, setResultText] = useState('');
  const [rateTime, setRateTime] = useState(''); // e.g., "13:10"
  const [rateDate, setRateDate] = useState(''); // e.g., "07/08/2025"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helpers
  const todayMMDDYYYY = () => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yyyy = now.getFullYear();
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

  const sanitizeAmount = (text) => {
    // allow digits and a single dot or comma
    const cleaned = text.replace(/[^0-9.,]/g, '');
    // normalize comma to dot for calculation
    const normalized = cleaned.replace(',', '.');
    setAmount(normalized);
  };

  const fetchLatestRate = async () => {
    setLoading(true);
    setError('');
    setResultText('');
    setRateTime('');
    setRateDate('');

    try {
      // Ask for the most recent available CAD rate up to *today*
      const dateParam = todayMMDDYYYY(); // MM-DD-YYYY
      const url =
        `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/` +
        `CotacaoMoedaAte(moeda=@moeda,dataCotacaoAte=@dataCotacaoAte)` +
        `?@moeda='CAD'&@dataCotacaoAte='${dateParam}'&$top=1&` +
        `$orderby=dataHoraCotacao%20desc&$format=json`;

      const resp = await axios.get(url);
      const rows = resp?.data?.value || [];

      if (!rows.length) {
        setError('No rate available (PTAX). Try again later.');
        return;
      }

      const { cotacaoVenda, dataHoraCotacao } = rows[0]; // dataHoraCotacao like "2025-08-07 13:10:28.166"

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

      // Timestamp handling — show as Brasília time (API already returns BRT)
      // dataHoraCotacao format: "YYYY-MM-DD HH:mm:ss.SSS"
      const [datePart, timePartRaw] = String(dataHoraCotacao).split(' ');
      if (datePart && timePartRaw) {
        const [yyyy, mm, dd] = datePart.split('-');
        const hhmm = timePartRaw.slice(0, 5); // HH:mm
        setRateTime(hhmm);
        setRateDate(`${dd}/${mm}/${yyyy}`);
      }
    } catch (e) {
      setError('Failed to fetch exchange rate.');
    } finally {
      setLoading(false);
    }
  };

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

      {/* Rate date block */}
      {!!(rateTime || rateDate) && (
        <View style={styles.rateBlock}>
          <Text style={styles.rateLabel}>Rate date (Brasília time):</Text>
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
