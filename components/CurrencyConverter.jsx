import React, { useState } from "react";
import { View, TextInput, Text, Button, StyleSheet, TouchableOpacity } from "react-native";
import axios from "axios";
import HistoryGraphic from "./components/HistoryGraphic"; // adjust path if different

export default function CurrencyConverter() {
  const [amount, setAmount] = useState("1");
  const [result, setResult] = useState(null);
  const [rateTime, setRateTime] = useState("");
  const [rateDate, setRateDate] = useState("");
  const [isCadToBrl, setIsCadToBrl] = useState(true);

  // chart state
  const [historyData, setHistoryData] = useState([]); // numbers
  const [historyLabels, setHistoryLabels] = useState([]); // month labels

  const monthShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Helpers
  const toBCBDate = (d) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  };

  const formatMoney = (value, currency) => {
    const locale = currency === "BRL" ? "pt-BR" : "en-CA";
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
  };

  const splitDateTimeBR = (isoLike) => {
    // API gives "YYYY-MM-DD HH:mm:ss.SSS"
    const [datePart, timePartRaw] = isoLike.split(" ");
    const [y, m, d] = datePart.split("-");
    const timePart = timePartRaw?.split(".")[0] ?? "";
    const niceDate = `${d}/${m}/${y}`;
    return { niceDate, niceTime: timePart };
  };

  // Build monthly history (last 12 months)
  const buildMonthlyHistory = async () => {
    // fetch ~400 days to be safe
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 400);

    const dataInicial = toBCBDate(start);
    const dataFinal = toBCBDate(end);

    const url =
      `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/` +
      `CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@ini,dataFinalCotacao=@fim)` +
      `?@moeda='CAD'&@ini='${dataInicial}'&@fim='${dataFinal}'&$format=json`;

    const { data } = await axios.get(url);
    const rows = data?.value ?? [];
    if (!rows.length) return { points: [], labels: [] };

    // Keep the latest quote per calendar day (by dataHoraCotacao)
    const byDay = new Map(); // key: YYYY-MM-DD -> row
    for (const row of rows) {
      const [datePart] = row.dataHoraCotacao.split(" ");
      const current = byDay.get(datePart);
      if (!current || row.dataHoraCotacao > current.dataHoraCotacao) {
        byDay.set(datePart, row);
      }
    }

    // Group by month and keep the last day (closing of the month)
    const byMonth = new Map(); // key: YYYY-MM -> { date: 'YYYY-MM-DD', row }
    for (const [datePart, row] of byDay.entries()) {
      const ym = datePart.slice(0, 7); // YYYY-MM
      const stored = byMonth.get(ym);
      if (!stored || datePart > stored.date) {
        byMonth.set(ym, { date: datePart, row });
      }
    }

    // Sort months ascending and take the last 12
    const monthsSorted = Array.from(byMonth.keys()).sort();
    const last12 = monthsSorted.slice(-12);

    const labels = [];
    const points = [];

    for (const ym of last12) {
      const { row } = byMonth.get(ym);
      // CAD->BRL uses cotacaoVenda; BRL->CAD uses reciprocal
      const base = Number(row.cotacaoVenda);
      const value = isCadToBrl ? base : (base ? 1 / base : 0);
      points.push(Number(value.toFixed(4)));

      // Label like "Aug", "Sep", ...
      const [year, month] = ym.split("-");
      labels.push(monthShort[Number(month) - 1]);
    }

    return { points, labels };
  };

  // Use last business day logic for single conversion
  const getLastBusinessDay = () => {
    const today = new Date();

    // if weekend, go back to Friday
    const day = today.getDay(); // Sun=0..Sat=6
    if (day === 0) today.setDate(today.getDate() - 2);
    else if (day === 6) today.setDate(today.getDate() - 1);

    // If before ~1pm Brasília (UTC-3, i.e., before 16:00 UTC), use yesterday
    const utcHour = new Date().getUTCHours();
    if (utcHour < 16) today.setDate(today.getDate() - 1);

    return toBCBDate(today);
  };

  const fetchExchangeRate = async () => {
    try {
      // 1) convert current amount
      const d = getLastBusinessDay();
      const url =
        `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/` +
        `CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)` +
        `?@moeda='CAD'&@dataCotacao='${d}'&$top=1&$orderby=dataHoraCotacao desc&$format=json`;

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
      // compute conversion
      const amt = parseFloat(amount.replace(",", "."));
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

      // Rate date/time (Brasília time, as provided by API)
      const { niceDate, niceTime } = splitDateTimeBR(value[0].dataHoraCotacao);
      setRateDate(niceDate);
      setRateTime(niceTime);

      // 2) build monthly history matching the direction
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

      {/* Rate date/time block */}
      <View style={styles.rateBlock}>
        <Text style={styles.rateTitle}>Rate date (Brasília):</Text>
        <Text style={styles.rateTime}>{rateTime || "-"}</Text>
        <Text style={styles.rateDate}>{rateDate || "-"}</Text>
      </View>

      {/* Monthly chart appears only after first successful fetch */}
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
    opacity: 0.8,
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
