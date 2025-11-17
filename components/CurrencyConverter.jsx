import React, { useMemo, useState } from 'react'
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Modal, FlatList, Pressable, Vibration, ScrollView,
  KeyboardAvoidingView, Platform, useWindowDimensions,
} from 'react-native'
import axios from 'axios'
import HistoryGraphic from './HistoryGraphic'
import AdPlaceholder from './AdPlaceholder'
import Header from './Header'
import Footer from './Footer'


const HAS_INTL =
  typeof Intl !== 'undefined' &&
  typeof Intl.NumberFormat === 'function' &&
  typeof Intl.DateTimeFormat === 'function'

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

function formatMonthLabel(dateObj) {
  if (HAS_INTL) {
    return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(dateObj)
  }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return months[dateObj.getUTCMonth()]
}

function normalizeUTC(str) {
  if (!str) return null
  if (str.includes(' ') && !str.endsWith('Z')) {
    return new Date(str.replace(' ', 'T') + 'Z')
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

function safeFormatNumber(value, locale, opts) {
  if (HAS_INTL) return new Intl.NumberFormat(locale, opts).format(value)

  const digits =
    (opts && (opts.minimumFractionDigits ?? opts.maximumFractionDigits)) ?? 2
  const n = Number(value)
  if (!isFinite(n)) return String(value)
  const s = n.toFixed(digits)
  if (locale === 'pt-BR') {
    const [int, dec] = s.split('.')
    return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + dec : '')
  }
  return s
}

function safeFormatTimeISO(isoOrUtcStr) {
  const d = normalizeUTC(isoOrUtcStr)
  if (!d) return '-'
  if (HAS_INTL) {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
    }).format(d)
  }
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function safeFormatDateISO(isoOrUtcStr) {
  const d = normalizeUTC(isoOrUtcStr)
  if (!d) return '-'
  if (HAS_INTL) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    }).format(d)
  }
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]
  return `${m} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

const CURRENCIES = [
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'BTC', name: 'Bitcoin' },
]

function getLocationForCurrency(toCode) {
  switch (toCode) {
    case 'BRL': return 'Brasília'
    case 'CAD': return 'Toronto'
    case 'USD': return 'New York'
    case 'EUR': return 'Frankfurt'
    case 'BTC':
    default:    return ''
  }
}

const http = axios.create({ timeout: 12000 })
const httpFast = axios.create({ timeout: 8000 })

function formatAmount(value, currency) {
  try {
    const isBTC = currency === 'BTC'
    const locale =
      currency === 'BRL' ? 'pt-BR' :
      currency === 'EUR' ? 'en-IE' :
      'en-CA'
    const opts = isBTC
      ? { minimumFractionDigits: 8, maximumFractionDigits: 8 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    return safeFormatNumber(value, locale, opts)
  } catch {
    return String(value)
  }
}

function parseTimestampParts(utcString) {
  if (!utcString) return { timeStr: '-', dateStr: '-' }
  return {
    timeStr: safeFormatTimeISO(utcString),
    dateStr: safeFormatDateISO(utcString),
  }
}

function mmddyyyy(d) {
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${mm}-${dd}-${yyyy}`
}

function yyyymmdd(d) {
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${yyyy}-${mm}-${dd}`
}

function lastTwelveMonthEnds() {
  const out = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0))
    out.push(d)
  }
  return out
}

async function fetchBcbPair(base, quote) {
  const foreign = base === 'BRL' ? quote : base
  let attempts = 0
  let day = new Date()

  while (attempts < 7) {
    const bcbDate = mmddyyyy(day)
    const url =
      `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/` +
      `CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)` +
      `?@moeda='${foreign}'&@dataCotacao='${bcbDate}'&$top=100&$orderby=dataHoraCotacao desc&$format=json`

    try {
      const { data } = await http.get(url)
      const arr = data?.value ?? []
      if (arr.length) {
        const latest = arr[0]
        const brlPerForeign = latest.cotacaoVenda
        const ts = latest.dataHoraCotacao
        if (base === 'BRL' && quote !== 'BRL') {
          return { rate: 1 / brlPerForeign, timestampUTC: ts, hasTime: true, source: 'BCB/PTAX' }
        }
        if (quote === 'BRL' && base !== 'BRL') {
          return { rate: brlPerForeign, timestampUTC: ts, hasTime: true, source: 'BCB/PTAX' }
        }
        throw new Error('Unsupported PTAX pair')
      }
    } catch {

    }

    day.setDate(day.getDate() - 1)
    attempts++
  }
  throw new Error('No PTAX data within 7 days')
}

async function fetchBcbMonthlySeries(base, quote, monthEnds) {
  const other = base === 'BRL' ? quote : base
  const firstTarget = monthEnds[0]
  const lastTarget = monthEnds[monthEnds.length - 1]
  const bufferStart = new Date(firstTarget)
  bufferStart.setUTCDate(1)
  bufferStart.setUTCDate(bufferStart.getUTCDate() - 7)
  const bufferEnd = new Date(lastTarget)
  bufferEnd.setUTCDate(bufferEnd.getUTCDate() + 2)

  const startStr = mmddyyyy(bufferStart)
  const endStr = mmddyyyy(bufferEnd)

  const url =
    `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/` +
    `CotacaoMoedaPeriodo(moeda='${other}',dataInicial='${startStr}',dataFinalCotacao='${endStr}')` +
    `?$top=1000&$orderby=dataHoraCotacao asc&$format=json`

  const { data } = await httpFast.get(url)
  const entries = (data?.value ?? [])
    .map((item) => ({
      when: normalizeUTC(item.dataHoraCotacao),
      sell: Number(item.cotacaoVenda),
    }))
    .filter((item) => item.when && Number.isFinite(item.sell))
    .sort((a, b) => a.when - b.when)

  if (!entries.length) {
    throw new Error('No PTAX period data')
  }

  const series = []
  let cursor = 0

  for (const target of monthEnds) {
    const cutoff = new Date(target)
    cutoff.setUTCHours(23, 59, 59, 999)

    while (cursor < entries.length && entries[cursor].when <= cutoff) {
      cursor++
    }

    const picked = cursor > 0 ? entries[cursor - 1] : null
    if (!picked) {
      series.push(0)
      continue
    }

    const rate = base === 'BRL' ? 1 / picked.sell : picked.sell
    series.push(rate)
  }

  const cleaned = series.map((v) => (Number.isFinite(v) ? v : 0))
  const allZero = cleaned.every((v) => !v)

  return {
    labels: monthEnds.map((d) => formatMonthLabel(d)),
    series: cleaned,
    allZero,
  }
}

/*
ECB DAILY REFERENCE IN XML FOR SPOT (USD/CAD/EUR/BRL CROSSES) 
*/
async function fetchEcbDailyCross(base, quote) {
  const url = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'
  const { data: xml } = await httpFast.get(url, { responseType: 'text' })

  const timeMatch = xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/)
  const date = timeMatch ? timeMatch[1] : null

  const rates = { EUR: 1.0 }
  const rx = /currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g
  let m
  while ((m = rx.exec(xml)) !== null) {
    rates[m[1]] = parseFloat(m[2])
  }

  if (!rates[base] && base !== 'EUR') throw new Error(`ECB has no ${base} quote`)
  if (!rates[quote] && quote !== 'EUR') throw new Error(`ECB has no ${quote} quote`)

  const eurToBase = base === 'EUR' ? 1 : rates[base]
  const eurToQuote = quote === 'EUR' ? 1 : rates[quote]
  const rate = eurToQuote / eurToBase

  return { rate, timestampUTC: `${date} 00:00:00`, hasTime: false, source: 'ECB eurofxref' }
}

//FRANKFURTER EXCHANGE.HOST FOR HISTORICAL & FALLBACK
async function fetchFiatRate(base, quote, dateStr) {
  try {
    if (dateStr) {
      const url = `https://api.frankfurter.app/${dateStr}?from=${base}&to=${quote}`
      const { data } = await httpFast.get(url)
      const rate = data?.rates?.[quote]
      if (!rate) throw new Error('No frankfurter historical rate')
      return { rate, timestampUTC: `${data.date} 00:00:00`, hasTime: false, source: 'ECB/Frankfurter' }
    } else {
      const url = `https://api.frankfurter.app/latest?from=${base}&to=${quote}`
      const { data } = await httpFast.get(url)
      const rate = data?.rates?.[quote]
      if (!rate) throw new Error('No frankfurter latest rate')
      return { rate, timestampUTC: `${data.date} 00:00:00`, hasTime: false, source: 'ECB/Frankfurter' }
    }
  } catch (e) {
    console.log('[Frankfurter failed]', e?.message || e)
  }

  try {
    if (dateStr) {
      const url = `https://api.exchangerate.host/convert?from=${base}&to=${quote}&date=${dateStr}`
      const { data } = await http.get(url)
      if (!data?.result) throw new Error('No result from exchangerate.host')
      return { rate: data.result, timestampUTC: `${data.date} 00:00:00`, hasTime: false, source: 'exchangerate.host' }
    } else {
      const url = `https://api.exchangerate.host/latest?base=${base}&symbols=${quote}`
      const { data } = await http.get(url)
      const rate = data?.rates?.[quote]
      if (!rate) throw new Error('No latest result from exchangerate.host')
      return { rate, timestampUTC: `${data.date} 00:00:00`, hasTime: false, source: 'exchangerate.host' }
    }
  } catch (e) {
    console.log('[FX fallback failed]', e?.message || e)
    throw new Error('No fiat rate available')
  }
}

async function fetchBtcUsd() {
  //COINGECKO
  try {
    const { data } = await httpFast.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_last_updated_at=true'
    )
    const usd = data?.bitcoin?.usd
    const tsSec = data?.bitcoin?.last_updated_at
    if (usd) {
      const tsISO = tsSec ? new Date(tsSec * 1000).toISOString() : new Date().toISOString()
      return { usdPerBtc: usd, timestampUTC: tsISO, hasTime: true, source: 'CoinGecko' }
    }
    throw new Error('No CoinGecko BTC/USD')
  } catch (e) {
    console.log('[CoinGecko failed]', e?.message || e)
  }

  //COINBASE
  try {
    const { data } = await httpFast.get('https://api.coinbase.com/v2/exchange-rates?currency=BTC')
    const usdPerBtc = data?.data?.rates?.USD ? parseFloat(data.data.rates.USD) : null
    if (usdPerBtc) {
      const tsISO = new Date().toISOString() //COINBASE DOES NOT RETURN A TIMESTAMP
      return { usdPerBtc, timestampUTC: tsISO, hasTime: true, source: 'Coinbase' }
    }
    throw new Error('No Coinbase BTC/USD')
  } catch (e) {
    console.log('[Coinbase failed]', e?.message || e)
  }

  //COINDESK
  try {
    const { data } = await http.get('https://api.coindesk.com/v1/bpi/currentprice/USD.json')
    const usdPerBtc = data?.bpi?.USD?.rate_float
    const tsISO = data?.time?.updatedISO
    if (!usdPerBtc) throw new Error('No CoinDesk BTC/USD')
    return { usdPerBtc, timestampUTC: tsISO || new Date().toISOString(), hasTime: true, source: 'CoinDesk' }
  } catch (e) {
    console.log('[CoinDesk failed]', e?.message || e)
    throw new Error('No BTC/USD available from any source')
  }
}

async function fetchBtcCross(base, quote) {
  const core = await fetchBtcUsd()
  const { usdPerBtc, timestampUTC, hasTime, source } = core

  if (base === 'BTC' && quote === 'USD') return { rate: usdPerBtc, timestampUTC, hasTime, source }
  if (base === 'USD' && quote === 'BTC') return { rate: 1 / usdPerBtc, timestampUTC, hasTime, source }

  if (base === 'BTC') {
    const { rate: usdToQuote } = await fetchEcbDailyCross('USD', quote)
    return { rate: usdPerBtc * usdToQuote, timestampUTC, hasTime, source }
  }
  if (quote === 'BTC') {
    const { rate: baseToUsd } = await fetchEcbDailyCross(base, 'USD')
    return { rate: baseToUsd / usdPerBtc, timestampUTC, hasTime, source }
  }
  throw new Error('Unsupported BTC pair')
}

//UNIFIED ACCESS FOR ANY PAIR (BRL, CAD, USD, EUR, BTC)
async function fetchAnyRate(base, quote) {
  if (base === quote) return { rate: 1, timestampUTC: new Date().toISOString(), hasTime: true, source: 'local' }
  const isFiat = (c) => ['BRL', 'USD', 'CAD', 'EUR'].includes(c)

  if (base === 'BTC' || quote === 'BTC') {
    return fetchBtcCross(base, quote)
  }

  if ((base === 'BRL' || quote === 'BRL') && isFiat(base) && isFiat(quote)) {
    try {
      return await fetchBcbPair(base, quote)
    } catch (e) {
      console.log('[PTAX failed, will fallback to ECB]', e?.message || e)
      return fetchEcbDailyCross(base, quote)
    }
  }

  return fetchEcbDailyCross(base, quote)
}

async function fetchBtcMonthlySeries(base, quote) {
  const monthEnds = lastTwelveMonthEnds()
  const labels = monthEnds.map((d) => formatMonthLabel(d))
  const otherCurrency = base === 'BTC' ? quote : base

  const supported = ['USD', 'CAD', 'EUR', 'BRL']
  if (!supported.includes(otherCurrency)) {
    throw new Error(`BTC historical series not available for ${otherCurrency}`)
  }

  try {
    const { data } = await httpFast.get(
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart',
      {
        params: {
          vs_currency: otherCurrency.toLowerCase(),
          days: 370,
          interval: 'daily',
        },
      }
    )

    const prices = Array.isArray(data?.prices) ? data.prices : []
    if (!prices.length) throw new Error('Empty BTC series')

    const series = monthEnds.map((d) => {
      const target = d.getTime()
      let closestDiff = Infinity
      let closestPrice = null

      for (const [timestamp, price] of prices) {
        if (!Number.isFinite(price)) continue
        const diff = Math.abs(Number(timestamp) - target)
        if (diff < closestDiff) {
          closestDiff = diff
          closestPrice = price
        }
      }

      if (!Number.isFinite(closestPrice) || closestPrice <= 0) return 0
      if (quote === 'BTC') {
        return closestPrice > 0 ? 1 / closestPrice : 0
      }
      return closestPrice
    })

    const cleaned = series.map((v) => (Number.isFinite(v) && v > 0 ? v : 0))
    const allZero = cleaned.every((v) => !v)
    return { labels, series: cleaned, allZero }
  } catch (e) {
    console.log('[BTC monthly series failed]', base, quote, e?.message || e)
    return { labels, series: [], allZero: true }
  }
}

async function fetchMonthlySeries(base, quote) {
  if (base === 'BTC' || quote === 'BTC') {
    const btcSeries = await fetchBtcMonthlySeries(base, quote)
    return btcSeries
  }

  const monthEnds = lastTwelveMonthEnds()
  const labels = monthEnds.map((d) => formatMonthLabel(d))
  const series = []

  if (base === 'BRL' || quote === 'BRL') {
    try {
      return await fetchBcbMonthlySeries(base, quote, monthEnds)
    } catch (err) {
      console.log('[BCB monthly failed]', err?.message || err)
    }
  }

  for (const d of monthEnds) {
    const dayStr = yyyymmdd(d)
    try {
      const { rate } = await fetchFiatRate(base, quote, dayStr)
      series.push(rate)
    } catch (e) {
      console.log('[Monthly point failed]', base, quote, dayStr, e?.message || e)
      series.push(0)
    }
  }

  const cleaned = series.map((v) => (Number.isFinite(v) ? v : 0))
  const allZero = cleaned.every((v) => !v)
  return { labels, series: cleaned, allZero }
}

export default function CurrencyConverter() {
  const [amount, setAmount] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

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

  const [pickerVisible, setPickerVisible] = useState({ which: null, open: false })

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

  const openPicker = (which) => setPickerVisible({ which, open: true })
  const pickCurrency = (code) => {
    if (pickerVisible.which === 'from') setFrom(code)
    if (pickerVisible.which === 'to') setTo(code)
    setPickerVisible({ which: null, open: false })
    setErrorMsg('')
  }

  const switchCurrencies = () => {
    setFrom(to)
    setTo(from)
    setConvertedText('')
    setRateTimestampUTC('')
    setRateHasTime(false)
    setGraphData([])
    setGraphLabels([])
    setErrorMsg('')
  }

  const handleConvert = async () => {
    setLoading(true)
    setLoadingGraph(false)
    setErrorMsg('')
    setConvertedText('')
    setRateTimestampUTC('')
    setRateHasTime(false)
    setGraphData([])
    setGraphLabels([])

    if (!from || !to) {
      setLoading(false)
      setErrorMsg('Select both currencies to convert.')
      Vibration.vibrate(180)
      return
    }

    if (from === to) {
      setLoading(false)
      setErrorMsg('Please pick two different currencies for conversion.')
      Vibration.vibrate(180)
      return
    }

    try {
      const amt = parseFloat((amount || '').replace(',', '.'))
      if (isNaN(amt)) {
        setErrorMsg('Enter a valid amount')
        setLoading(false)
        return
      }

      const { rate, timestampUTC, hasTime, source } = await fetchAnyRate(from, to)
      const converted = amt * rate

      const left = `${formatAmount(amt, from)} ${from}`
      const right = `${formatAmount(converted, to)} ${to}`
      setConvertedText(`${left} = ${right}`)
      setRateTimestampUTC(timestampUTC)
      setRateHasTime(hasTime)
      console.log('[Spot source]', source, 'timestamp:', timestampUTC)
    } catch (e) {
      console.log('[Spot conversion failed]', from, to, e?.message || e)
      setErrorMsg('Failed to fetch exchange rate.')
      setLoading(false)
      setLoadingGraph(false)
      return
    }

    const isBitcoinPair = from === 'BTC' || to === 'BTC'
    if (isBitcoinPair) {
      setLoading(false)
      setLoadingGraph(false)
      return
    }

    try {
      setLoadingGraph(true)
      const { labels, series, allZero } = await fetchMonthlySeries(from, to)
      if (allZero) {
        const { rate } = await fetchAnyRate(from, to)
        const flat = Array(labels.length).fill(rate)
        const cleaned = flat.map(v => (Number.isFinite(v) ? v : 0))
        setGraphLabels(labels)
        setGraphData(cleaned)
      } else {
        const cleaned = series.map(v => (Number.isFinite(v) ? v : 0))
        setGraphLabels(labels)
        setGraphData(cleaned)
      }
    } catch (e) {
      console.log('[Graph series failed]', from, to, e?.message || e)
    } finally {
      setLoading(false)
      setLoadingGraph(false)
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
        <View style={[styles.graphSection, styles.graphSectionInner]}>
          <View style={styles.graphSkeleton}>
            <Text style={styles.graphSkeletonTitle}>Loading 12 month trend…</Text>
          </View>
        </View>
      )}

      {!loadingGraph && graphData.length > 0 && (
        <View style={[styles.graphSection, styles.graphSectionInner]}>
          <HistoryGraphic
            data={graphData}
            labels={graphLabels}
            decimalPlaces={from === 'BTC' || to === 'BTC' ? 6 : 4}
          />
        </View>
      )}

      <Footer />

      <Modal
        visible={pickerVisible.open}
        transparent
        animationType='fade'
        onRequestClose={() => setPickerVisible({ which: null, open: false })}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible({ which: null, open: false })}>
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
    borderWidth: 0,
    borderColor: 'transparent',
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
  graphSection: {
    width: '100%',
    maxWidth: 880,
    alignItems: 'center',
    marginHorizontal: 0,
    paddingHorizontal: 0,
    marginTop: 8,
    marginBottom: 24,
  },
  graphSectionInner: {
    paddingHorizontal: 0,
  },
  graphSkeleton: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: primaryAlpha(0.25),
    borderStyle: 'dashed',
    paddingVertical: 30,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#FFFFFF"
  },
  graphSkeletonTitle: {
    color: neutralAlpha(0.8),
    fontSize: 15,
    lineHeight: 20,
    backgroundColor: "#FFFFFF"
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
