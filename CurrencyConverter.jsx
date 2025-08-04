import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import axios from 'axios'

export default function CurrencyConverter() {
  const [loading, setLoading] = useState(true)
  const [cadToBrlQuotation, setCadToBrlQuotation] = useState(null)
  const [conversionType, setConversionType] = useState('cadToBrl')
  const [amount, setAmount] = useState('1')
  const [quotationDate, setQuotationDate] = useState('')

  useEffect(() => {
    const fetchExchangeRateFromBCB = async () => {
      try {
        const response = await axios.get(
          'https://api.bcb.gov.br/dados/serie/bcdata.sgs.16921/dados/ultimos/1?formato=json'
        )
        const data = response.data[0]
        const rate = parseFloat(data.valor.replace(',', '.'))
        setCadToBrlQuotation(rate)
        setQuotationDate(data.data)
      } catch (error) {
        console.error('Error fetching BCB exchange rate:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchExchangeRateFromBCB()
  }, [])

  const handleAmountChange = (text) => {
    setAmount(text.replace(/[^0-9.]/g, ''))
  }

  const toggleConversionType = () => {
    setConversionType(conversionType === 'cadToBrl' ? 'brlToCad' : 'cadToBrl')
  }

  const convertedValue = () => {
    if (!cadToBrlQuotation) return '...'
    const amt = parseFloat(amount)
    if (isNaN(amt)) return '0.00'

    const converted = conversionType === 'cadToBrl'
      ? amt * cadToBrlQuotation
      : amt / cadToBrlQuotation

    const formatted = new Intl.NumberFormat(
      conversionType === 'cadToBrl' ? 'pt-BR' : 'en-CA',
      {
        style: 'currency',
        currency: conversionType === 'cadToBrl' ? 'BRL' : 'CAD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ).format(converted)

    return formatted
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
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
        <>
          <Text style={styles.text}>
            {amount} {conversionType === 'cadToBrl' ? 'CAD' : 'BRL'} = {convertedValue()}
          </Text>
          <Text style={styles.dateText}>Rate date: {quotationDate}</Text>
        </>
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
    color: '#FFFFFF',
    textAlign: 'center',
  },
  dateText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FFFFFF',
  },
})
