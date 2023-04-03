import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import React, {Fragment} from 'react'

export default function QuotationList() {
  return (
    <Fragment>
        <View style={styles.filters}>
          <TouchableOpacity 
            style={styles.buttonQuery}
            onPress={() => {}}
          >
            <Text
              style={styles.textButtonQuery}
            >7D</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.buttonQuery}
            onPress={() => {}}
          >
            <Text
              style={styles.textButtonQuery}
            >15D</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.buttonQuery}
            onPress={() => {}}
          >
            <Text
              style={styles.textButtonQuery}
            >1M</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.buttonQuery}
            onPress={() => {}}
          >
            <Text
              style={styles.textButtonQuery}
            >3M</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.buttonQuery}
            onPress={() => {}}
          >
            <Text
              style={styles.textButtonQuery}
            >6M</Text>
          </TouchableOpacity>
        </View>
    </Fragment>
  )
}

const styles = StyleSheet.create({
  filters: {
    width: "100%",
    flexDirection: "row",
    paddingVertical: 15,
    justifyContent: "space-evenly",
  },
  buttonQuery: {
    width: 50,
    height: 30,
    backgroundColor: "#F50D41",
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  textButtonQuery: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
})