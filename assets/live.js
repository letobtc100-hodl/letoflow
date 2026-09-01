/* live.js — 实时数据层：免费公开 API，TTL 缓存 + 三态降级(live/cached/fail) */
window.FlowLive = (function () {
  "use strict";
  var C = window.SITE_CONFIG || {}, S = C.sources || {};
  var PFX = "etfflow_", status = {}, priceTimer = null;

  function lsGet(k) { try { return localStorage.getItem(PFX + k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(PFX + k, v); } catch (e) {} }

  function getJSON(url, ttl, id) {
    var cached = lsGet(id);
    if (cached) {
      try {
        var o = JSON.parse(cached);
        if (Date.now() - o.t < ttl) { status[id] = "cached"; return Promise.resolve(o.v); }
      } catch (e) {}
    }
    return fetch(url, { signal: AbortSignal.timeout(S.timeout_ms || 6500) })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (v) {
        try { lsSet(id, JSON.stringify({ t: Date.now(), v: v })); } catch (e) {}
        status[id] = "live"; return v;
      })
      .catch(function () { status[id] = "fail"; throw new Error("source " + id + " failed"); });
  }

  function price() {
    var symbols = JSON.stringify(S.price_symbols || ["BTCUSDT", "ETHUSDT"]);
    return getJSON(S.price_url + encodeURIComponent(symbols), S.price_ttl_ms || 30e3, "price")
      .then(function (list) {
        var out = {};
        (list || []).forEach(function (t) {
          var k = (t.symbol || "").replace("USDT", "");
          out[k] = { px: +t.lastPrice, chg: +t.priceChangePercent };
        });
        return out;
      });
  }

  function fng() {
    return getJSON(S.fng_url, S.fng_ttl_ms || 1800e3, "fng")
      .then(function (j) { return (j && j.data) || []; });
  }

  function startPricePoll(fn) {
    if (priceTimer) return;
    priceTimer = setInterval(function () { if (!document.hidden) fn(); }, S.price_poll_ms || 30e3);
  }

  function statusOf(id) { return status[id] || "none"; }

  return { price: price, fng: fng, statusOf: statusOf, startPricePoll: startPricePoll };
})();
