import React, { useState } from 'react';
import { View, TextInput, Text, Button, StyleSheet } from 'react-native';
import axios from 'axios';

export default function CurrencyConverter() {
  const [amount, setAmount] = useState('1');
  const [result, setResult] = useState(null);
  const [date, setDate] = useState(null);
  const [isCadToBrl, setIsCadToBrl] = useState(true);

  const fetchExchangeRate = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const response = await axios.get(
        `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/Cotacao${isCadToBrl ? 'CAD' : 'USD'}-USD(dataCotacao=@dataCotacao)?@dataCotacao='${today}'&$top=1&$orderby=dataHoraCotacao desc&$format=json`
      );

      if (response.data.value.length > 0) {
        const rate = response.data.value[0].cotacaoVenda;
        const timestamp = response.data.value[0].dataHoraCotacao;

        const [datePart, timePartRaw] = timestamp.split('T');
        const formattedDate = datePart.split('-').reverse().join('/');
        const formattedTime = timePartRaw.split('.')[0]; // HH:mm:ss

        const converted = isCadToBrl
          ? (parseFloat(amount) * rate).toFixed(2)
          : (parseFloat(amount) / rate).toFixed(2);

        const from = isCadToBrl ? 'CAD' : 'BRL';
        const to = isCadToBrl ? 'BRL' : 'CAD';

        setResult(`${amount} ${from} = ${converted} ${to}`);
        setDate({
          time: `Rate time: ${formattedTime}`,
          date: `Rate date: ${formattedDate}`
        });
      } else {
        setResult('No rate available.');
        setDate(null);
      }
    } catch (error) {
      setResult('Failed to fetch exchange rate.');
      setDate(null);
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

      <View style={styles.switchButton}>
        <Button
          title={`Switch to ${isCadToBrl ? 'BRL → CAD' : 'CAD → BRL'}`}
          onPress={() => setIsCadToBrl(!isCadToBrl)}
          color="#ccc"
        />
      </View>

      <View style={styles.convertButton}>
        <Button
          title={`Convert ${isCadToBrl ? 'CAD to BRL' : 'BRL to CAD'}`}
          onPress={fetchExchangeRate}
          color="#00ADA2"
        />
      </View>

      {result && <Text style={styles.result}>{result}</Text>}
      {date && (
        <>
          <Text style={styles.date}>{date.time}</Text>
          <Text style={styles.date}>{date.date}</Text>
        </>
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
    borderRadius: 20,
  },
  switchButton: {
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  convertButton: {
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  result: {
    fontSize: 20,
    marginBottom: 10,
    color: 'white',
  },
  date: {
    fontSize: 14,
    color: 'white',
  },
});
