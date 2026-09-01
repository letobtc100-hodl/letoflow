/* config.js — 全站配置真源：文案、配色、数据源参数、开关 */
window.SITE_CONFIG = {
  meta: {
    title: "letoflow · BTC/ETH 机构资金流看板",
    lang: "zh-CN"
  },
  sources: {
    timeout_ms: 6500,
    price_url: "https://data-api.binance.vision/api/v3/ticker/24hr?symbols=",
    price_symbols: ["BTCUSDT", "ETHUSDT"],
    price_ttl_ms: 30e3,     // 缓存 30 秒
    price_poll_ms: 30e3,    // 轮询 30 秒
    fng_url: "https://api.alternative.me/fng/?limit=120",
    fng_ttl_ms: 1800e3      // 恐慌贪婪缓存 30 分钟（一天更新一次）
  },
  halving: { height: 1050000 },  // 下次比特币减半区块高度（约 2028）
  theme: {
    accent: "#002FA7",  // 克莱因蓝
    pos: "#d4380d",     // 涨（红涨绿跌，中国习惯）
    neg: "#389e0d",     // 跌
    muted: "#8c8c8c",
    border: "#e8e8e8"
  }
};
