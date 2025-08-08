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

    if (day === 0) today.setDate(today.getDate() - 2); // Sunday
    else if (day === 6) today.setDate(today.getDate() - 1); // Saturday

    const nowUTC = new Date().getUTCHours();
    if (nowUTC < 16) today.setDate(today.getDate() - 1); // before 1pm BR time

    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();

    return `${mm}-${dd}-${yyyy}`;
  };

  const fetchExchangeRate = async () => {
    try {
      const formattedDate = getLastBusinessDay();

      const response = await axios.get(
        `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='CAD'&@dataCotacao='${formattedDate}'&$format=json`
      );

      if (response.data.value.length > 0) {
        const rate = response.data.value[0].cotacaoVenda;
        const [datePart, timePartRaw] = response.data.value[0].dataHoraCotacao.split('T');
        const formattedDate = datePart.split('-').reverse().join('/');
        const formattedTime = timePartRaw.split('.')[0]; // HH:mm:ss

        let converted;
        if (isCadToBrl) {
          converted = (parseFloat(amount) * rate).toFixed(2);
          setResult(`${amount} CAD = ${converted} BRL`);
        } else {
          converted = (parseFloat(amount) / rate).toFixed(2);
          setResult(`${amount} BRL = ${converted} CAD`);
        }

        setRateTime(formattedTime);
        setRateDate(formattedDate);
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

      <Text style={styles.result}>{result}</Text>

      {rateDate !== '' && (
        <View style={styles.dateContainer}>
          <Text style={styles.date}>Rate date:</Text>
          <Text style={styles.date}>{rateTime}</Text>
          <Text style={styles.date}>{rateDate}</Text>
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
  dateContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    color: 'white',
  },
});
