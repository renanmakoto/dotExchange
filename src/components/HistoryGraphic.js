import React from 'react'
import { Text, View, StyleSheet } from 'react-native'

export default function HistoryGraphic() {
    return(
        <View style={styles.contentGraphic}></View>
    )
}

const styles = StyleSheet.create({
    contentGraphic: {
        width: "90%",
        height: 220,
        backgroundColor: "#232323",
        borderRadius: 10,
    }
})