import React, { useEffect, useMemo } from 'react'
import { View, StyleSheet, StatusBar, Platform } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import * as SystemUI from 'expo-system-ui'
import CurrencyConverter from './components/CurrencyConverter'

const BRAND_COLOR = '#00ADA2'
const BACKGROUND_ACCENT_COLOR = 'rgba(255,255,255,0.15)'
const BACKGROUND_GLOW_COLOR = 'rgba(133,133,133,0.2)'
const CONTENT_PADDING_TOP = 12
const CONTENT_PADDING_BOTTOM = 6

function RootLayout() {
  const insets = useSafeAreaInsets()

  const topInset = useMemo(() => {
    if (insets.top > 0) return insets.top
    return Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0
  }, [insets.top])

  const bottomInset = useMemo(() => Math.max(insets.bottom, 0), [insets.bottom])

  const contentPaddings = useMemo(() => ({
    paddingTop: CONTENT_PADDING_TOP + topInset,
    paddingBottom: CONTENT_PADDING_BOTTOM + bottomInset,
  }), [topInset, bottomInset])

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle='light-content' backgroundColor='transparent' />
      <View style={styles.backgroundAccent} />
      <View style={styles.backgroundGlow} />
      <View
        style={[
          styles.content,
          contentPaddings,
        ]}
      >
        <CurrencyConverter />
      </View>
      <View
        pointerEvents='none'
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
    backgroundColor: BRAND_COLOR,
  },
  backgroundAccent: {
    position: 'absolute',
    top: -160,
    left: -80,
    right: -80,
    height: 340,
    borderBottomLeftRadius: 220,
    borderBottomRightRadius: 220,
    backgroundColor: BACKGROUND_ACCENT_COLOR,
  },
  backgroundGlow: {
    position: 'absolute',
    bottom: -220,
    left: -60,
    right: -60,
    height: 420,
    borderTopLeftRadius: 280,
    borderTopRightRadius: 280,
    backgroundColor: BACKGROUND_GLOW_COLOR,
  },
  content: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: CONTENT_PADDING_TOP,
    paddingBottom: CONTENT_PADDING_BOTTOM,
    alignItems: 'center',
  },
  statusBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: BRAND_COLOR,
  },
})
