import React from "react";
import { View, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";

export default function HistoryGraphic({ data, labels }) {
  if (!data?.length) return null;

  return (
    <View style={{ marginTop: 20 }}>
      <LineChart
        data={{
          labels,
          datasets: [{ data }],
        }}
        width={Dimensions.get("window").width - 24} // small horizontal padding
        height={240}
        withInnerLines={false}
        withVerticalLines={false}
        yLabelsOffset={8}
        chartConfig={{
          backgroundColor: "#000000",
          backgroundGradientFrom: "#232323",
          backgroundGradientTo: "#3F3F3F",
          decimalPlaces: 4, // monthly series usually nicer with 4 decimals
          color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
          labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
          propsForDots: {
            r: "2",
            strokeWidth: "1",
            stroke: "#00ADA2",
          },
        }}
        bezier
        style={{ borderRadius: 12 }}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2b2b2b',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  chart: {
    borderRadius: 12,
  },
});
