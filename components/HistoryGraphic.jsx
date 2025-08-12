import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function HistoryGraphic({
  data = [],           // array of numbers
  labels = [],         // optional array of strings (same length as data)
  currencyLabel = '',  // e.g. "R$ " or "CAD "
  height = 220,
}) {
  return (
    <View style={styles.card}>
      <LineChart
        data={{
          labels, // show if provided
          datasets: [{ data }],
        }}
        width={screenWidth - 32}
        height={height}
        yAxisLabel={currencyLabel}
        withVerticalLines={false}
        withInnerLines={true}
        withDots={true}
        yLabelsOffset={6}
        chartConfig={{
          backgroundColor: '#2b2b2b',
          backgroundGradientFrom: '#2b2b2b',
          backgroundGradientTo: '#2b2b2b',
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,        // axis & line color
          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,    // x/y labels
          propsForDots: {
            r: '3',
            strokeWidth: '2',
            stroke: '#00ADA2', // your accent
            fill: '#00ADA2',
          },
          propsForBackgroundLines: {
            strokeDasharray: '3 6',
            strokeOpacity: 0.25,
          },
        }}
        bezier
        style={styles.chart}
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
