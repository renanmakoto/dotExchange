import React, { useState } from "react"
import { View, TextInput, Text, Button, StyleSheet, TouchableOpacity } from "react-native"
import axios from "axios"
import HistoryGraphic from "./HistoryGraphic"

export default function CurrencyConverter() {
  const [amount, setAmount] = useState("1")
  const [result, setResult] = useState(null)
  const [rateTime, setRateTime] = useState("")
  const [rateDate, setRateDate] = useState("")
  const [isCadToBrl, setIsCadToBrl] = useState(true)

  const [historyData, setHistoryData] = useState([])
  const [historyLabels, setHistoryLabels] = useState([])

  const monthShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

  const toBCBDate = (d) => {
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const yyyy = d.getFullYear()
    return `${mm}-${dd}-${yyyy}`
  }

  const splitDateTimeBR = (stamp) => {
    const [datePart, timePartRaw] = stamp.split(" ")
    if (!datePart || !timePartRaw) return { niceDate: "-", niceTime: "-" }
    const [y, m, d] = datePart.split("-")
    const timePart = timePartRaw.split(".")[0]
    return { niceDate: `${d}/${m}/${y}`, niceTime: timePart }
  }

  const getLastBusinessDay = () => {
    const d = new Date()

    const utcHour = d.getUTCHours()
    if (utcHour < 16) d.setDate(d.getDate() - 1)

    const day = d.getDay()
    if (day === 0) d.setDate(d.getDate() - 2)
    else if (day === 6) d.setDate(d.getDate() - 1)

    return toBCBDate(d)
  }

  const buildMonthlyHistory = async () => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 400)

    const dataInicial = toBCBDate(start)
    const dataFinal = toBCBDate(end)

    const url =
      `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/` +
      `CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@ini,dataFinalCotacao=@fim)` +
      `?@moeda='CAD'&@ini='${dataInicial}'&@fim='${dataFinal}'&$format=json`

    const { data } = await axios.get(url)
    const rows = data?.value ?? []
    if (!rows.length) return { points: [], labels: [] }

    const byDay = new Map()
    for (const row of rows) {
      const [datePart] = row.dataHoraCotacao.split(" ")
      const cur = byDay.get(datePart)
      if (!cur || row.dataHoraCotacao > cur.dataHoraCotacao) {
        byDay.set(datePart, row)
      }
    }

    
    const byMonth = new Map()
    for (const [datePart, row] of byDay.entries()) {
      const ym = datePart.slice(0, 7)
      const saved = byMonth.get(ym)
      if (!saved || datePart > saved.date) byMonth.set(ym, { date: datePart, row })
    }

    const monthsSorted = Array.from(byMonth.keys()).sort()
    const last12 = monthsSorted.slice(-12)

    const labels = []
    const points = []

    for (const ym of last12) {
      const { row } = byMonth.get(ym)
      const base = Number(row.cotacaoVenda)
      const val = isCadToBrl ? base : (base ? 1 / base : 0);
      points.push(Number(val.toFixed(4)));

      const [, month] = ym.split("-");
      labels.push(monthShort[Number(month) - 1]);
    }

    return { points, labels };
  };

  const fetchExchangeRate = async () => {
    try {
      // 1) latest single rate for conversion
      const d = getLastBusinessDay();
      const url =
        `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/` +
        `CotacaoMoedaDia(moeda=@moeda,dataCotacao=@data)` +
        `?@moeda='CAD'&@data='${d}'&$top=1&$orderby=dataHoraCotacao desc&$format=json`;

      const { data } = await axios.get(url);
      const value = data?.value ?? [];
      if (!value.length) {
        setResult("No rate available.");
        setRateDate("-");
        setRateTime("-");
        setHistoryData([]);
        setHistoryLabels([]);
        return;
      }

      const rate = Number(value[0].cotacaoVenda);
      const raw = (amount || "").toString().replace(/\s/g, "").replace(",", ".");
      const amt = parseFloat(raw);

      if (Number.isNaN(amt)) {
        setResult("Enter a valid number.");
        return;
      }

      const converted = isCadToBrl ? amt * rate : amt / rate;

      const leftStr = isCadToBrl
        ? new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amt)
        : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amt);

      const rightStr = isCadToBrl
        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(converted)
        : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(converted);

      setResult(`${leftStr} = ${rightStr}`);

      const { niceDate, niceTime } = splitDateTimeBR(value[0].dataHoraCotacao);
      setRateDate(niceDate);
      setRateTime(niceTime);

      // 2) monthly series (direction-aware)
      const monthly = await buildMonthlyHistory();
      setHistoryData(monthly.points);
      setHistoryLabels(monthly.labels);
    } catch (e) {
      console.error("Exchange API error:", e);
      setResult("Failed to fetch exchange rate.");
      setRateDate("-");
      setRateTime("-");
      setHistoryData([]);
      setHistoryLabels([]);
    }
  };

  const toggleDirection = () => setIsCadToBrl((v) => !v);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <TouchableOpacity style={styles.switchButton} onPress={toggleDirection}>
        <Text style={styles.switchText}>
          {isCadToBrl ? "Switch to BRL → CAD" : "Switch to CAD → BRL"}
        </Text>
      </TouchableOpacity>

      <Button
        title={isCadToBrl ? "Convert CAD to BRL" : "Convert BRL to CAD"}
        onPress={fetchExchangeRate}
        color="#00ADA2"
      />

      {result ? <Text style={styles.result}>{result}</Text> : null}

      <View style={styles.rateBlock}>
        <Text style={styles.rateTitle}>Rate date (Brasília):</Text>
        <Text style={styles.rateTime}>{rateTime || "-"}</Text>
        <Text style={styles.rateDate}>{rateDate || "-"}</Text>
      </View>

      {historyData.length > 0 && (
        <HistoryGraphic data={historyData} labels={historyLabels} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 20,
  },
  input: {
    fontSize: 30,
    marginBottom: 10,
    backgroundColor: "white",
    padding: 10,
    minWidth: 220,
    textAlign: "center",
    borderRadius: 10,
  },
  switchButton: {
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#00ADA2",
  },
  switchText: {
    color: "#00ADA2",
    fontWeight: "bold",
  },
  result: {
    fontSize: 20,
    marginTop: 16,
    color: "white",
  },
  rateBlock: {
    marginTop: 14,
    alignItems: "center",
  },
  rateTitle: {
    color: "white",
    fontSize: 14,
    opacity: 0.85,
    marginBottom: 6,
  },
  rateTime: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  rateDate: {
    color: "white",
    fontSize: 16,
  },
});
