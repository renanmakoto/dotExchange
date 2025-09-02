import React from 'react';
import { View, StyleSheet } from 'react-native';
import Header from './components/Header';
import Footer from './components/Footer';
import CurrencyConverter from './components/CurrencyConverter';

export default function App() {
  return (
    <View style={styles.container}>
      <Header />
      <CurrencyConverter />
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#858585',
    alignItems: 'center',
    justifyContent: 'center',
  },
})