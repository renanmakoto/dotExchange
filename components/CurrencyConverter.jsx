import React, { useState } from 'react';
import { View, TextInput, Text, Button, StyleSheet, TouchableOpacity } from 'react-native';
import axios from 'axios';

export default function CurrencyConverter() {
  const [amount, setAmount] = useState('1');
  const [result, setResult] = useState(null);
  const [rateTime, setRateTime] = useState('');
  const [rateDate, setRateDate] = useState('');
  const [isCadToBrl, setIsCadToBrl] = useState(true);

  const getLastBusinessDay = () => {
    const today = new Date();
    let day = today.getDay();

    if (day === 0) today.setDate(today.getDate() - 2);
    else if (day === 6) today.setDate(today.getDate() - 1);

    const nowUTC = new Date().getUTCHours();
    if (nowUTC < 16) today.setDate(today.getDate() - 1);

    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();

    return `${mm}-${dd}-${yyyy}`;
  };

  const formatBRL = (value) => {
    return parseFloat(value)
      .toFixed(2)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const formatCAD = (value) => {
    return parseFloat(value).toFixed(2); // 500.00
  };

  const fetchExchangeRate = async () => {
    try {
      const formattedDate = getLastBusinessDay();

      const response = await axios.get(
        `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='CAD'&@dataCotacao='${formattedDate}'&$format=json`
      );

      if (response.data.value.length > 0) {
        const rates = response.data.value;
        const latest = rates.find(r => r.tipoBoletim === 'Fechamento PTAX') || rates[rates.length - 1];

        const rate = latest.cotacaoVenda;
        const [dateStr, timeStr] = latest.dataHoraCotacao.split(' ');

        let converted, display;

        if (isCadToBrl) {
          converted = parseFloat(amount) * rate;
          display = `${formatCAD(amount)} CAD = ${formatBRL(converted)} BRL`;
        } else {
          converted = parseFloat(amount) / rate;
          display = `${formatBRL(amount)} BRL = ${formatCAD(converted)} CAD`;
        }

        setResult(display);
        setRateTime(timeStr.split('.')[0]);
        setRateDate(dateStr.split('-').reverse().join('/'));
      } else {
        setResult('No rate available.');
        setRateTime('');
        setRateDate('');
      }
    } catch (error) {
      console.error('Exchange API error:', error);
      setResult('Failed to fetch exchange rate.');
      setRateTime('');
      setRateDate('');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <TouchableOpacity style={styles.switchButton} onPress={() => setIsCadToBrl(!isCadToBrl)}>
        <Text style={styles.switchText}>
          {isCadToBrl ? 'Switch to BRL → CAD' : 'Switch to CAD → BRL'}
        </Text>
      </TouchableOpacity>

      <Button
        title={isCadToBrl ? 'Convert CAD to BRL' : 'Convert BRL to CAD'}
        onPress={fetchExchangeRate}
        color="#00ADA2"
      />

      {result && <Text style={styles.result}>{result}</Text>}
      {(rateTime && rateDate) && (
        <View style={styles.dateBox}>
          <Text style={styles.dateLabel}>Rate date (Brasília time):</Text>
          <Text style={styles.dateValue}>{rateTime}</Text>
          <Text style={styles.dateValue}>{rateDate}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  input: {
    fontSize: 30,
    marginBottom: 10,
    backgroundColor: 'white',
    padding: 10,
    minWidth: 200,
    textAlign: 'center',
    borderRadius: 10,
  },
  switchButton: {
    marginBottom: 10,
  },
  switchText: {
    color: '#00ADA2',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  result: {
    fontSize: 20,
    marginTop: 20,
    color: 'white',
  },
  dateBox: {
    marginTop: 20,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 14,
    color: 'white',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    color: 'white',
  },
});
