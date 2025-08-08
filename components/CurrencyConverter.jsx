import React, { useState } from 'react'
import { View, TextInput, Text, Button, StyleSheet, TouchableOpacity } from 'react-native'
import axios from 'axios'

export default function CurrencyConverter() {
  const [amount, setAmount] = useState('1')
  const [result, setResult] = useState(null)
  const [date, setDate] = useState('')
  const [isCadToBrl, setIsCadToBrl] = useState(true)

  const fetchExchangeRate = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      const response = await axios.get(
        `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaDia(moeda='CAD',dataCotacao='${today}')?$top=1&$orderby=cotacaoVenda desc&$format=json`
      )

      if (response.data.value.length > 0) {
        const rate = response.data.value[0].cotacaoVenda
        const rateDate = response.data.value[0].dataHoraCotacao.split('T')[0].split('-').reverse().join('/')

        const converted = isCadToBrl
          ? (parseFloat(amount) * rate).toFixed(2)
          : (parseFloat(amount) / rate).toFixed(2)

        const fromCurrency = isCadToBrl ? 'CAD' : 'BRL'
        const toCurrency = isCadToBrl ? 'BRL' : 'CAD'

        setResult(`${amount} ${fromCurrency} = ${converted} ${toCurrency}`)
        setDate(`Rate date: ${rateDate}`)
      } else {
        setResult('No rate available.')
        setDate('')
      }
    } catch (error) {
      setResult('Failed to fetch exchange rate.')
      setDate('')
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <TouchableOpacity onPress={() => setIsCadToBrl(!isCadToBrl)} style={styles.switchBtn}>
        <Text style={styles.switchText}>
          Switch to {isCadToBrl ? 'BRL → CAD' : 'CAD → BRL'}
        </Text>
      </TouchableOpacity>

      <Button
        title={isCadToBrl ? 'CAD to BRL' : 'BRL to CAD'}
        onPress={fetchExchangeRate}
        color="#00ADA2"
      />

      {result && <Text style={styles.result}>{result}</Text>}
      {date && <Text style={styles.date}>{date}</Text>}
    </View>
  )
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
  switchBtn: {
    marginBottom: 15,
    backgroundColor: '#ccc',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  switchText: {
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
})
