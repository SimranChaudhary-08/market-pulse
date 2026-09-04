export type StockStatus =
  | "high"
  | "watch"
  | "normal"
  | "new";

export type MarketStock = {
  symbol: string;
  itemId: string;

  current: {
    price: number;
    change: number;
    changePercent: number;
    volume: number | null;
  };

  previous: {
    price: number;
    volume: number | null;
    seenAt: string;
  } | null;

  change: {
    priceChangePercent: number;
    volumeChangePercent: number | null;
    status: StockStatus;
    reason: string;
    isFirstSeen: boolean;
  };

  freshness: {
    type: string;
    timestamp: string | null;
  } | null;

  dataSource?: string | null;

  error: string | null;
};

export type WatchlistMarketResponse = {
  watchlist: {
    id: string;
    name: string;
  };

  stocks: MarketStock[];
};

export async function getWatchlistMarket(
  watchlistId: string
): Promise<WatchlistMarketResponse> {
  const response = await fetch(
    `/api/watchlist/${watchlistId}/market`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to load watchlist market data"
    );
  }

  return response.json();
}

export async function markWatchlistAsSeen(
  watchlistId: string
) {
  const response = await fetch(
    `/api/watchlist/${watchlistId}/seen`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to mark watchlist as seen"
    );
  }

  return response.json();
}

export async function addStockToWatchlist(
  watchlistId: string,
  symbol: string
) {
  const response = await fetch(
    `/api/watchlist/${watchlistId}/items`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbol,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ?? "Failed to add stock"
    );
  }

  return data;
}

export async function removeStockFromWatchlist(
  watchlistId: string,
  itemId: string
) {
  const response = await fetch(
    `/api/watchlist/${watchlistId}/items`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        itemId,
      }),
    }
  );

  const text = await response.text();

  let data: {
    error?: string;
    success?: boolean;
    symbol?: string;
  } = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Server returned an invalid response (HTTP ${response.status})`
      );
    }
  }

  if (!response.ok) {
    throw new Error(
      data.error ??
        `Failed to remove stock (HTTP ${response.status})`
    );
  }

  return data;
}