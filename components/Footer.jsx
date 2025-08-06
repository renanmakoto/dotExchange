import React from 'react'
import { View, StyleSheet, Text } from 'react-native'

export default function Footer() {
  return (
    <View style={styles.container}>
        <Text style={styles.footerText}>2025 - by dotExtension</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#858585',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  footerText: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "bold"
  }
})