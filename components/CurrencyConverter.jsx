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
        `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoCAD-USD(dataCotacao=@dataCotacao)?@dataCotacao='${today}'&$top=1&$orderby=dataHoraCotacao desc&$format=json`
      )

      if (response.data.value.length > 0) {
        const rate = response.data.value[0].cotacaoVenda
        const rateDateTime = response.data.value[0].dataHoraCotacao
        const [rawDate, rawTime] = rateDateTime.split('T')
        const [year, month, day] = rawDate.split('-')
        const formattedDate = `${day}/${month}/${year}`
        const formattedTime = rawTime.split('.')[0]

        let converted = 0
        let displayText = ''

        if (isCadToBrl) {
          converted = (parseFloat(amount) * rate).toFixed(2)
          displayText = `${amount} CAD = ${converted} BRL`
        } else {
          converted = (parseFloat(amount) / rate).toFixed(2)
          displayText = `${amount} BRL = ${converted} CAD`
        }

        setResult(displayText)
        setDate(`Rate time: ${formattedTime}\nRate date: ${formattedDate}`)
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
      <TouchableOpacity
        onPress={() => setIsCadToBrl(!isCadToBrl)}
        style={styles.switchButton}
      >
        <Text style={styles.switchText}>
          {isCadToBrl ? 'Switch to BRL → CAD' : 'Switch to CAD → BRL'}
        </Text>
      </TouchableOpacity>

      <Button
        title={isCadToBrl ? 'CONVERT CAD TO BRL' : 'CONVERT BRL TO CAD'}
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
    borderRadius: 20,
  },
  switchButton: {
    backgroundColor: '#d3d3d3',
    padding: 10,
    borderRadius: 15,
    marginBottom: 10,
  },
  switchText: {
    fontSize: 16,
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
    textAlign: 'center',
    lineHeight: 20,
  },
})
