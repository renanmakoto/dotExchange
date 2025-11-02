import React, { useState, useMemo } from "react"
import { View, Dimensions, StyleSheet } from "react-native"
import { LineChart } from "react-native-chart-kit"

const THEME = {
  cardBgFrom: "#EFF9F8",
  cardBgTo: "#EFF9F8",
  accent: "#00ADA2",
  textPrimary: "#00ADA2",
  textMuted: "#858585",
  grid: "rgba(133,133,133,0.25)",
}

const GRAPH_PADDING_LEFT = 8
const GRAPH_PADDING_RIGHT = 8
const CHART_RIGHT_EXTENSION = 6
const CARD_RIGHT_EXTENSION = 0
const OUTER_GUTTER = 24

export default function HistoryGraphic({
  data,
  labels,
  height = 260,
  decimalPlaces = 4,
  yAxisSuffix = "",
  yPaddingFactor = 0.12,
}) {
  if (!data?.length) return null

  const windowWidth = Dimensions.get("window").width
  const maxChartWidth = 920
  const [measuredWidth, setMeasuredWidth] = useState(null)

  const fallbackWidth = useMemo(() => {
    const effectiveWidth = Math.min(windowWidth, maxChartWidth)
    return Math.max(
      effectiveWidth - OUTER_GUTTER - (GRAPH_PADDING_LEFT + GRAPH_PADDING_RIGHT),
      280
    )
  }, [windowWidth])

  const chartWidth = Math.max(measuredWidth ?? fallbackWidth, 260)
  const labelDecimals = useMemo(() => {
    if (!Number.isFinite(decimalPlaces)) return 0
    return Math.min(Math.max(Math.round(decimalPlaces), 0), 8)
  }, [decimalPlaces])

  const sanitizedData = useMemo(
    () => data.map((value) => (Number.isFinite(value) ? Number(value) : 0)),
    [data]
  )

  const [axisMin, axisMax] = useMemo(() => {
    const finiteValues = sanitizedData.filter((value) => Number.isFinite(value))
    if (!finiteValues.length) return [0, 0]

    const min = Math.min(...finiteValues)
    const max = Math.max(...finiteValues)
    const range = max - min

    const padding =
      range > 0
        ? range * yPaddingFactor
        : Math.max(Math.abs(max), 1) * (yPaddingFactor / 2)

    return [min - padding, max + padding]
  }, [sanitizedData, yPaddingFactor])

  const sanitizedLabels = useMemo(
    () => labels.map((label) => (label ?? "").toString()),
    [labels]
  )

  const chartData = useMemo(() => {
    const datasets = [
      {
        data: sanitizedData,
        color: (opacity = 1) => `rgba(0,173,162,${opacity})`,
        strokeWidth: 2,
      },
    ]

    if (
      sanitizedData.length > 0 &&
      Number.isFinite(axisMin) &&
      Number.isFinite(axisMax) &&
      axisMin !== axisMax
    ) {
      datasets.push({
        data: [axisMin, axisMax],
        withDots: false,
        strokeWidth: 0,
        color: () => 'rgba(0,0,0,0)',
      })
    }

    return {
      labels: sanitizedLabels,
      datasets,
    }
  }, [sanitizedData, sanitizedLabels, axisMin, axisMax])

  const chartConfig = useMemo(
    () => ({
      backgroundColor: THEME.cardBgFrom,
      backgroundGradientFrom: THEME.cardBgFrom,
      backgroundGradientTo: THEME.cardBgTo,
      backgroundGradientFromOpacity: 1,
      backgroundGradientToOpacity: 1,
      paddingRight: GRAPH_PADDING_RIGHT,
      paddingLeft: GRAPH_PADDING_LEFT,
      decimalPlaces: labelDecimals,
      color: (opacity = 1) => `rgba(0,173,162,${opacity})`,
      labelColor: (opacity = 1) => `rgba(133,133,133,${opacity})`,
      propsForDots: {
        r: "3",
        strokeWidth: "1.5",
        stroke: THEME.accent,
        fill: THEME.cardBgFrom,
      },
      propsForBackgroundLines: {
        strokeDasharray: "0",
        stroke: THEME.grid,
        strokeWidth: 1,
      },
    }),
    [labelDecimals]
  )

  return (
    <View
      style={styles.wrapper}
      onLayout={({ nativeEvent }) => {
        const inner = Math.max(
          nativeEvent.layout.width - (GRAPH_PADDING_LEFT + GRAPH_PADDING_RIGHT),
          0
        )
        if (!measuredWidth || Math.abs(inner - measuredWidth) > 1) {
          setMeasuredWidth(inner)
        }
      }}
    >
      <LineChart
        data={chartData}
        width={chartWidth + CHART_RIGHT_EXTENSION + GRAPH_PADDING_RIGHT}
        height={height}
        withInnerLines={false}
        withVerticalLines={false}
        withShadow={false}
        yLabelsOffset={10}
        xLabelsOffset={-2}
        yAxisSuffix={yAxisSuffix}
        chartConfig={chartConfig}
        bezier
        style={[styles.chart, { marginRight: -(CHART_RIGHT_EXTENSION + GRAPH_PADDING_RIGHT) }]}
     />

    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    maxWidth: 920,
    alignSelf: "stretch",
    marginTop: 20,
    marginHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: GRAPH_PADDING_LEFT,
    paddingRight: GRAPH_PADDING_RIGHT,
    marginRight: -CARD_RIGHT_EXTENSION,
    borderRadius: 18,
    backgroundColor: "#EFF9F8",
    borderWidth: 1,
    borderColor: "rgba(0,173,162,0.25)",
    shadowColor: "rgba(0,173,162,0.32)",
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
    overflow: "hidden",
  },
  chart: {
    borderRadius: 12,
    alignSelf: "flex-start",
  },
})
