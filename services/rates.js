import axios from 'axios'

// Shared formatting helpers
const HAS_INTL =
  typeof Intl !== 'undefined' &&
  typeof Intl.NumberFormat === 'function' &&
  typeof Intl.DateTimeFormat === 'function'

export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'BTC', name: 'Bitcoin' },
]

export const FIAT_CODES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'INR', 'MXN',
  'BRL', 'KRW', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'NZD', 'ZAR', 'RUB',
  'TRY', 'PLN', 'THB', 'IDR',
]

const API_TIMEOUT_MS = 12000
const API_TIMEOUT_FAST_MS = 8000
const ENABLE_LOGS = false

const http = axios.create({ timeout: API_TIMEOUT_MS })
const httpFast = axios.create({ timeout: API_TIMEOUT_FAST_MS })

const log = (...args) => {
  if (ENABLE_LOGS) console.log(...args)
}

const formatMonthLabel = (dateObj) => {
  if (HAS_INTL) {
    return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(dateObj)
  }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return months[dateObj.getUTCMonth()]
}

const normalizeUTC = (str) => {
  if (!str) return null
  if (str.includes(' ') && !str.endsWith('Z')) {
    return new Date(str.replace(' ', 'T') + 'Z')
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

const safeFormatNumber = (value, locale, opts) => {
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

const safeFormatTimeISO = (isoOrUtcStr) => {
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

const safeFormatDateISO = (isoOrUtcStr) => {
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

export const sanitizeSeries = (values, { nonNegative = false } = {}) =>
  values.map((v) => {
    if (!Number.isFinite(v)) return 0
    if (nonNegative && v <= 0) return 0
    return v
  })

const mmddyyyy = (d) => {
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${mm}-${dd}-${yyyy}`
}

const yyyymmdd = (d) => {
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${yyyy}-${mm}-${dd}`
}

const lastTwelveMonthEnds = () => {
  const out = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0))
    out.push(d)
  }
  return out
}

export const formatAmount = (value, currency) => {
  try {
    const isBTC = currency === 'BTC'
    const isZeroDecimal = ['JPY', 'KRW', 'IDR'].includes(currency)
    
    const localeMap = {
      BRL: 'pt-BR',
      EUR: 'de-DE',
      GBP: 'en-GB',
      JPY: 'ja-JP',
      CHF: 'de-CH',
      CNY: 'zh-CN',
      INR: 'en-IN',
      KRW: 'ko-KR',
      RUB: 'ru-RU',
      TRY: 'tr-TR',
      PLN: 'pl-PL',
      THB: 'th-TH',
      IDR: 'id-ID',
    }
    const locale = localeMap[currency] || 'en-US'
    
    const opts = isBTC
      ? { minimumFractionDigits: 8, maximumFractionDigits: 8 }
      : isZeroDecimal
        ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    return safeFormatNumber(value, locale, opts)
  } catch {
    return String(value)
  }
}

export const parseTimestampParts = (utcString) => {
  if (!utcString) return { timeStr: '-', dateStr: '-' }
  return {
    timeStr: safeFormatTimeISO(utcString),
    dateStr: safeFormatDateISO(utcString),
  }
}

export const getLocationForCurrency = (toCode) => {
  const locations = {
    USD: 'New York',
    EUR: 'Frankfurt',
    GBP: 'London',
    JPY: 'Tokyo',
    CHF: 'Zurich',
    CAD: 'Toronto',
    AUD: 'Sydney',
    CNY: 'Shanghai',
    INR: 'Mumbai',
    MXN: 'Mexico City',
    BRL: 'Brasília',
    KRW: 'Seoul',
    SGD: 'Singapore',
    HKD: 'Hong Kong',
    NOK: 'Oslo',
    SEK: 'Stockholm',
    DKK: 'Copenhagen',
    NZD: 'Wellington',
    ZAR: 'Johannesburg',
    RUB: 'Moscow',
    TRY: 'Istanbul',
    PLN: 'Warsaw',
    THB: 'Bangkok',
    IDR: 'Jakarta',
  }
  return locations[toCode] || ''
}

const isFiatCurrency = (code) => FIAT_CODES.includes(code)

const fetchBcbPair = async (base, quote) => {
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
      // swallow and try previous day
    }

    day.setDate(day.getDate() - 1)
    attempts++
  }
  throw new Error('No PTAX data within 7 days')
}

const fetchBcbMonthlySeries = async (base, quote, monthEnds) => {
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

  const cleaned = sanitizeSeries(series)
  const allZero = cleaned.every((v) => !v)

  return {
    labels: monthEnds.map((d) => formatMonthLabel(d)),
    series: cleaned,
    allZero,
  }
}

const fetchEcbDailyCross = async (base, quote) => {
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

const fetchFiatRate = async (base, quote, dateStr) => {
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
    log('[Frankfurter failed]', e?.message || e)
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
    log('[FX fallback failed]', e?.message || e)
    throw new Error('No fiat rate available')
  }
}

const fetchBtcUsd = async () => {
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
    log('[CoinGecko failed]', e?.message || e)
  }

  try {
    const { data } = await httpFast.get('https://api.coinbase.com/v2/exchange-rates?currency=BTC')
    const usdPerBtc = data?.data?.rates?.USD ? parseFloat(data.data.rates.USD) : null
    if (usdPerBtc) {
      const tsISO = new Date().toISOString()
      return { usdPerBtc, timestampUTC: tsISO, hasTime: true, source: 'Coinbase' }
    }
    throw new Error('No Coinbase BTC/USD')
  } catch (e) {
    log('[Coinbase failed]', e?.message || e)
  }

  try {
    const { data } = await http.get('https://api.coindesk.com/v1/bpi/currentprice/USD.json')
    const usdPerBtc = data?.bpi?.USD?.rate_float
    const tsISO = data?.time?.updatedISO
    if (!usdPerBtc) throw new Error('No CoinDesk BTC/USD')
    return { usdPerBtc, timestampUTC: tsISO || new Date().toISOString(), hasTime: true, source: 'CoinDesk' }
  } catch (e) {
    log('[CoinDesk failed]', e?.message || e)
    throw new Error('No BTC/USD available from any source')
  }
}

const fetchBtcCross = async (base, quote) => {
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

export const fetchAnyRate = async (base, quote) => {
  if (base === quote) return { rate: 1, timestampUTC: new Date().toISOString(), hasTime: true, source: 'local' }

  if (base === 'BTC' || quote === 'BTC') {
    return fetchBtcCross(base, quote)
  }

  if ((base === 'BRL' || quote === 'BRL') && isFiatCurrency(base) && isFiatCurrency(quote)) {
    try {
      return await fetchBcbPair(base, quote)
    } catch (e) {
      log('[PTAX failed, will fallback to ECB]', e?.message || e)
      return fetchEcbDailyCross(base, quote)
    }
  }

  return fetchEcbDailyCross(base, quote)
}

const fetchBtcMonthlySeries = async (base, quote) => {
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

    const cleaned = sanitizeSeries(series, { nonNegative: true })
    const allZero = cleaned.every((v) => !v)
    return { labels, series: cleaned, allZero }
  } catch (e) {
    log('[BTC monthly series failed]', base, quote, e?.message || e)
    return { labels, series: [], allZero: true }
  }
}

export const fetchMonthlySeries = async (base, quote) => {
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
      log('[BCB monthly failed]', err?.message || err)
    }
  }

  for (const d of monthEnds) {
    const dayStr = yyyymmdd(d)
    try {
      const { rate } = await fetchFiatRate(base, quote, dayStr)
      series.push(rate)
    } catch (e) {
      log('[Monthly point failed]', base, quote, dayStr, e?.message || e)
      series.push(0)
    }
  }

  const cleaned = sanitizeSeries(series)
  const allZero = cleaned.every((v) => !v)
  return { labels, series: cleaned, allZero }
}
