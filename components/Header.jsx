import React from 'react'
import { View, StyleSheet, Text } from 'react-native'

export default function Header() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>dotExchange</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 24,
    lineHeight: 28,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
})
