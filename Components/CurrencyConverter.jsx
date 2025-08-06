import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import axios from 'axios';

export default function CurrencyConverter() {
  const [loading, setLoading] = useState(true);
  const [rate, setRate] = useState(null);
  const [conversionType, setConversionType] = useState('cadToBrl');
  const [amount, setAmount] = useState('1');
  const [date, setDate] = useState(null);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await axios.get(
          'https://api.bcb.gov.br/dados/serie/bcdata.sgs.16921/dados/ultimos/1?formato=json'
        );
        const data = res.data[0];
        setRate(parseFloat(data.valor.replace(',', '.')));
        setDate(data.data);
      } catch (err) {
        console.error('Error fetching rate:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, []);

  const toggleConversionType = () => {
    setConversionType(prev => (prev === 'cadToBrl' ? 'brlToCad' : 'cadToBrl'));
  };

  const getConvertedValue = () => {
    const num = parseFloat(amount) || 0;
    if (conversionType === 'cadToBrl') {
      return (num * rate).toFixed(2);
    }
    return (num / rate).toFixed(2);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="Enter amount"
        value={amount}
        onChangeText={setAmount}
      />
      <TouchableOpacity style={styles.button} onPress={toggleConversionType}>
        <Text style={styles.buttonText}>
          {conversionType === 'cadToBrl' ? 'CAD to BRL' : 'BRL to CAD'}
        </Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#00ADA2" />
      ) : (
        <>
          <Text style={styles.result}>
            {amount} {conversionType === 'cadToBrl' ? 'CAD' : 'BRL'} = {getConvertedValue()} {conversionType === 'cadToBrl' ? 'BRL' : 'CAD'}
          </Text>
          <Text style={styles.date}>Rate date: {date}</Text>
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
    height: 40,
    borderColor: '#fff',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    width: '80%',
    fontSize: 18,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#00ADA2',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  result: {
    fontSize: 20,
    color: '#fff',
  },
  date: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
  },
});
