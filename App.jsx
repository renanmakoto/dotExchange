import React, { useEffect, useMemo } from 'react'
import { View, StyleSheet, StatusBar, Platform } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import * as SystemUI from 'expo-system-ui'
import CurrencyConverter from './components/CurrencyConverter'

const BRAND_COLOR = '#00ADA2'

function RootLayout() {
  const insets = useSafeAreaInsets()

  const topInset = useMemo(() => {
    if (insets.top > 0) return insets.top
    return Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0
  }, [insets.top])

  const bottomInset = useMemo(() => Math.max(insets.bottom, 0), [insets.bottom])

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" />
      <View style={styles.backgroundAccent} />
      <View style={styles.backgroundGlow} />
      <View
        style={[
          styles.content,
          {
            paddingTop: 12 + topInset,
            paddingBottom: 6 + bottomInset,
          },
        ]}
      >
        <CurrencyConverter />
      </View>
      <View
        pointerEvents="none"
        style={[styles.statusBarOverlay, { height: topInset }]}
      />
    </View>
  )
}

export default function App() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(BRAND_COLOR).catch(() => {})
  }, [])

  return (
    <SafeAreaProvider>
      <RootLayout />
    </SafeAreaProvider>
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
    paddingHorizontal: 0,
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
