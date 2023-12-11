import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import axios from 'axios'

export default function CurrencyConverter(props) {

  const [loading, setLoading] = useState(true)
  const [cadToBrlQuotation, setCadToBrlQuotation] = useState(null)
  const [conversionType, setConversionType] = useState('cadToBrl')
  const [amount, setAmount] = useState('1')

  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const response = await axios.get(
          'https://open.er-api.com/v6/latest'
        )
        const rates = response.data.rates
        const brlToUsdRate = rates.BRL
        const cadToUsdRate = rates.CAD
        const cadToBrlQuotation = 1 / (cadToUsdRate / brlToUsdRate)

        setCadToBrlQuotation(cadToBrlQuotation.toFixed(2))
      } catch (error) {
        console.error('Error fetching exchange rates:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchExchangeRates()
  }, [])

  const handleAmountChange = (text) => {
    setAmount(text.replace(/[^0-9]/g, ''))
  }

  const toggleConversionType = () => {
    setConversionType(conversionType === 'cadToBrl' ? 'brlToCad' : 'cadToBrl')
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="Enter amount"
        value={amount}
        onChangeText={handleAmountChange}
      />
      <TouchableOpacity style={styles.toggleButton} onPress={toggleConversionType}>
        <Text style={styles.toggleButtonText}>
          {conversionType === 'cadToBrl' ? 'CAD to BRL' : 'BRL to CAD'}
        </Text>
      </TouchableOpacity>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <Text style={styles.text}>
          {amount} {conversionType === 'cadToBrl' ? 'CAD' : 'BRL'} = {(parseFloat(amount) * (conversionType === 'cadToBrl' ? cadToBrlQuotation : 1/cadToBrlQuotation)).toFixed(2)} {conversionType === 'cadToBrl' ? 'BRL' : 'CAD'}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#858585',
  },
  input: {
    height: 40,
    borderColor: '#FFFFFF',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    width: '80%',
    fontSize: 30,
    backgroundColor: "#FFFFFF"
  },
  toggleButton: {
    backgroundColor: '#00ADA2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginBottom: 10,
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontSize: 30,
  },
  text: {
    fontSize: 32,
  },
})