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
    const nowUTC = today.getUTCHours();
    const brtCutoffUTC = 16; // 1 PM Brasília = 16:00 UTC

    // If today is Sat or Sun, go back to Friday
    const day = today.getDay();
    if (day === 6) today.setDate(today.getDate() - 1); // Saturday → Friday
    else if (day === 0) today.setDate(today.getDate() - 2); // Sunday → Friday
    else if (nowUTC < brtCutoffUTC) today.setDate(today.getDate() - 1); // before 1pm BRT

    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${mm}-${dd}-${yyyy}`; // Format expected by BCB
  };

  const fetchExchangeRate = async () => {
    try {
      const formattedDate = getLastBusinessDay();

      const response = await axios.get(
        `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)?@moeda='CAD'&@dataCotacao='${formattedDate}'&$format=json`
      );

      console.log('API Response:', response.data.value);

      if (response.data.value.length > 0) {
        // Find the latest entry
        const latest = response.data.value[response.data.value.length - 1];

        const rate = latest.cotacaoVenda;
        const [datePart, timePartRaw] = latest.dataHoraCotacao.split(' ');
        const [year, month, day] = datePart.split('-');
        const timePart = timePartRaw.slice(0, 5); // HH:MM

        const formattedDate = `${day}/${month}/${year}`;
        setRateDate(formattedDate);
        setRateTime(timePart);

        let converted;
        if (isCadToBrl) {
          converted = (parseFloat(amount) * rate).toFixed(2);
          setResult(`${amount} CAD = ${converted} BRL`);
        } else {
          converted = (parseFloat(amount) / rate).toFixed(2);
          setResult(`${amount} BRL = ${converted} CAD`);
        }
      } else {
        setResult('No rate available.');
        setRateDate('');
        setRateTime('');
      }
    } catch (error) {
      console.error('Exchange API error:', error);
      setResult('Failed to fetch exchange rate.');
      setRateDate('');
      setRateTime('');
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

      {(rateDate && rateTime) && (
        <View style={styles.dateContainer}>
          <Text style={styles.dateTitle}>Latest available rate:</Text>
          <Text style={styles.dateText}>Time: {rateTime}</Text>
          <Text style={styles.dateText}>Date: {rateDate} (Brasília time)</Text>
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
  dateTitle: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 14,
    color: 'white',
  },
});
