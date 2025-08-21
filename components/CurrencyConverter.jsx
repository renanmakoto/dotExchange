// components/converter/CurrencyConverter.jsx
import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Modal, FlatList, Pressable, Dimensions
} from 'react-native';
import axios from 'axios';
import { LineChart } from 'react-native-chart-kit';

const SCREEN_W = Dimensions.get('window').width;

// ---- currencies in the picker ----
const CURRENCIES = [
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'BTC', name: 'Bitcoin' },
];

// ---- city label by *target* currency ----
function getLocationForCurrency(toCode) {
  switch (toCode) {
    case 'BRL': return 'Brasília';
    case 'CAD': return 'Toronto';
    case 'USD': return 'New York';
    case 'EUR': return 'Frankfurt';
    case 'BTC':
    default:    return '';
  }
}

// ---- axios instances with timeouts ----
const http = axios.create({ timeout: 12000 }); // 12s
const httpFast = axios.create({ timeout: 8000 }); // 8s

// ---- formatting helpers ----
function formatAmount(value, currency) {
  try {
    // For display: BRL uses pt-BR comma decimals, USD/CAD/EUR use en, BTC 8 dp
    const isBTC = currency === 'BTC';
    const locale =
      currency === 'BRL' ? 'pt-BR' :
      currency === 'EUR' ? 'en-IE' :
      'en-CA';
    const opts = isBTC
      ? { minimumFractionDigits: 8, maximumFractionDigits: 8 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    return new Intl.NumberFormat(locale, opts).format(value);
  } catch {
    return String(value);
  }
}

function parseTimestampParts(utcString) {
  // Returns safely parsable time/date strings or '-' if not available.
  if (!utcString) return { timeStr: '-', dateStr: '-' };
  let d;
  // Accept "YYYY-MM-DD HH:mm:ss" from BCB, or ISO strings
  if (utcString.includes(' ') && !utcString.endsWith('Z')) {
    const iso = utcString.replace(' ', 'T') + 'Z';
    d = new Date(iso);
  } else {
    d = new Date(utcString);
  }
  if (isNaN(d.getTime())) return { timeStr: '-', dateStr: '-' };

  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
  }).format(d);
  const dateStr = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(d);
  return { timeStr, dateStr };
}

// ---- date helpers ----
function mmddyyyy(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}
function yyyymmdd(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

// Make 12 month-end dates, oldest→newest
function lastTwelveMonthEnds() {
  const out = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0));
    out.push(d);
  }
  return out;
}

/* =========================
 *         API LAYER
 * =========================*/

// A) PTAX (BCB) for BRL pairs with rollback up to 7 days
async function fetchBcbPair(base, quote) {
  const foreign = base === 'BRL' ? quote : base; // PTAX returns BRL per 'foreign'
  let attempts = 0;
  let day = new Date(); // start from "today", then walk back

  while (attempts < 7) {
    const bcbDate = mmddyyyy(day); // MM-DD-YYYY
    const url =
      `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/` +
      `CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)` +
      `?@moeda='${foreign}'&@dataCotacao='${bcbDate}'&$top=100&$orderby=dataHoraCotacao desc&$format=json`;

    try {
      const { data } = await http.get(url);
      const arr = data?.value ?? [];
      if (arr.length) {
        // pick most recent item of the day
        const latest = arr[0];
        const brlPerForeign = latest.cotacaoVenda;
        const ts = latest.dataHoraCotacao; // "YYYY-MM-DD HH:mm:ss"
        if (base === 'BRL' && quote !== 'BRL') {
          return { rate: 1 / brlPerForeign, timestampUTC: ts, hasTime: true, source: 'BCB/PTAX' };
        }
        if (quote === 'BRL' && base !== 'BRL') {
          return { rate: brlPerForeign, timestampUTC: ts, hasTime: true, source: 'BCB/PTAX' };
        }
        throw new Error('Unsupported PTAX pair');
      }
    } catch (e) {
      // network errors just roll back date as well
    }

    // go back 1 day and try again
    day.setDate(day.getDate() - 1);
    attempts++;
  }
  throw new Error('No PTAX data within 7 days');
}

// B) General fiat via Frankfurter (primary) → exchangerate.host (fallback)
async function fetchFiatRate(base, quote, dateStr /* yyyy-mm-dd|null */) {
  // Frankfurter primary
  try {
    if (dateStr) {
      const url = `https://api.frankfurter.app/${dateStr}?from=${base}&to=${quote}`;
      const { data } = await httpFast.get(url);
      const rate = data?.rates?.[quote];
      if (!rate) throw new Error('No frankfurter historical rate');
      return { rate, timestampUTC: `${data.date} 00:00:00`, hasTime: false, source: 'ECB/Frankfurter' };
    } else {
      const url = `https://api.frankfurter.app/latest?from=${base}&to=${quote}`;
      const { data } = await httpFast.get(url);
      const rate = data?.rates?.[quote];
      if (!rate) throw new Error('No frankfurter latest rate');
      return { rate, timestampUTC: `${data.date} 00:00:00`, hasTime: false, source: 'ECB/Frankfurter' };
    }
  } catch (e) {
    console.log('[Frankfurter failed]', e?.message || e);
  }

  // exchangerate.host fallback
  try {
    if (dateStr) {
      // historical convert
      const url = `https://api.exchangerate.host/convert?from=${base}&to=${quote}&date=${dateStr}`;
      const { data } = await http.get(url);
      if (!data?.result) throw new Error('No result from exchangerate.host');
      return { rate: data.result, timestampUTC: `${data.date} 00:00:00`, hasTime: false, source: 'exchangerate.host' };
    } else {
      // latest
      const url = `https://api.exchangerate.host/latest?base=${base}&symbols=${quote}`;
      const { data } = await http.get(url);
      const rate = data?.rates?.[quote];
      if (!rate) throw new Error('No latest result from exchangerate.host');
      return { rate, timestampUTC: `${data.date} 00:00:00`, hasTime: false, source: 'exchangerate.host' };
    }
  } catch (e) {
    console.log('[FX fallback failed]', e?.message || e);
    throw new Error('No fiat rate available');
  }
}

// C) BTC via CoinDesk (primary) → CoinGecko (fallback) + fiat cross
async function fetchBtcUsd() {
  // CoinDesk primary
  try {
    const { data } = await http.get('https://api.coindesk.com/v1/bpi/currentprice/USD.json');
    const usdPerBtc = data?.bpi?.USD?.rate_float;
    const tsISO = data?.time?.updatedISO;
    if (!usdPerBtc) throw new Error('No CoinDesk BTC/USD');
    return { usdPerBtc, timestampUTC: tsISO, hasTime: true, source: 'CoinDesk' };
  } catch (e) {
    console.log('[CoinDesk failed]', e?.message || e);
  }

  // CoinGecko fallback
  const { data } = await httpFast.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_last_updated_at=true');
  const usd = data?.bitcoin?.usd;
  const tsSec = data?.bitcoin?.last_updated_at;
  if (!usd) throw new Error('No CoinGecko BTC/USD');
  const tsISO = tsSec ? new Date(tsSec * 1000).toISOString() : new Date().toISOString();
  return { usdPerBtc: usd, timestampUTC: tsISO, hasTime: true, source: 'CoinGecko' };
}

async function fetchBtcCross(base, quote) {
  const core = await fetchBtcUsd();
  const { usdPerBtc, timestampUTC, hasTime, source } = core;

  if (base === 'BTC' && quote === 'USD') return { rate: usdPerBtc, timestampUTC, hasTime, source };
  if (base === 'USD' && quote === 'BTC') return { rate: 1 / usdPerBtc, timestampUTC, hasTime, source };

  if (base === 'BTC') {
    const { rate: usdToQuote } = await fetchFiatRate('USD', quote, null);
    return { rate: usdPerBtc * usdToQuote, timestampUTC, hasTime, source };
  }
  if (quote === 'BTC') {
    const { rate: baseToUsd } = await fetchFiatRate(base, 'USD', null);
    return { rate: baseToUsd / usdPerBtc, timestampUTC, hasTime, source };
  }
  throw new Error('Unsupported BTC pair');
}

// D) Unified fetch for any pair (BRL, USD, CAD, EUR, BTC)
async function fetchAnyRate(base, quote) {
  if (base === quote) return { rate: 1, timestampUTC: new Date().toISOString(), hasTime: true, source: 'local' };
  const isFiat = (c) => ['BRL', 'USD', 'CAD', 'EUR'].includes(c);

  // BTC involved
  if (base === 'BTC' || quote === 'BTC') {
    return fetchBtcCross(base, quote);
  }

  // BRL pair → try PTAX first, then fiat APIs
  if ((base === 'BRL' || quote === 'BRL') && isFiat(base) && isFiat(quote)) {
    try {
      return await fetchBcbPair(base, quote);
    } catch (e) {
      console.log('[PTAX failed, will fallback]', e?.message || e);
      return fetchFiatRate(base, quote, null);
    }
  }

  // any other fiat pair
  return fetchFiatRate(base, quote, null);
}

// E) Monthly series (12 month-end points)
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
        // BTC monthly approximation: BTCUSD (current) + month-end fiat cross for the other side
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
        // all-fiat month-end snapshot
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

/* =========================
 *     UI / COMPONENT
 * =========================*/

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

  // ---------- Convert handler ----------
  const handleConvert = async () => {
    setLoading(true);
    setErrorMsg('');
    setConvertedText('');
    setRateTimestampUTC('');
    setRateHasTime(false);
    setGraphData([]);
    setGraphLabels([]);

    // 1) Spot conversion
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
      return; // stop here; don’t attempt graph if spot failed
    }

    // 2) Monthly series (12 months). Doesn’t block the result if it fails.
    try {
      const { labels, series, allZero } = await fetchMonthlySeries(from, to);
      if (allZero) {
        // If everything zero, fill flat line at current spot (best effort)
        const { rate } = await fetchAnyRate(from, to);
        const flat = Array(labels.length).fill(rate);
        setGraphLabels(labels);
        setGraphData(flat);
      } else {
        setGraphLabels(labels);
        setGraphData(series);
      }
    } catch (e) {
      console.log('[Graph series failed]', from, to, e?.message || e);
      // Leave graph empty but keep the conversion result
    } finally {
      setLoading(false);
    }
  };

  const { timeStr, dateStr } = useMemo(() => parseTimestampParts(rateTimestampUTC), [rateTimestampUTC]);

  return (
    <View style={styles.container}>
      {/* Amount */}
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        placeholderTextColor="#9aa0a6"
      />

      {/* From / To */}
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

      {/* Convert */}
      <TouchableOpacity style={styles.convertBtn} onPress={handleConvert} disabled={loading}>
        <Text style={styles.convertBtnText}>{loading ? 'Converting…' : 'Convert'}</Text>
      </TouchableOpacity>

      {/* Result */}
      {!!convertedText && <Text style={styles.result}>{convertedText}</Text>}
      {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

      {/* Rate date/time (show time only if we truly have it) */}
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
      {graphData.length > 0 && (
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
          <Pressable style={styles.modalSheet} onPress={() => { /* stop propagation */ }}>
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

// ---- styles ----
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
