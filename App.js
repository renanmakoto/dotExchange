import React from 'react'
import { StyleSheet, StatusBar, SafeAreaView, Platform } from 'react-native'

import CurrentPrice from './src/components/CurrentPrice'
import HistoryGraphic from './src/components/HistoryGraphic'
import Title from './src/components/Title'
import QuotationList from './src/components/QuotationList'
import QuotationItems from './src/components/QuotationItems'

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <Title />
      <StatusBar
        backgroundColor='#F50D41'
        barStyle='light-content'
      />
      <CurrentPrice />
      <HistoryGraphic />
      <QuotationList />
      <QuotationItems />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
});
