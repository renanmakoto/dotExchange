import React from 'react'
import { View, StyleSheet, Text } from 'react-native'

export default function Footer() {
  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      <Text style={styles.mainText}>dotExtension  -  2025</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 10,
    paddingBottom: 28,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: '40%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
  },
  mainText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 22,
  },
})
