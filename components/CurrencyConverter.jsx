import React, { useMemo, useState } from 'react'
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Modal, FlatList, Pressable, Dimensions, Vibration
} from 'react-native'
import axios from 'axios'
import { LineChart } from 'react-native-chart-kit'

const SCREEN_W = Dimensions.get('window').width


const HAS_INTL =
  typeof Intl !== 'undefined' &&
  typeof Intl.NumberFormat === 'function' &&
  typeof Intl.DateTimeFormat === 'function'

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

//CURRENCIES
const CURRENCIES = [
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'BTC', name: 'Bitcoin' },
]

//CURRENCTIES TO THEIR LOCATIONS
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

//AXIOS INSTANCES WITH TIMEOUTS
const http = axios.create({ timeout: 12000 })
const httpFast = axios.create({ timeout: 8000 })

//NUMBER FORMATTING THAT USES SAFE WRAPPER
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

//SPLITS A UTC-LIKE STRING INTO HUMAN TIME/DATE STRINGS
function parseTimestampParts(utcString) {
  if (!utcString) return { timeStr: '-', dateStr: '-' }
  return {
    timeStr: safeFormatTimeISO(utcString),
    dateStr: safeFormatDateISO(utcString),
  }
}

//DATE HELPERS FOR BCB AND HISTORICAL QUERIES
function mmddyyyy(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}-${dd}-${yyyy}`
}

function yyyymmdd(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${yyyy}-${mm}-${dd}`
}

//BUILD 12 MONTH-END DATES, FROM OLDEST TO NEWEST
function lastTwelveMonthEnds() {
  const out = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0))
    out.push(d)
  }
  return out
}

/*BCB PTAX FOR BRL PAIRS WITH UP TO 7-DAY ROLLBACK*/
async function fetchBcbPair(base, quote) {
  const foreign = base === 'BRL' ? quote : base
  let attempts = 0;
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
      //IGNORE AND ROLL BACK DATE
    }

    day.setDate(day.getDate() - 1)
    attempts++
  }
  throw new Error('No PTAX data within 7 days')
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
async function fetchFiatRate(base, quote, dateStr /* yyyy-mm-dd|null */) {
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

/* BTC: COINGECKO -> COINBASE -> COINDESK (last) */
async function fetchBtcUsd() {
  //CoinGecko
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

  //Coinbase
  try {
    const { data } = await httpFast.get('https://api.coinbase.com/v2/exchange-rates?currency=BTC')
    const usdPerBtc = data?.data?.rates?.USD ? parseFloat(data.data.rates.USD) : null
    if (usdPerBtc) {
      const tsISO = new Date().toISOString() // Coinbase does not return a timestamp
      return { usdPerBtc, timestampUTC: tsISO, hasTime: true, source: 'Coinbase' }
    }
    throw new Error('No Coinbase BTC/USD')
  } catch (e) {
    console.log('[Coinbase failed]', e?.message || e)
  }

  //CoinDesk
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

  return fetchEcbDailyCross(base, quote);
}

//MONTHLY SERIES (12 MONTH-END POINTS) WITH HISTORICAL SOURCES
async function fetchMonthlySeries(base, quote) {
  const monthEnds = lastTwelveMonthEnds();
  const labels = monthEnds.map((d) =>
    new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d)
  );

  const series = [];
  for (const d of monthEnds) {
    const dayStr = yyyymmdd(d);
    try {
      if (base === 'BTC' || quote === 'BTC') {
        const { usdPerBtc } = await fetchBtcUsd();
        if (base === 'BTC' && quote !== 'USD') {
          const { rate: usdToQuote } = await fetchFiatRate('USD', quote, dayStr);
          series.push(usdPerBtc * usdToQuote);
        } else if (quote === 'BTC' && base !== 'USD') {
          const { rate: baseToUsd } = await fetchFiatRate(base, 'USD', dayStr);
          series.push(baseToUsd / usdPerBtc);
        } else if (base === 'BTC' && quote === 'USD') {
          series.push(usdPerBtc);
        } else if (base === 'USD' && quote === 'BTC') {
          series.push(1 / usdPerBtc);
        }
      } else {
        const { rate } = await fetchFiatRate(base, quote, dayStr);
        series.push(rate);
      }
    } catch (e) {
      console.log('[Monthly point failed]', base, quote, dayStr, e?.message || e);
      series.push(0);
    }
  }

  const allZero = series.every((v) => !v || v === 0);
  return { labels, series, allZero };
}

export default function CurrencyConverter() {
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState('CAD');
  const [to, setTo] = useState('BRL');

  const [pickerVisible, setPickerVisible] = useState({ which: null, open: false });

  const [convertedText, setConvertedText] = useState('');
  const [rateTimestampUTC, setRateTimestampUTC] = useState('');
  const [rateHasTime, setRateHasTime] = useState(false);
  const [graphData, setGraphData] = useState([]);
  const [graphLabels, setGraphLabels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const locationSuffix = useMemo(() => {
    const loc = getLocationForCurrency(to);
    return loc ? `, ${loc}` : '';
  }, [to]);

  const openPicker = (which) => setPickerVisible({ which, open: true });
  const pickCurrency = (code) => {
    if (pickerVisible.which === 'from') setFrom(code);
    if (pickerVisible.which === 'to') setTo(code);
    setPickerVisible({ which: null, open: false });
    setErrorMsg('');
  };

  const switchCurrencies = () => {
    setFrom(to);
    setTo(from);
    setConvertedText('');
    setRateTimestampUTC('');
    setRateHasTime(false);
    setGraphData([]);
    setGraphLabels([]);
    setErrorMsg('');
  };

  //CONVERT HANDLER
  const handleConvert = async () => {
    setLoading(true);
    setLoadingGraph(false);
    setErrorMsg('');
    setConvertedText('');
    setRateTimestampUTC('');
    setRateHasTime(false);
    setGraphData([]);
    setGraphLabels([]);

    //SAME-CURRENCY GUARD
    if (from === to) {
      setLoading(false);
      setErrorMsg('Please pick two different currencies for conversion.');
      Vibration.vibrate(180);
      return;
    }

    //SPOT CONVERSION
    try {
      const amt = parseFloat((amount || '').replace(',', '.'));
      if (isNaN(amt)) {
        setErrorMsg('Enter a valid amount');
        setLoading(false);
        return;
      }

      const { rate, timestampUTC, hasTime, source } = await fetchAnyRate(from, to);
      const converted = amt * rate;

      const left = `${formatAmount(amt, from)} ${from}`;
      const right = `${formatAmount(converted, to)} ${to}`;
      setConvertedText(`${left} = ${right}`);
      setRateTimestampUTC(timestampUTC);
      setRateHasTime(hasTime);
      console.log('[Spot source]', source, 'timestamp:', timestampUTC);
    } catch (e) {
      console.log('[Spot conversion failed]', from, to, e?.message || e);
      setErrorMsg('Failed to fetch exchange rate.');
      setLoading(false);
      setLoadingGraph(false);
      return;
    }

    //MONTHLY SERIES (12 MONTHS)
    try {
      setLoadingGraph(true);
      const { labels, series, allZero } = await fetchMonthlySeries(from, to);
      if (allZero) {
        const { rate } = await fetchAnyRate(from, to);
        const flat = Array(labels.length).fill(rate);
        //ENSURE CHART NEVER GETS NAN/INFINITY
        const cleaned = flat.map(v => (Number.isFinite(v) ? v : 0));
        setGraphLabels(labels);
        setGraphData(cleaned);
      } else {
        const cleaned = series.map(v => (Number.isFinite(v) ? v : 0));
        setGraphLabels(labels);
        setGraphData(cleaned);
      }
    } catch (e) {
      console.log('[Graph series failed]', from, to, e?.message || e);
    } finally {
      setLoading(false);
      setLoadingGraph(false);
    }
  };

  const { timeStr, dateStr } = useMemo(() => parseTimestampParts(rateTimestampUTC), [rateTimestampUTC]);

  return (
    <View style={styles.container}>
      {/* AMOUNT */}
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        placeholderTextColor="#9aa0a6"
      />

      {/* FROM / TO */}
      <View style={styles.row}>
        <TouchableOpacity style={styles.selector} onPress={() => openPicker('from')}>
          <Text style={styles.selectorLabel}>From</Text>
          <Text style={styles.selectorValue}>{from}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.swapBtn} onPress={switchCurrencies}>
          <Text style={styles.swapBtnText}>⇆</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.selector} onPress={() => openPicker('to')}>
          <Text style={styles.selectorLabel}>To</Text>
          <Text style={styles.selectorValue}>{to}</Text>
        </TouchableOpacity>
      </View>

      {/* CONVERT */}
      <TouchableOpacity style={styles.convertBtn} onPress={handleConvert} disabled={loading}>
        <Text style={styles.convertBtnText}>{loading ? 'Converting…' : 'Convert'}</Text>
      </TouchableOpacity>

      {/* RESULT AND ERROR */}
      {!!convertedText && <Text style={styles.result}>{convertedText}</Text>}
      {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

      {/* RATE DATE/TIME */}
      {!!rateTimestampUTC && (
        <View style={styles.rateBlock}>
          <Text style={styles.rateTitle}>Latest available rate</Text>
          {rateHasTime ? (
            <Text style={styles.rateLine}>
              as of {timeStr}, {dateStr}{locationSuffix}
            </Text>
          ) : (
            <Text style={styles.rateLine}>
              as of {dateStr}{locationSuffix}
            </Text>
          )}
        </View>
      )}

      {/* Graph (12 months) */}
      {loadingGraph && (
        <View style={styles.graphCard}>
          <Text style={styles.graphTitle}>Last 12 months</Text>
          <Text style={styles.graphLoading}>Generating graph…</Text>
        </View>
      )}

      {!loadingGraph && graphData.length > 0 && (
        <View style={styles.graphCard}>
          <Text style={styles.graphTitle}>Last 12 months</Text>
          <LineChart
            data={{
              labels: graphLabels,
              datasets: [{ data: graphData }],
            }}
            width={SCREEN_W - 32}
            height={240}
            fromZero
            withVerticalLines={false}
            withHorizontalLines
            withInnerLines={false}
            yLabelsOffset={8}
            xLabelsOffset={2}
            chartConfig={{
              backgroundColor: '#1f1f1f',
              backgroundGradientFrom: '#1f1f1f',
              backgroundGradientTo: '#1f1f1f',
              decimalPlaces: (from === 'BTC' || to === 'BTC') ? 6 : 4,
              color: (o = 1) => `rgba(255,255,255,${o})`,
              labelColor: (o = 1) => `rgba(255,255,255,${o})`,
              propsForDots: { r: '3', strokeWidth: '2', stroke: '#00ADA2' },
              propsForBackgroundLines: { strokeDasharray: '' },
            }}
            bezier
            style={{ borderRadius: 12 }}
          />
        </View>
      )}

      {/* Currency picker */}
      <Modal
        visible={pickerVisible.open}
        transparent
        animationType="fade"
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  input: {
    fontSize: 30,
    marginBottom: 12,
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 220,
    textAlign: 'center',
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  selector: {
    backgroundColor: '#2b2b2b',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    minWidth: 120,
  },
  selectorLabel: {
    fontSize: 12,
    color: '#9aa0a6',
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  swapBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00ADA2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  swapBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  convertBtn: {
    marginTop: 6,
    backgroundColor: '#00ADA2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  convertBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  result: {
    fontSize: 20,
    marginTop: 18,
    color: 'white',
    textAlign: 'center',
  },
  error: {
    marginTop: 8,
    color: '#ff6b6b',
    fontSize: 14,
  },
  rateBlock: {
    marginTop: 14,
    alignItems: 'center',
  },
  rateTitle: {
    color: '#9aa0a6',
    fontSize: 14,
  },
  rateLine: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
  graphCard: {
    width: '100%',
    marginTop: 18,
    padding: 12,
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
  },
  graphTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  graphLoading: {
    color: '#9aa0a6',
    fontSize: 14,
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalSheet: {
    backgroundColor: '#2b2b2b',
    borderRadius: 14,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  modalItem: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalItemCode: {
    width: 48,
    color: '#00ADA2',
    fontWeight: '800',
    fontSize: 16,
  },
  modalItemName: {
    color: '#fff',
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: '#3a3a3a',
    opacity: 0.6,
  },
});
