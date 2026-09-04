"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  getWatchlistMarket,
  markWatchlistAsSeen,
  addStockToWatchlist,
  removeStockFromWatchlist,
  type WatchlistMarketResponse,
  type MarketStock,
} from "@/lib/api";

const WATCHLIST_ID = "cmtms6atz0001q8tc9qbm7bfb";

export default function Home() {
  const [data, setData] =
    useState<WatchlistMarketResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddStock, setShowAddStock] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [addingStock, setAddingStock] = useState(false);
  const [addError, setAddError] = useState("");

  const [markingSeen, setMarkingSeen] = useState(false);
  const [removingSymbol, setRemovingSymbol] = useState("");

  async function loadMarketData() {
    try {
      setLoading(true);
      setError("");

      const result =
        await getWatchlistMarket(WATCHLIST_ID);

      setData(result);
    } catch (error) {
      console.error(error);
      setError("Failed to load market data");
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsSeen() {
    try {
      setMarkingSeen(true);
      setError("");

      await markWatchlistAsSeen(WATCHLIST_ID);

      await loadMarketData();
    } catch (error) {
      console.error(error);
      setError("Failed to mark stocks as seen");
    } finally {
      setMarkingSeen(false);
    }
  }

  async function handleAddStock(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanSymbol =
      symbol.trim().toUpperCase();

    if (!cleanSymbol) {
      setAddError("Enter a stock symbol");
      return;
    }

    try {
      setAddingStock(true);
      setAddError("");

      await addStockToWatchlist(
        WATCHLIST_ID,
        cleanSymbol
      );

      setSymbol("");
      setShowAddStock(false);

      await loadMarketData();
    } catch (error) {
      console.error(error);

      setAddError(
        error instanceof Error
          ? error.message
          : "Failed to add stock"
      );
    } finally {
      setAddingStock(false);
    }
  }

  async function handleRemoveStock(
    stock: MarketStock
  ) {
    const confirmed = window.confirm(
      `Remove ${stock.symbol} from your watchlist?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setRemovingSymbol(stock.symbol);
      setError("");

      await removeStockFromWatchlist(
        WATCHLIST_ID,
        stock.itemId
      );

      await loadMarketData();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to remove stock"
      );
    } finally {
      setRemovingSymbol("");
    }
  }

  useEffect(() => {
    loadMarketData();
  }, []);

  const stocks = data?.stocks ?? [];

  const highCount = stocks.filter(
    (stock) =>
      stock.change?.status === "high"
  ).length;

  const watchCount = stocks.filter(
    (stock) =>
      stock.change?.status === "watch"
  ).length;

  const newCount = stocks.filter(
    (stock) =>
      stock.change?.status === "new"
  ).length;

  const normalCount = stocks.filter(
    (stock) =>
      stock.change?.status === "normal"
  ).length;

  const hasChanges =
    highCount > 0 ||
    watchCount > 0 ||
    newCount > 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* Header */}
        <header className="mb-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Market Pulse
            </h1>

            <p className="mt-1 text-slate-400">
              Understand what changed since you last checked.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() =>
                setShowAddStock(!showAddStock)
              }
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200"
            >
              {showAddStock
                ? "Cancel"
                : "Add Stock"}
            </button>

            <button
              onClick={loadMarketData}
              disabled={loading}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <button
              onClick={handleMarkAsSeen}
              disabled={
                markingSeen ||
                loading ||
                stocks.length === 0
              }
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {markingSeen
                ? "Saving..."
                : "Mark as seen"}
            </button>
          </div>
        </header>

        {/* Add Stock */}
        {showAddStock && (
          <section className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <form
              onSubmit={handleAddStock}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <input
                value={symbol}
                onChange={(event) =>
                  setSymbol(event.target.value)
                }
                placeholder="Enter stock symbol, e.g. TCS"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-slate-500"
                disabled={addingStock}
              />

              <button
                type="submit"
                disabled={addingStock}
                className="rounded-lg bg-white px-5 py-3 font-medium text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingStock
                  ? "Adding..."
                  : "Add Stock"}
              </button>
            </form>

            {addError && (
              <p className="mt-3 text-sm text-red-400">
                {addError}
              </p>
            )}
          </section>
        )}

        {/* Loading */}
        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-slate-400">
              Loading your watchlist...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mb-8 rounded-xl border border-red-900 bg-red-950/40 p-6">
            <p className="font-medium text-red-400">
              {error}
            </p>

            <button
              onClick={loadMarketData}
              className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900"
            >
              Try again
            </button>
          </div>
        )}

        {/* Dashboard */}
        {!loading && data && (
          <>
            {/* Summary */}
            <section className="mb-10">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold">
                  What changed since you last checked?
                </h2>

                {hasChanges && (
                  <p className="text-sm text-slate-400">
                    Review the changes before marking them as seen.
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                  title="High attention"
                  count={highCount}
                  description="Large or significant changes"
                />

                <SummaryCard
                  title="Worth watching"
                  count={watchCount}
                  description="Some meaningful movement"
                />

                <SummaryCard
                  title="New"
                  count={newCount}
                  description="Newly added stocks"
                />

                <SummaryCard
                  title="No material change"
                  count={normalCount}
                  description="Nothing significant detected"
                />
              </div>
            </section>

            {/* Recent Changes */}
            <section className="mb-10">
              <h2 className="mb-4 text-xl font-semibold">
                Recent changes
              </h2>

              {stocks.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
                  <p className="text-slate-400">
                    Your watchlist is empty.
                  </p>

                  <button
                    onClick={() =>
                      setShowAddStock(true)
                    }
                    className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900"
                  >
                    Add your first stock
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {stocks.map((stock) => (
                    <StockCard
                      key={stock.symbol}
                      stock={stock}
                      removing={
                        removingSymbol ===
                        stock.symbol
                      }
                      onRemove={() =>
                        handleRemoveStock(stock)
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Watchlist */}
            <section>
              <h2 className="mb-4 text-xl font-semibold">
                {data.watchlist.name}
              </h2>

              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                {stocks.map((stock, index) => (
                  <WatchlistRow
                    key={stock.symbol}
                    stock={stock}
                    last={
                      index ===
                      stocks.length - 1
                    }
                    removing={
                      removingSymbol ===
                      stock.symbol
                    }
                    onRemove={() =>
                      handleRemoveStock(stock)
                    }
                  />
                ))}
              </div>
            </section>

            {/* Data information */}
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
              <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-slate-400">
                    Market data: End of Day
                  </span>

                  <span className="text-slate-700">
                    •
                  </span>

                  <span className="text-slate-400">
                    NSE
                  </span>
                </div>

                <DataSourceSummary
                  stocks={stocks}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  count,
  description,
}: {
  title: string;
  count: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {count}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function StockCard({
  stock,
  removing,
  onRemove,
}: {
  stock: MarketStock;
  removing: boolean;
  onRemove: () => void;
}) {
  if (
    !stock.current ||
    !stock.change
  ) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">
            {stock.symbol}
          </h3>

          <span className="text-sm text-red-400">
            Data unavailable
          </span>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          {stock.error ??
            "Market data could not be loaded."}
        </p>

        <button
          onClick={onRemove}
          disabled={removing}
          className="mt-5 rounded-lg border border-red-900 px-3 py-2 text-sm text-red-400 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {removing
            ? "Removing..."
            : "Remove"}
        </button>
      </div>
    );
  }

  const isPositive =
    stock.change.priceChangePercent > 0;

  const statusLabel =
    stock.change.status === "high"
      ? "High attention"
      : stock.change.status === "watch"
        ? "Worth watching"
        : stock.change.status === "new"
          ? "New"
          : "No material change";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {stock.symbol}
          </h3>

          <p className="text-sm text-slate-500">
            {statusLabel}
          </p>
        </div>

        <span className="text-xs uppercase text-slate-500">
          {stock.freshness?.type}
        </span>
      </div>

      <p className="mt-5 text-2xl font-bold">
        ₹{stock.current.price.toLocaleString("en-IN")}
      </p>

      {stock.change.isFirstSeen ? (
        <p className="mt-1 text-sm text-slate-400">
          No previous baseline
        </p>
      ) : (
        <p
          className={`mt-1 text-sm ${
            isPositive
              ? "text-emerald-400"
              : stock.change.priceChangePercent < 0
                ? "text-red-400"
                : "text-slate-400"
          }`}
        >
          {stock.change.priceChangePercent > 0
            ? "+"
            : ""}
          {stock.change.priceChangePercent.toFixed(
            2
          )}
          % since last check
        </p>
      )}

      <div className="mt-5 rounded-lg bg-slate-950 p-3">
        <p className="text-sm text-slate-400">
          {stock.change.reason}
        </p>
      </div>

      <DataSourceBadge
        source={stock.dataSource}
      />

      <button
        onClick={onRemove}
        disabled={removing}
        className="mt-4 w-full rounded-lg border border-red-900 px-3 py-2 text-sm text-red-400 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {removing
          ? "Removing..."
          : "Remove from watchlist"}
      </button>
    </div>
  );
}

function WatchlistRow({
  stock,
  last,
  removing,
  onRemove,
}: {
  stock: MarketStock;
  last: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  if (
    !stock.current ||
    !stock.change
  ) {
    return (
      <div
        className={`flex items-center justify-between gap-4 px-6 py-5 ${
          !last
            ? "border-b border-slate-800"
            : ""
        }`}
      >
        <span className="font-medium">
          {stock.symbol}
        </span>

        <div className="flex items-center gap-4">
          <span className="text-sm text-red-400">
            Data unavailable
          </span>

          <button
            onClick={onRemove}
            disabled={removing}
            className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            {removing
              ? "Removing..."
              : "Remove"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-4 px-6 py-5 ${
        !last
          ? "border-b border-slate-800"
          : ""
      }`}
    >
      <div className="min-w-0">
        <p className="font-medium">
          {stock.symbol}
        </p>

        <p className="truncate text-sm text-slate-500">
          {stock.change.reason}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-5">
        <div className="text-right">
          <p className="font-semibold">
            ₹{stock.current.price.toLocaleString(
              "en-IN"
            )}
          </p>

          {!stock.change.isFirstSeen && (
            <p
              className={`text-sm ${
                stock.change.priceChangePercent > 0
                  ? "text-emerald-400"
                  : stock.change.priceChangePercent < 0
                    ? "text-red-400"
                    : "text-slate-500"
              }`}
            >
              {stock.change.priceChangePercent > 0
                ? "+"
                : ""}
              {stock.change.priceChangePercent.toFixed(
                2
              )}
              %
            </p>
          )}
        </div>

        <button
          onClick={onRemove}
          disabled={removing}
          className="text-sm text-red-400 transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {removing
            ? "Removing..."
            : "Remove"}
        </button>
      </div>
    </div>
  );
}

function DataSourceBadge({
  source,
}: {
  source?: string | null;
}) {
  if (!source) {
    return null;
  }

  const label =
    source === "BharatStock"
      ? "Fresh market data"
      : source === "Database cache"
        ? "Cached data"
        : source === "Database fallback"
          ? "Fallback data"
          : source;

  return (
    <div className="mt-4">
      <span className="inline-flex rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
        {label}
      </span>
    </div>
  );
}

function DataSourceSummary({
  stocks,
}: {
  stocks: MarketStock[];
}) {
  const sources = [
    ...new Set(
      stocks
        .map((stock) => stock.dataSource)
        .filter(Boolean)
    ),
  ];

  if (sources.length === 0) {
    return (
      <span className="text-red-400">
        Market data unavailable
      </span>
    );
  }

  if (
    sources.includes("Database fallback")
  ) {
    return (
      <span className="text-amber-400">
        Using saved data — provider unavailable
      </span>
    );
  }

  if (
    sources.includes("Database cache")
  ) {
    return (
      <span className="text-slate-400">
        Using saved market snapshot
      </span>
    );
  }

  return (
    <span className="text-slate-400">
      Source: BharatStock
    </span>
  );
}