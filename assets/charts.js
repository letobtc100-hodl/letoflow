/* charts.js — ECharts 封装：聚合(日/周/月)、累计、区间切片、统计、格式化 */
window.FlowCharts = (function () {
  "use strict";
  var theme = (window.SITE_CONFIG || {}).theme || {};

  function parseDate(s) { return new Date(s + "T00:00:00Z"); }

  function agg(rows, unit) {
    if (unit === "day") return rows.slice();
    var m = new Map();
    rows.forEach(function (r) {
      var key;
      if (unit === "month") {
        key = r[0].slice(0, 7);
      } else { /* week: 以周日为标签 */
        var d = parseDate(r[0]), day = (d.getUTCDay() + 6) % 7; /* 0=周一 */
        var end = new Date(d); end.setUTCDate(d.getUTCDate() - day + 6);
        key = end.toISOString().slice(0, 10);
      }
      m.set(key, (m.get(key) || 0) + r[1]);
    });
    return Array.from(m.entries());
  }

  function cum(rows) {
    var s = 0;
    return rows.map(function (r) { s += r[1]; return [r[0], s]; });
  }

  function slice(rows, range) {
    if (!range || range === "all") return rows;
    var n = { m1: 1, m3: 3, m6: 6, y1: 12 }[range] || 1;
    var cutoff = new Date();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - n);
    return rows.filter(function (r) { return parseDate(r[0]) >= cutoff; });
  }

  function stats(rows) {
    var net = 0, maxIn = 0, maxOut = 0;
    rows.forEach(function (r) {
      net += r[1];
      if (r[1] > maxIn) maxIn = r[1];
      if (r[1] < maxOut) maxOut = r[1];
    });
    return { net: net, maxIn: maxIn, maxOut: maxOut, days: rows.length };
  }

  function fmt(v) {
    var a = Math.abs(v), s, sign = v < 0 ? "-" : "+";
    if (a >= 1000) { s = (a / 1000).toFixed(a >= 10000 ? 1 : 2).replace(/\.?0+$/, "") + "B"; }
    else { s = a.toFixed(1).replace(/\.0$/, "") + "M"; }
    return sign + s;
  }

  function optionOf(x, y, isCum) {
    return {
      animation: false,
      grid: { left: 72, right: 24, top: 28, bottom: 46 },
      tooltip: {
        trigger: "axis", axisPointer: { type: "shadow" },
        valueFormatter: function (v) { return v == null ? "-" : fmt(v); }
      },
      xAxis: {
        type: "category", data: x,
        axisLabel: { color: "#8c8c8c", fontSize: 10, rotate: x.length > 40 ? 30 : 0 }
      },
      yAxis: {
        type: "value",
        axisLabel: { formatter: function (v) { return fmt(v); }, color: "#8c8c8c", fontSize: 10 },
        splitLine: { lineStyle: { color: "#f0f0f0" } }
      },
      series: [{
        type: isCum ? "line" : "bar", data: y, showSymbol: false,
        lineStyle: { width: 2, color: theme.accent || "#002FA7" },
        itemStyle: {
          color: function (p) {
            return p.value >= 0 ? (theme.pos || "#d4380d") : (theme.neg || "#389e0d");
          }
        }
      }]
    };
  }

  function mkChart(el, x, y, isCum) {
    var chart = echarts.init(el);
    chart.setOption(optionOf(x, y, isCum));
    return chart;
  }

  return { agg: agg, cum: cum, slice: slice, stats: stats, fmt: fmt, optionOf: optionOf, mkChart: mkChart };
})();
