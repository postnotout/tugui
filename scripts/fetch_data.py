"""
yfinance로 종목 10년치 일봉 데이터를 public/data/{ticker}.csv 로 저장.
컬럼: date, open, high, low, close, volume
"""
import sys
import os
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

TICKERS = [
    "005930.KS",   # 삼성전자
    "051910.KS",   # LG화학
    "000660.KS",   # SK하이닉스
    "247540.KQ",   # 에코프로비엠
    "011170.KS",   # 롯데케미칼
    "TSLA",        # 테슬라
    "NVDA",        # 엔비디아
    "BTC-USD",     # 비트코인
    "^GSPC",       # S&P 500
]

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")
os.makedirs(OUT_DIR, exist_ok=True)

end_date   = datetime.today().strftime("%Y-%m-%d")
start_date = (datetime.today() - timedelta(days=365 * 10)).strftime("%Y-%m-%d")

for ticker in TICKERS:
    print(f"Fetching {ticker} ...", end=" ", flush=True)
    try:
        df = yf.download(ticker, start=start_date, end=end_date, auto_adjust=True, progress=False)

        if df.empty:
            print("EMPTY — skipped")
            continue

        # MultiIndex 컬럼이면 flatten
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [col[0].lower() for col in df.columns]
        else:
            df.columns = [c.lower() for c in df.columns]

        df = df.reset_index()
        df.rename(columns={"Date": "date", "Open": "open", "High": "high",
                            "Low": "low", "Close": "close", "Volume": "volume"}, inplace=True)

        # date 컬럼 정규화 (timezone 제거)
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

        df = df[["date", "open", "high", "low", "close", "volume"]]
        df = df.dropna(subset=["close"])
        df = df.sort_values("date").reset_index(drop=True)

        # 파일명: ^ 등 특수문자 처리
        safe_name = ticker.replace("^", "").replace("-", "_")
        out_path = os.path.join(OUT_DIR, f"{safe_name}.csv")
        df.to_csv(out_path, index=False)
        print(f"OK  ({len(df)} rows) → {out_path}")

    except Exception as e:
        print(f"ERROR: {e}")

print("\nDone.")
