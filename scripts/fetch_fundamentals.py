#!/usr/bin/env python3
"""
yfinance로 종목별 분기 EPS(TTM)·BVPS 데이터를 수집해
public/data/{ticker_safe}_fundamentals.json 으로 저장.

지수(^GSPC, KS11 등)·암호화폐(BTC-USD)·ETF(GLD)는 P/E 개념이 없으므로
generate-problems.cjs 내 하드코딩 테이블을 사용하고 이 스크립트는 제외.

사용법:
  python scripts/fetch_fundamentals.py
  python scripts/fetch_fundamentals.py NVDA          # 특정 종목만
"""
import sys, os, json, warnings, time
import pandas as pd
import yfinance as yf

warnings.filterwarnings('ignore')

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
os.makedirs(OUT_DIR, exist_ok=True)

STOCK_TICKERS = {
    '005930.KS': '삼성전자',
    '051910.KS': 'LG화학',
    '000660.KS': 'SK하이닉스',
    '247540.KQ': '에코프로비엠',
    '011170.KS': '롯데케미칼',
    '035720.KS': '카카오',
    '035420.KS': '네이버',
    '005380.KS': '현대차',
    '086520.KQ': '에코프로',
    '068270.KS': '셀트리온',
    'TSLA':      '테슬라',
    'NVDA':      '엔비디아',
    'AAPL':      '애플',
    'AMD':       'AMD',
    'META':      '메타',
    'GME':       '게임스톱',
}

# SEEGENE은 yfinance에서 티커가 달라 별도 처리
SEEGENE_TICKER = '096530.KQ'

def get_df_row(df, candidates):
    for name in candidates:
        if name in df.index:
            return df.loc[name]
    return None

def compute_fundamentals(ticker_sym):
    """분기별 eps_ttm, bvps 계산. [{date, eps_ttm, bvps?}, ...] 반환"""
    results = []
    try:
        t = yf.Ticker(ticker_sym)

        # 분기 손익계산서
        income = None
        for attr in ['quarterly_income_stmt', 'quarterly_financials']:
            try:
                df = getattr(t, attr)
                if df is not None and not df.empty:
                    income = df; break
            except Exception:
                pass

        if income is None or income.empty:
            print('손익계산서 없음', end='')
            return []

        # 분기 재무상태표
        bs = None
        for attr in ['quarterly_balance_sheet', 'quarterly_balancesheet']:
            try:
                df = getattr(t, attr)
                if df is not None and not df.empty:
                    bs = df; break
            except Exception:
                pass

        # Net Income 행
        ni_row = get_df_row(income, [
            'Net Income', 'Net Income Common Stockholders',
            'Net Income Including Noncontrolling Interests',
        ])
        if ni_row is None:
            print('Net Income 없음', end='')
            return []

        # 발행주식수: 재무상태표 우선, 없으면 info
        shares = None
        if bs is not None and not bs.empty:
            sh_row = get_df_row(bs, [
                'Ordinary Shares Number', 'Share Issued', 'Common Stock', 'Shares Issued',
            ])
            if sh_row is not None:
                valid = sh_row.dropna()
                if len(valid) > 0:
                    shares = float(valid.iloc[0])

        if not shares or shares <= 0:
            info = {}
            try: info = t.info or {}
            except Exception: pass
            shares = info.get('sharesOutstanding') or info.get('impliedSharesOutstanding')

        if not shares or shares <= 0:
            print('발행주식수 없음', end='')
            return []

        # 자기자본 행 (BVPS 계산용)
        eq_row = None
        if bs is not None and not bs.empty:
            eq_row = get_df_row(bs, [
                'Stockholders Equity', 'Total Stockholders Equity',
                'Common Stock Equity', 'Total Equity Gross Minority Interest',
            ])

        # 날짜 오름차순 정렬
        dates = sorted(ni_row.index)

        for i, date in enumerate(dates):
            ni_val = ni_row.get(date)
            if ni_val is None or pd.isna(ni_val):
                continue

            # TTM: 최근 4분기 합산 (i 포함, 최대 4개)
            lookback = dates[max(0, i - 3): i + 1]
            ttm = sum(
                float(ni_row[d]) for d in lookback
                if ni_row.get(d) is not None and not pd.isna(ni_row[d])
            )
            eps_ttm = ttm / shares

            date_str = pd.Timestamp(date).strftime('%Y-%m-%d')
            entry = {'date': date_str, 'eps_ttm': round(eps_ttm, 6)}

            if eq_row is not None and date in eq_row.index:
                eq_val = eq_row.get(date)
                if eq_val is not None and not pd.isna(eq_val):
                    entry['bvps'] = round(float(eq_val) / shares, 6)

            results.append(entry)

    except Exception as e:
        print(f'예외: {e}', end='')

    return results


def main():
    filter_tickers = sys.argv[1:] if len(sys.argv) > 1 else None

    tickers = dict(STOCK_TICKERS)
    # SEEGENE은 KRX 티커로 시도
    tickers['SEEGENE'] = '씨젠'   # will use 096530.KQ internally

    print('📊 재무 데이터 수집 시작\n')
    success = 0

    for ticker, name in tickers.items():
        if filter_tickers and ticker not in filter_tickers:
            continue

        # 씨젠은 yfinance KRX 티커로
        fetch_sym = SEEGENE_TICKER if ticker == 'SEEGENE' else ticker
        print(f'  {ticker:15s} ({name}) ... ', end='', flush=True)

        data = compute_fundamentals(fetch_sym)

        if not data:
            print(' ❌')
            time.sleep(0.3)
            continue

        safe_name = ticker.replace('^', '').replace('-', '_')
        out_path = os.path.join(OUT_DIR, f'{safe_name}_fundamentals.json')

        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump({'ticker': ticker, 'name': name, 'quarterly': data},
                      f, ensure_ascii=False, indent=2)

        print(f' ✅  {len(data)}개 분기 → {os.path.basename(out_path)}')
        success += 1
        time.sleep(0.5)  # rate limit 방지

    print(f'\n완료: {success}/{len(tickers)}개 성공')


if __name__ == '__main__':
    main()
