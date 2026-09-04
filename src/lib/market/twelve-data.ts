type BharatStockResponse = {
  symbol: string;
  company_name?: string;
  exchange?: string;

  latest_price?: {
    trade_date?: string;
    close?: number;
    prev_close?: number;
    volume?: number;
  };

  detail?: string;
};

export type MarketQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number | null;
  timestamp: number | null;
};

export async function getQuote(
  symbol: string
): Promise<MarketQuote> {
  const apiKey = process.env.BHARATSTOCK_API_KEY;

  if (!apiKey) {
    throw new Error(
      "BHARATSTOCK_API_KEY is not configured"
    );
  }

  const url =
    `https://bharatstockapi.com/v1/stocks/${encodeURIComponent(symbol)}`;

  const response = await fetch(url, {
    headers: {
      "X-API-Key": apiKey,
    },
    cache: "no-store",
  });

  const data =
    (await response.json()) as BharatStockResponse;

  if (!response.ok) {
    throw new Error(
      data.detail ??
        `Market data request failed: ${response.status}`
    );
  }

  const latestPrice = data.latest_price;

  if (
    !latestPrice ||
    latestPrice.close === undefined
  ) {
    throw new Error(
      `No price available for ${symbol}`
    );
  }

  const price = latestPrice.close;

  const previousClose =
    latestPrice.prev_close ?? price;

  const change = price - previousClose;

  const changePercent =
    previousClose !== 0
      ? (change / previousClose) * 100
      : 0;

  const timestamp = latestPrice.trade_date
    ? Math.floor(
        new Date(
          `${latestPrice.trade_date}T00:00:00Z`
        ).getTime() / 1000
      )
    : null;

  return {
    symbol: data.symbol,
    name: data.company_name ?? data.symbol,
    price,
    change,
    changePercent,
    volume:
      latestPrice.volume !== undefined
        ? latestPrice.volume
        : null,
    timestamp,
  };
}