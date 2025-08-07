import React, { useState } from 'react'
import { View, TextInput, Text, Button, StyleSheet } from 'react-native'
import axios from 'axios'

export default function CurrencyConverter() {
  const [amount, setAmount] = useState('1')
  const [result, setResult] = useState(null)
  const [date, setDate] = useState('')

  const fetchExchangeRate = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const response = await axios.get(
        `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoCAD-USD(dataCotacao=@dataCotacao)?@dataCotacao='${today}'&$top=1&$orderby=dataHoraCotacao desc&$format=json`
      );

      if (response.data.value.length > 0) {
        const rate = response.data.value[0].cotacaoVenda;
        const rateDate = response.data.value[0].dataHoraCotacao.split('T')[0].split('-').reverse().join('/');
        const converted = (parseFloat(amount) * rate).toFixed(2);

        setResult(`${amount} CAD = ${converted} BRL`);
        setDate(`Rate date: ${rateDate}`);
      } else {
        setResult('No rate available.');
        setDate('');
      }
    } catch (error) {
      setResult('Failed to fetch exchange rate.');
      setDate('');
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
      <Button title="CAD to BRL" onPress={fetchExchangeRate} color="#00ADA2" />
      {result && <Text style={styles.result}>{result}</Text>}
      {date && <Text style={styles.date}>{date}</Text>}
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
    minWidth: 100,
    textAlign: 'center',
  },
  result: {
    fontSize: 20,
    marginTop: 20,
    color: 'white',
  },
  date: {
    fontSize: 14,
    marginTop: 5,
    color: 'white',
  },
});
