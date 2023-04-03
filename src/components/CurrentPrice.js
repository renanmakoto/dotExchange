import React from 'react'
import { Text, View, StyleSheet } from 'react-native'

export default function CurrentPrice() {
    return(
        <View style={styles.headerPrice}>
            <Text style={styles.currentPrice}>$ 55.000</Text>
            <Text style={styles.textPrice}>Latest update</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    headerPrice: {
        width: "100%",
        height: "auto",
        alignItems: "center",
        marginTop: 20,
    },
    currentPrice: {
        color: "#f50d41",
        fontSize: 32,
        fontWeight: "bold",
    },
    textPrice: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "bold",
    }
})