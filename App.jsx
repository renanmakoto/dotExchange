import React from 'react'
import { View, StyleSheet } from 'react-native'
import CurrencyConverter from './CurrencyConverter'
import Header from './Header'
import Footer from './Footer'

export default function App() {
  return (
    <View style={styles.container}>
      <Header />
      <CurrencyConverter />
      <Footer />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#858585',
    alignItems: 'center',
    justifyContent: 'center',
  },
})