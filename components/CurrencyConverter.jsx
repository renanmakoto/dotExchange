import React, { useState } from 'react';
import { View, TextInput, Text, Button, StyleSheet, TouchableOpacity } from 'react-native';
import axios from 'axios';

export default function CurrencyConverter() {
  const [amount, setAmount] = useState('1');
  const [result, setResult] = useState(null);
  const [date, setDate] = useState('');
  const [isCadToBrl, setIsCadToBrl] = useState(true);

  const fetchExchangeRate = async () => {
    try {
      const today = new Date();
      const formattedDate = today.toLocaleDateString('pt-BR').split('/').join('-'); // dd-MM-yyyy
      const currency = isCadToBrl ? 'CAD' : 'CAD'; // Always fetch CAD rate

      const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='${currency}'&@dataCotacao='${formattedDate}'&$top=1&$orderby=cotacaoVenda desc&$format=json`;

      const response = await axios.get(url);

      if (response.data.value.length > 0) {
        const rate = response.data.value[0].cotacaoVenda;
        const rateDate = response.data.value[0].dataHoraCotacao.split('T')[0].split('-').reverse().join('/');
        let converted;

        if (isCadToBrl) {
          converted = (parseFloat(amount) * rate).toFixed(2);
          setResult(`${amount} CAD = ${converted} BRL`);
        } else {
          converted = (parseFloat(amount) / rate).toFixed(2);
          setResult(`${amount} BRL = ${converted} CAD`);
        }

        setDate(`Rate date: ${rateDate}`);
      } else {
        setResult('No rate available.');
        setDate('');
      }
    } catch (error) {
      console.error('Exchange API error:', error);
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
  date: {
    fontSize: 14,
    marginTop: 5,
    color: 'white',
  },
});
