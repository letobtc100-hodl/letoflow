# letoflow · BTC/ETH 机构资金流看板

kzgflow 的简化版：纯静态站，无登录、无后端、任何设备打开即用。

## 页面模块
- 行情卡：BTC/ETH 价格 + 24h 涨跌（Binance 公开行情，30 秒轮询）
- 恐慌贪婪指数：当前值 + 7d/30d 均值 + 120 天曲线（alternative.me）
- BTC/ETH 现货 ETF 净流图：日/周/月聚合、柱状/累计、1月~全部区间（Farside）
- 区间统计卡 + 近 6 交易日表

## 数据源（全部免费、免注册、国内直连）
| 模块 | 来源 | 备注 |
|---|---|---|
| 行情 | `data-api.binance.vision` | 币安公开行情镜像，国内可达，CORS 开放 |
| 恐慌贪婪 | `api.alternative.me/fng/?limit=120` | 免费无 key |
| ETF 净流 | Farside Investors（快照于 `assets/flows.js`） | 有 Cloudflare 挑战，脚本需 curl_cffi |

## 数据更新（每日自动）
`tools/update-flows.py` 抓取 Farside 全历史页 → 生成 `assets/flows.js`。
GitHub Actions 每个工作日 23:30 UTC 自动跑并提交（见 `.github/workflows/update-flows.yml`）。

手动更新：`python tools/update-flows.py --write`（本地需 `pip install curl_cffi`）。

## 本地预览
```bash
cd etf-flow
python -m http.server 8000
# 打开 http://localhost:8000
```

## 部署
纯静态，直接拖到 Netlify / Vercel / GitHub Pages 即可。
