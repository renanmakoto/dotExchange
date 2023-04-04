import React, { useState, useEffect } from 'react'
import { StyleSheet, StatusBar, SafeAreaView, Platform } from 'react-native'

import CurrentPrice from './src/components/CurrentPrice'
import HistoryGraphic from './src/components/HistoryGraphic'
import Title from './src/components/Title'
import QuotationList from './src/components/QuotationList'
import QuotationItems from './src/components/QuotationItems'

function addZero(number) {
  if (number <= 9) {
    return "0" + number
  }
  return number
}

function url(qtdDays) {
  const date = new Date()
  const listLastDays = qtdDays
  const end_date = `${date.getFullYear()}-${addZero(date.getMonth()+1)}-${addZero(date.getDate())}`
  date.setDate(date.getDate() - listLastDays)
  const start_date = `${date.getFullYear()}-${addZero(date.getMonth()+1)}-${addZero(date.getDate())}`
  return `https://api.coindesk.com/v1/bpi/historical/close.json?start=${start_date}&end=${end_date}`
}

async function getPriceCoinsGraphic(url) {
  let responseG = await fetch(url)
  let returnApiG = await responseG.json()
  let selectListQuotationsG = returnApiG.bpi
  const queryCoinsList = Object.keys(selectListQuotationsG).map((key) => {
      selectListQuotationsG[key]
  })
  let dataG = queryCoinsList
  return dataG
}

export default function App() {
  const [coinsList, setCoinsList] = useState([])
  const [coinsGraphicList, setCoinsGraphicList] = useState([0])
  const [days, setDays] = useState(30)
  const [updateData, setUpdateData] = useState(true)

  function updateDay(number) {
    setDays(number)
    setUpdateData(true)
  }

  useEffect(() => {
    getCoinsList(url(days)).then((data) => {
      setCoinsList(data)
  })
    getPriceCoinsGraphic(url(days)).then((dataG) => {
      setCoinsGraphicList(dataG)
    })
    if (updateData) {
      setUpdateData(false)
    }
  }, [updateData])

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
