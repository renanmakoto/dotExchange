import React, { useEffect } from 'react'
import { View, StyleSheet, StatusBar, Platform } from 'react-native'
import Header from './components/Header';
import Footer from './components/Footer';
import CurrencyConverter from './components/CurrencyConverter';

export default function App() {
  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#ffffff', true);
      StatusBar.setTranslucent(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
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
});
