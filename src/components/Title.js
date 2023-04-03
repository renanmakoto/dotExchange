import { Text, View, StyleSheet } from 'react-native'
import React from 'react'

export default function Title(){
    return (
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>dotCoin</Text>
      </View>
    )
}

const styles = StyleSheet.create({
    titleContainer: {
        backgroundColor:"#424242",
        borderRadius: 10,
        width: "90%",
        alignItems: "center",
    },
    titleText: {
        color: "#FFFFFF",
        fontSize: 50,
        fontWeight: "bold",
    }
})