import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export default function AdPlaceholder({ visible = false }) {
  if (!visible) return null

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Ad space</Text>
      <Text style={styles.caption}>Premium placement available</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 780,
    minHeight: 120,
    marginBottom: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,173,162,0.4)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,173,162,0.08)',
    alignSelf: 'center',
  },
  heading: {
    color: '#00ADA2',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    lineHeight: 24,
  },
  caption: {
    color: '#858585',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
    textAlign: 'center',
  },
})
