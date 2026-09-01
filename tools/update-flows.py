#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""抓取 Farside Investors 的 BTC/ETH 现货 ETF 日度净流量，生成 assets/flows.js。
用法:
    python tools/update-flows.py            # 预览（打印统计，不写文件）
    python tools/update-flows.py --write    # 写入 assets/flows.js
依赖: pip install curl_cffi
说明: Farside 有 Cloudflare 托管挑战，必须用 curl_cffi 模拟 Chrome；
      当日有基金未公布时显示为 "-"，该日跳过（绝不补 0）。
"""
import json, re, sys, pathlib, datetime
from curl_cffi import requests

BASE = pathlib.Path(__file__).resolve().parent.parent
OUT = BASE / "assets" / "flows.js"

PAGES = {
    "btc": ["https://farside.co.uk/bitcoin-etf-flow-all-data/"],
    "eth": ["https://farside.co.uk/ethereum-etf-flow-all-data/",
            "https://farside.co.uk/eth-all-data/",
            "https://farside.co.uk/eth/"],
}

MONTHS = {m: i + 1 for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}


def fetch(url):
    r = requests.get(url, impersonate="chrome", timeout=40)
    r.raise_for_status()
    return r.text


def num(s):
    """解析数值：兼容会计括号负数 (52.7)=-52.7 和千分位逗号。"""
    s = (s or "").replace(",", "").strip()
    if s.startswith("(") and s.endswith(")"):
        return -float(s[1:-1])
    try:
        return float(s)
    except ValueError:
        return None


def parse_table(html):
    """提取 [["YYYY-MM-DD", total_musd], ...]，跳过未完整公布的日期。"""
    today = datetime.date.today().isoformat()
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S)
    out = []
    for row in rows:
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)
        if len(cells) < 2:
            continue
        cells = [re.sub(r"<[^>]+>", "", c).strip().replace("\xa0", " ")
                 for c in cells]
        m = re.match(r"^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$", cells[0])
        if not m:
            continue  # 不是日期行（表头/汇总行）
        day, mon, yr = m.groups()
        date = "%04d-%02d-%02d" % (int(yr), MONTHS[mon], int(day))
        total = num(cells[-1]) if len(cells) > 1 else None
        if total is None:
            continue  # Total 未公布 → 当日不完整
        if date == today and total == 0.0:
            continue  # Farside 当天数据未出时先填 0.0 占位，跳过
        out.append([date, total])
    return out


def main():
    write = "--write" in sys.argv
    data = {"as_of": {}, "btc_flows": [], "eth_flows": []}
    for asset, urls in PAGES.items():
        flows = None
        for u in urls:
            try:
                html = fetch(u)
                f = parse_table(html)
                if len(f) >= 100:  # 全历史页至少应有 100+ 行
                    flows = f
                    print("源:", u, "→", len(f), "天")
                    break
                else:
                    print("行数不足(疑似非全历史页):", u, len(f))
            except Exception as e:
                print("失败:", u, repr(e))
        if not flows:
            print("!! %s 抓取失败，跳过" % asset)
            continue
        # 排序 + 去重
        flows.sort()
        dedup, seen = [], set()
        for r in flows:
            if r[0] in seen:
                continue
            seen.add(r[0])
            dedup.append(r)
        flows = dedup
        total = sum(r[1] for r in flows)
        latest = flows[-1]
        print("%s: %d 天, 累计 %.1fM ($%.2fB), 最早 %s, 最新 %s %+.1fM"
              % (asset, len(flows), total, total / 1000, flows[0][0], latest[0], latest[1]))
        for r in flows[-6:]:
            print("   ", r[0], "%+.1f" % r[1])
        data[asset + "_flows"] = flows
        data["as_of"][asset] = latest[0]

    if write and data["btc_flows"] and data["eth_flows"]:
        js = ("/* 由 tools/update-flows.py --write 自动生成，勿手改。\n"
              " * 净流量单位：百万美元，正=净流入。来源：Farside Investors。 */\n"
              "window.FLOW_DATA = " + json.dumps(data, ensure_ascii=False) + ";\n")
        OUT.write_text(js, encoding="utf-8")
        print("已写入", OUT)
    else:
        print("预览模式：加 --write 才会写入文件")


if __name__ == "__main__":
    main()
