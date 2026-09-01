/* app.js — 装配层：渲染行情/恐慌贪婪/ETF图/近6日表，绑定控件 */
(function () {
  "use strict";
  var C = window.SITE_CONFIG || {}, F = window.FLOW_DATA || {};
  var Live = window.FlowLive, FC = window.FlowCharts;
  var D = function (id) { return document.getElementById(id); };
  var charts = {};
  var state = {
    btc: { unit: "month", mode: "bar", range: "all" },
    eth: { unit: "month", mode: "bar", range: "all" }
  };

  /* ---------- 行情 ---------- */
  function renderQuotes(q) {
    ["BTC", "ETH"].forEach(function (a) {
      var t = q && q[a]; if (!t) return;
      D("px-" + a.toLowerCase()).textContent =
        "$" + t.px.toLocaleString("en-US", { maximumFractionDigits: 0 });
      var el = D("chg-" + a.toLowerCase());
      el.textContent = (t.chg >= 0 ? "+" : "") + t.chg.toFixed(2) + "%";
      el.className = "quote-chg " + (t.chg > 0.01 ? "up" : t.chg < -0.01 ? "down" : "flat");
    });
  }
  function loadPrice() { Live.price().then(renderQuotes).catch(function () {}); }

  /* ---------- 恐慌贪婪 ---------- */
  function renderFNG(rows) {
    if (!rows || !rows.length) return;
    var cur = +rows[0].value;
    D("fng-value").textContent = cur;
    D("fng-label").textContent = rows[0].value_classification || "";
    D("fng-arrow").style.left = "calc(" + Math.max(0, Math.min(100, cur)) + "% - 8px)";
    D("fng-cur").textContent = cur;
    var vals = rows.map(function (r) { return +r.value; });
    function avg(n) {
      var a = vals.slice(0, n);
      return Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length);
    }
    D("fng-7d").textContent = avg(7);
    D("fng-30d").textContent = avg(30);
    var rev = rows.slice().reverse();
    echarts.init(D("fng-chart")).setOption({
      animation: false,
      grid: { left: 40, right: 20, top: 18, bottom: 26 },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: rev.map(function (r) { return new Date(+r.timestamp * 1000).toISOString().slice(5, 10); }),
        axisLabel: { color: "#8c8c8c", fontSize: 10, interval: 19 }
      },
      yAxis: { type: "value", min: 0, max: 100, axisLabel: { color: "#8c8c8c", fontSize: 10 }, splitLine: { lineStyle: { color: "#f0f0f0" } } },
      series: [{
        type: "line",
        data: rev.map(function (r) { return +r.value; }),
        showSymbol: false, lineStyle: { width: 1.5, color: (C.theme || {}).accent || "#002FA7" },
        areaStyle: { color: "rgba(0,47,167,.07)" },
        markLine: { silent: true, symbol: "none", data: [{ yAxis: 50 }], lineStyle: { type: "dashed", color: "#ccc" } }
      }]
    });
  }

  /* ---------- ETF ---------- */
  function flowsOf(key) {
    return (F[key + "_flows"] || []).filter(function (r) {
      return r && r.length === 2 && typeof r[1] === "number";
    });
  }
  function renderChart(key) {
    var rows = flowsOf(key); if (!rows.length) return;
    var st = state[key];
    var data = FC.slice(FC.agg(rows, st.unit), st.range);
    var series = st.mode === "cum" ? FC.cum(data) : data;
    var x = series.map(function (r) { return r[0]; });
    var y = series.map(function (r) { return r[1]; });
    var el = D(key + "-chart");
    if (!charts[key]) charts[key] = echarts.init(el);
    charts[key].setOption(FC.optionOf(x, y, st.mode === "cum"));
    var s = FC.stats(data);
    D(key + "-stats").innerHTML =
      '<span>区间净流 <b class="' + (s.net >= 0 ? "up" : "down") + '">' + FC.fmt(s.net) + "</b></span>" +
      '<span>最大流入 <b class="up">' + FC.fmt(s.maxIn) + "</b></span>" +
      '<span>最大流出 <b class="down">' + FC.fmt(s.maxOut) + "</b></span>" +
      '<span>交易日 <b>' + s.days + "</b></span>";
    var daily = FC.cum(FC.agg(rows, "day"));
    var allTime = daily.length ? daily[daily.length - 1][1] : 0;
    D(key + "-cum").textContent = "累计净流入 " + FC.fmt(allTime);
  }
  function bindControls(key) {
    ["unit", "mode", "range"].forEach(function (ctl) {
      D(key + "-" + ctl).addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        state[key][ctl] = b.dataset.v;
        Array.prototype.forEach.call(this.children, function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        renderChart(key);
      });
    });
  }

  /* ---------- 近6日表 ---------- */
  function sgn(v) { return (v > 0 ? "+" : "") + v.toFixed(1); }
  function cls(v) { return v > 0 ? "up" : v < 0 ? "down" : "flat"; }
  function renderRecent() {
    var btc = flowsOf("btc"), eth = flowsOf("eth");
    var em = {}; eth.forEach(function (r) { em[r[0]] = r[1]; });
    var tb = D("recent-body"); tb.innerHTML = "";
    btc.slice(-6).reverse().forEach(function (r) {
      var ev = em[r[0]];
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + r[0] + "</td>" +
        '<td class="' + cls(r[1]) + '">' + sgn(r[1]) + "</td>" +
        '<td class="' + (ev == null ? "flat" : cls(ev)) + '">' + (ev == null ? "—" : sgn(ev)) + "</td>" +
        '<td class="' + cls(r[1] + (ev || 0)) + '">' + sgn(r[1] + (ev || 0)) + "</td>";
      tb.appendChild(tr);
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    var ao = F.as_of || {};
    if (ao.btc || ao.eth) D("etf-asof").textContent = "Farside 统计口径 · 数据截至 " + (ao.btc || ao.eth);
    loadPrice();
    Live.startPricePoll(loadPrice);
    Live.fng().then(renderFNG).catch(function () {});
    ["btc", "eth"].forEach(function (k) { renderChart(k); bindControls(k); });
    renderRecent();
    var badges = [["price", "src-price", "行情"], ["fng", "src-fng", "恐慌贪婪"]];
    setInterval(function () {
      badges.forEach(function (b) {
        var m = { live: "实时", cached: "缓存", fail: "不可用", none: "—" }[Live.statusOf(b[0])] || "—";
        D(b[1]).textContent = b[2] + "源 · " + m;
      });
    }, 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
