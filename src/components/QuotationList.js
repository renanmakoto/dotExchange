import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native'
import React, {Fragment} from 'react'
import QuotationItems from './QuotationItems'

export default function QuotationList(props) {
  const daysQuery = props.filterDay

  return (
    <Fragment>
        <View style={styles.filters}>
          <TouchableOpacity 
            style={styles.buttonQuery}
            onPress={() => daysQuery(7)}
          >
            <Text
              style={styles.textButtonQuery}
            >7D</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.buttonQuery}
            onPress={() => daysQuery(15)}
          >
            <Text
              style={styles.textButtonQuery}
            >15D</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.buttonQuery}
            onPress={() => daysQuery(30)}
          >
            <Text
              style={styles.textButtonQuery}
            >1M</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.buttonQuery}
            onPress={() => daysQuery(90)}
          >
            <Text
              style={styles.textButtonQuery}
            >3M</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.buttonQuery}
            onPress={() => daysQuery(180)}
          >
            <Text
              style={styles.textButtonQuery}
            >6M</Text>
          </TouchableOpacity>
        </View>
        <ScrollView>
          <FlatList 
            data={props.listTransactions}
            renderItem={({item}) => {
              return <QuotationItems 
                      value={item.value}
                      data={item.data}
                    />
            }}
          />
        </ScrollView>
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