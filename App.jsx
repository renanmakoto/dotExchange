import React, { useEffect, useMemo } from 'react'
import { View, StyleSheet, StatusBar, Platform, SafeAreaView } from 'react-native'
import CurrencyConverter from './components/CurrencyConverter'

export default function App() {
  useEffect(() => {
    StatusBar.setBarStyle('light-content')
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#00ADA2', true)
      StatusBar.setTranslucent(false)
    }
  }, [])

  const statusBarHeight = useMemo(
    () => (Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 44),
    [],
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#00ADA2" />
      <View style={styles.backgroundAccent} />
      <View style={styles.backgroundGlow} />
      <View style={styles.content}>
        <CurrencyConverter />
      </View>
      <View
        pointerEvents='none'
        style={[styles.statusBarOverlay, { height: statusBarHeight }]}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#00ADA2',
  },
  backgroundAccent: {
    position: 'absolute',
    top: -160,
    left: -80,
    right: -80,
    height: 340,
    borderBottomLeftRadius: 220,
    borderBottomRightRadius: 220,
    backgroundColor: 'rgba(255,255,255,0.15)',
    opacity: 1,
  },
  backgroundGlow: {
    position: 'absolute',
    bottom: -220,
    left: -60,
    right: -60,
    height: 420,
    borderTopLeftRadius: 280,
    borderTopRightRadius: 280,
    backgroundColor: 'rgba(133,133,133,0.2)',
    opacity: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    alignItems: 'center',
  },
  statusBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#00ADA2',
  },
})
