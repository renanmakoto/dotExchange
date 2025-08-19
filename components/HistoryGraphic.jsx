import React from "react"
import { View, Text, Dimensions, StyleSheet } from "react-native"
import { LineChart } from "react-native-chart-kit"

const THEME = {
  cardBgFrom: "#1C1C1E",
  cardBgTo: "#2A2A2C",
  accent: "#00ADA2",
  textPrimary: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.7)",
  grid: "rgba(255,255,255,0.12)",
}

export default function HistoryGraphic({
  data,
  labels,
  title = "Monthly history",
  subtitle = "Last 12 months",
  height = 260,
  decimalPlaces = 4,
  yAxisSuffix = "",
}) {
  if (!data?.length) return null

  const width = Dimensions.get("window").width - 24

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <LineChart
        data={{
          labels,
          datasets: [{ data }],
        }}
        width={width}
        height={height}
        withInnerLines={false}
        withVerticalLines={false}
        yLabelsOffset={8}
        yAxisSuffix={yAxisSuffix}
        chartConfig={{
          backgroundColor: THEME.cardBgFrom,
          backgroundGradientFrom: THEME.cardBgFrom,
          backgroundGradientTo: THEME.cardBgTo,
          decimalPlaces,
          color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
          labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
          propsForDots: {
            r: "2.5",
            strokeWidth: "1",
            stroke: THEME.accent,
          },
          propsForBackgroundLines: {
            strokeDasharray: "0",
            stroke: THEME.grid,
          },
        }}
        bezier
        style={styles.chart}
      />

      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: THEME.accent }]} />
        <Text style={styles.legendText}>Exchange rate</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 20,
    marginHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: THEME.cardBgFrom,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  header: {
    marginBottom: 8,
    alignItems: "flex-start",
  },
  title: {
    color: THEME.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  subtitle: {
    color: THEME.textMuted,
    fontSize: 12,
  },
  chart: {
    borderRadius: 12,
    marginTop: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingHorizontal: 2,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: THEME.textMuted,
    fontSize: 12,
  },
});
