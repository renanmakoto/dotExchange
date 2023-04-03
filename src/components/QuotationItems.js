import { View, Text, Image, StyleSheet } from 'react-native'
import React from 'react'

export default function QuotationItems() {
  return (
    <View style={styles.mainContent}>
      <View style={styles.contextLeft}>
      <View style={styles.boxLogo}>
        <Image
          style={styles.logoBitcoin}
          source={require("../../assets/logo64px.png")}
        />
        <Text style={styles.dayPrice}>04/03/2023</Text>
      </View>
      <View style={styles.contextRight}>
        <Text style={styles.price}>$ 37,839.09</Text>
      </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  mainContent: {
    width: "95%",
    height: "auto",
    backgroundColor: "#FFFFFF",
    marginLeft: "3%",
    marginBottom: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
})