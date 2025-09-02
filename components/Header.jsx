import React from 'react'
import { View, StyleSheet, Text } from 'react-native'

export default function Header() {
  return (
    <View style={styles.container}>
        <Text style={styles.footerText}>dotExchange</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#858585',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  footerText: {
    fontSize: 50,
    color: "#00ADA2",
    fontWeight: 'bold',
  }
})