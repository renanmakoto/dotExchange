import React, { useMemo, useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Modal, FlatList, Pressable, Vibration, ScrollView,
  KeyboardAvoidingView, Platform, useWindowDimensions,
} from 'react-native'
import HistoryGraphic from './HistoryGraphic'
import AdPlaceholder from './AdPlaceholder'
import Header from './Header'
import Footer from './Footer'
import {
  CURRENCIES,
  fetchAnyRate,
  fetchMonthlySeries,
  formatAmount,
  getLocationForCurrency,
  parseTimestampParts,
  sanitizeSeries,
} from '../services/rates'

const BRAND_PRIMARY = '#00ADA2'
const BRAND_NEUTRAL = '#858585'
const BRAND_LIGHT = '#FFFFFF'

const primaryAlpha = (opacity) => `rgba(0,173,162,${opacity})`
const neutralAlpha = (opacity) => `rgba(133,133,133,${opacity})`

const SHOW_AD_PLACEHOLDER = false

const CARD_BASE_WIDTH = 370
const CARD_HORIZONTAL_PADDING = 20
const FORM_CONTENT_MAX_WIDTH = 320
const STACKED_SELECTOR_BREAKPOINT = 230
const INITIAL_PICKER_STATE = { which: null, open: false }

export default function CurrencyConverter() {
  const [amount, setAmount] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const requestTokenRef = useRef(0)
  const isMountedRef = useRef(true)

  useEffect(() => () => { isMountedRef.current = false }, [])

  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const isLandscape = windowWidth > windowHeight
  const isTabletBreakpoint = Math.max(windowWidth, windowHeight) >= 768

  const cardLayoutStyle = useMemo(() => {
    if (!windowWidth || !windowHeight) {
      return { alignSelf: 'center', width: CARD_BASE_WIDTH }
    }

    if (!isTabletBreakpoint) {
      const maxPhoneWidth = CARD_BASE_WIDTH
      const phoneWidth = Math.min(
        Math.max(windowWidth - 24, 320),
        maxPhoneWidth
      )
      return {
        alignSelf: 'center',
        width: phoneWidth,
      }
    }

    const tabletMargin = isLandscape ? 320 : 260
    const minTabletWidth = 380
    const maxTabletWidth = 520
    const availableWidth = Math.max(windowWidth - tabletMargin, minTabletWidth)
    const tabletWidth = Math.min(Math.max(availableWidth, minTabletWidth), maxTabletWidth)

    return {
      alignSelf: 'center',
      width: tabletWidth,
    }
  }, [windowWidth, windowHeight, isLandscape, isTabletBreakpoint])

  const cardWidthValue = cardLayoutStyle.width ?? CARD_BASE_WIDTH
  const formInnerWidth = Math.min(
    Math.max(cardWidthValue - 2 * CARD_HORIZONTAL_PADDING, 0),
    FORM_CONTENT_MAX_WIDTH,
  )
  const shouldStackSelectors = formInnerWidth < STACKED_SELECTOR_BREAKPOINT

  const [pickerVisible, setPickerVisible] = useState(INITIAL_PICKER_STATE)

  const [convertedText, setConvertedText] = useState('')
  const [rateTimestampUTC, setRateTimestampUTC] = useState('')
  const [rateHasTime, setRateHasTime] = useState(false)
  const [graphData, setGraphData] = useState([])
  const [graphLabels, setGraphLabels] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingGraph, setLoadingGraph] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const locationSuffix = useMemo(() => {
    const loc = getLocationForCurrency(to)
    return loc ? `, ${loc}` : ''
  }, [to])

  const resetUiState = () => {
    setConvertedText('')
    setRateTimestampUTC('')
    setRateHasTime(false)
    setGraphData([])
    setGraphLabels([])
    setErrorMsg('')
  }

  const openPicker = (which) => setPickerVisible({ which, open: true })
  const pickCurrency = (code) => {
    if (pickerVisible.which === 'from') setFrom(code)
    if (pickerVisible.which === 'to') setTo(code)
    setPickerVisible(INITIAL_PICKER_STATE)
    setErrorMsg('')
  }

  const switchCurrencies = () => {
    setFrom(to)
    setTo(from)
    resetUiState()
  }

  const handleConvert = async () => {
    const requestId = ++requestTokenRef.current
    const isActiveRequest = () => isMountedRef.current && requestTokenRef.current === requestId

    resetUiState()
    setLoading(true)
    setLoadingGraph(false)

    if (!from || !to) {
      if (isActiveRequest()) setLoading(false)
      setErrorMsg('Select both currencies to convert.')
      Vibration.vibrate(180)
      return
    }

    if (from === to) {
      if (isActiveRequest()) setLoading(false)
      setErrorMsg('Please pick two different currencies for conversion.')
      Vibration.vibrate(180)
      return
    }

    try {
      const amt = parseFloat((amount || '').replace(',', '.'))
      if (isNaN(amt)) {
        setErrorMsg('Enter a valid amount')
        if (isActiveRequest()) setLoading(false)
        return
      }

      const { rate, timestampUTC, hasTime } = await fetchAnyRate(from, to)
      if (!isActiveRequest()) return
      const converted = amt * rate

      const left = `${formatAmount(amt, from)} ${from}`
      const right = `${formatAmount(converted, to)} ${to}`
      setConvertedText(`${left} = ${right}`)
      setRateTimestampUTC(timestampUTC)
      setRateHasTime(hasTime)
    } catch (e) {
      if (isActiveRequest()) {
        setErrorMsg('Failed to fetch exchange rate.')
        setLoading(false)
        setLoadingGraph(false)
      }
      return
    }

    const isBitcoinPair = from === 'BTC' || to === 'BTC'
    if (isBitcoinPair && isActiveRequest()) {
      setLoading(false)
      setLoadingGraph(false)
      return
    }

    try {
      if (isActiveRequest()) setLoadingGraph(true)
      const { labels, series, allZero } = await fetchMonthlySeries(from, to)
      if (!isActiveRequest()) return
      if (allZero) {
        const { rate } = await fetchAnyRate(from, to)
        if (!isActiveRequest()) return
        const flat = Array(labels.length).fill(rate)
        const cleaned = sanitizeSeries(flat)
        setGraphLabels(labels)
        setGraphData(cleaned)
      } else {
        const cleaned = sanitizeSeries(series)
        setGraphLabels(labels)
        setGraphData(cleaned)
      }
    } catch (e) {
    } finally {
      if (isActiveRequest()) {
        setLoading(false)
        setLoadingGraph(false)
      }
    }
  }

  const { timeStr, dateStr } = useMemo(() => parseTimestampParts(rateTimestampUTC), [rateTimestampUTC])
  const rateLineText = rateHasTime
    ? `as of ${timeStr}, ${dateStr}${locationSuffix}`
    : `as of ${dateStr}${locationSuffix}`

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
      bounces={false}
      overScrollMode='never'
    >
      <Header />
      <AdPlaceholder visible={SHOW_AD_PLACEHOLDER} />

      <View style={[styles.card, cardLayoutStyle]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeading}>Currency converter</Text>
        </View>

        <View style={styles.formContent}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.amountBlock}
          >
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType='decimal-pad'
              value={amount}
              onChangeText={setAmount}
              placeholder='Enter amount'
              placeholderTextColor={neutralAlpha(0.6)}
            />
          </KeyboardAvoidingView>

          <View
            style={[
              styles.selectionRow,
              shouldStackSelectors && styles.selectionRowStacked,
            ]}
          >
            <TouchableOpacity
              style={[
                styles.selector,
                shouldStackSelectors ? styles.selectorStacked : styles.selectorLeft,
              ]}
              onPress={() => openPicker('from')}
            >
              <Text style={styles.selectorLabel}>From</Text>
              <Text style={[styles.selectorValue, !from && styles.selectorPlaceholder]}>
                {from || 'Select'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.swapButton, shouldStackSelectors && styles.swapButtonStacked]}
              onPress={switchCurrencies}
            >
              <Text style={styles.swapButtonText}>⇆</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.selector,
                shouldStackSelectors ? styles.selectorStacked : styles.selectorRight,
              ]}
              onPress={() => openPicker('to')}
            >
              <Text style={styles.selectorLabel}>To</Text>
              <Text style={[styles.selectorValue, !to && styles.selectorPlaceholder]}>
                {to || 'Select'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, loading && styles.actionButtonDisabled]}
            onPress={handleConvert}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>
              {loading ? 'Converting…' : 'Convert now'}
            </Text>
          </TouchableOpacity>

          {!!convertedText && (
            <View style={styles.resultPill}>
              <Text style={styles.resultText}>{convertedText}</Text>
            </View>
          )}

          {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

          {!!rateTimestampUTC && (
            <View style={styles.rateBlock}>
              <Text style={styles.rateTitle}>Latest available rate</Text>
              <Text style={styles.rateSubtitle}>{rateLineText}</Text>
            </View>
          )}
        </View>

      </View>

      {loadingGraph && (
        <View style={styles.graphSkeleton}>
          <Text style={styles.graphSkeletonTitle}>Loading 12 month trend…</Text>
        </View>
      )}

      {!loadingGraph && graphData.length > 0 && (
        <HistoryGraphic
          data={graphData}
          labels={graphLabels}
          decimalPlaces={from === 'BTC' || to === 'BTC' ? 6 : 4}
        />
      )}

      <Footer />

      <Modal
        visible={pickerVisible.open}
        transparent
        animationType='fade'
        onRequestClose={() => setPickerVisible(INITIAL_PICKER_STATE)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(INITIAL_PICKER_STATE)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {pickerVisible.which === 'from' ? 'Select source currency' : 'Select target currency'}
            </Text>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => pickCurrency(item.code)}>
                  <Text style={styles.modalItemCode}>{item.code}</Text>
                  <Text style={styles.modalItemName}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 56,
    paddingHorizontal: 0,
  },
  card: {
    width: CARD_BASE_WIDTH,
    maxWidth: 820,
    alignSelf: 'center',
    marginHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
    marginBottom: 24,
    shadowColor: 'rgba(0,173,162,0.35)',
    shadowOpacity: 0.32,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 18 },
    elevation: 9,
    alignItems: 'center',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  cardHeading: {
    color: BRAND_PRIMARY,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 30,
  },
  formContent: {
    width: '100%',
    maxWidth: FORM_CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    alignItems: 'center',
  },
  amountBlock: {
    width: '100%',
    maxWidth: 420,
    marginTop: 10,
    alignItems: 'center',
    alignSelf: 'center',
  },
  label: {
    color: neutralAlpha(0.65),
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  amountInput: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: primaryAlpha(0.08),
    borderWidth: 1,
    borderColor: primaryAlpha(0.28),
    fontSize: 20,
    fontWeight: '700',
    color: BRAND_PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 18,
    textAlign: 'center',
    lineHeight: 24,
    shadowColor: primaryAlpha(0.3),
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  selectionRow: {
    marginTop: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  selectionRowStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  selector: {
    flex: 1,
    backgroundColor: primaryAlpha(0.06),
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: primaryAlpha(0.22),
  },
  selectorLeft: {
    marginRight: 12,
  },
  selectorRight: {
    marginLeft: 12,
  },
  selectorStacked: {
    flex: 0,
    width: '100%',
    marginHorizontal: 0,
    marginVertical: 6,
    alignSelf: 'stretch',
  },
  selectorLabel: {
    color: neutralAlpha(0.65),
    fontSize: 10.5,
    lineHeight: 14,
    marginBottom: 8,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  selectorValue: {
    color: BRAND_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  selectorPlaceholder: {
    color: neutralAlpha(0.6),
  },
  swapButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: BRAND_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: primaryAlpha(0.28),
    shadowColor: primaryAlpha(0.26),
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  swapButtonStacked: {
    marginVertical: 10,
    alignSelf: 'center',
  },
  swapButtonText: {
    color: BRAND_PRIMARY,
    fontSize: 18,
    fontWeight: '900',
  },
  actionButton: {
    marginTop: 28,
    borderRadius: 16,
    backgroundColor: BRAND_PRIMARY,
    borderWidth: 1,
    borderColor: primaryAlpha(0.5),
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: primaryAlpha(0.45),
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
    width: '100%',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: BRAND_LIGHT,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    lineHeight: 18,
  },
  resultPill: {
    marginTop: 24,
    backgroundColor: primaryAlpha(0.1),
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: primaryAlpha(0.4),
    width: '100%',
  },
  resultText: {
    color: BRAND_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    marginTop: 18,
    color: BRAND_NEUTRAL,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '600',
    width: '100%',
  },
  rateBlock: {
    marginTop: 30,
    alignItems: 'center',
    width: '100%',
  },
  rateTitle: {
    color: neutralAlpha(0.85),
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    lineHeight: 18,
  },
  rateSubtitle: {
    color: BRAND_PRIMARY,
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
    width: '100%',
  },
  graphSkeleton: {
    maxWidth: 920,
    alignSelf: 'stretch',
    marginTop: 20,
    marginHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 18,
    backgroundColor: '#EFF9F8',
    borderWidth: 1,
    borderColor: 'rgba(0,173,162,0.25)',
    borderStyle: 'dashed',
    shadowColor: 'rgba(0,173,162,0.32)',
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphSkeletonTitle: {
    color: neutralAlpha(0.8),
    fontSize: 15,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: primaryAlpha(0.45),
    justifyContent: 'center',
    padding: 24,
  },
  modalSheet: {
    backgroundColor: BRAND_LIGHT,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    maxHeight: '72%',
    borderWidth: 1,
    borderColor: primaryAlpha(0.3),
  },
  modalTitle: {
    color: BRAND_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 24,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalItemCode: {
    width: 56,
    color: BRAND_PRIMARY,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 24,
  },
  modalItemName: {
    flex: 1,
    color: BRAND_NEUTRAL,
    fontSize: 15,
    lineHeight: 22,
  },
  separator: {
    height: 1,
    backgroundColor: neutralAlpha(0.2),
  },
})
