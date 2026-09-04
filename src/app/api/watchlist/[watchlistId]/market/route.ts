import prisma from "@/lib/prisma";
import { getDemoUser } from "@/lib/demo-user";
import { getQuote } from "@/lib/market/twelve-data";
import { detectChange } from "@/lib/change-engine";

type RouteContext = {
  params: Promise<{ watchlistId: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { watchlistId } = await params;
    const user = await getDemoUser();

    const watchlist = await prisma.watchlist.findFirst({
      where: {
        id: watchlistId,
        userId: user.id,
      },
      include: {
        items: true,
      },
    });

    if (!watchlist) {
      return Response.json(
        { error: "Watchlist not found" },
        { status: 404 }
      );
    }

    const stocks = await Promise.all(
      watchlist.items.map(async (item) => {
        try {
          /*
           * Find the latest snapshot we have for this stock.
           */
          const latestSnapshot =
            await prisma.marketSnapshot.findFirst({
              where: {
                symbol: item.symbol,
              },
              orderBy: {
                timestamp: "desc",
              },
            });

          let price: number;
          let volume: number | null;
          let timestamp: number | null;
          let change: number;
          let changePercent: number;
          let dataSource: string;

          /*
           * If we have a recent snapshot, use it instead
           * of making another request to BharatStock.
           */
          if (
            latestSnapshot &&
            isRecentSnapshot(
              latestSnapshot.timestamp
            )
          ) {
            price = latestSnapshot.price;
            volume = latestSnapshot.volume;

            timestamp = Math.floor(
              latestSnapshot.timestamp.getTime() /
                1000
            );

            /*
             * Compare against the previous market snapshot
             * to calculate the normal daily price change.
             */
            const previousSnapshot =
              await prisma.marketSnapshot.findFirst({
                where: {
                  symbol: item.symbol,
                  timestamp: {
                    lt: latestSnapshot.timestamp,
                  },
                },
                orderBy: {
                  timestamp: "desc",
                },
              });

            const previousPrice =
              previousSnapshot?.price ?? price;

            change = price - previousPrice;

            changePercent =
              previousPrice !== 0
                ? (change / previousPrice) * 100
                : 0;

            dataSource = "Database cache";
          } else {
            /*
             * No recent snapshot exists.
             * Try to fetch fresh EOD data.
             */
            try {
              const quote = await getQuote(
                item.symbol
              );

              price = quote.price;
              volume = quote.volume;
              timestamp = quote.timestamp;
              change = quote.change;
              changePercent = quote.changePercent;

              dataSource = "BharatStock";

              /*
               * Save the new market snapshot.
               */
              if (quote.timestamp) {
                const snapshotTime =
                  new Date(
                    quote.timestamp * 1000
                  );

                const existingSnapshot =
                  await prisma.marketSnapshot.findFirst({
                    where: {
                      symbol: item.symbol,
                      timestamp: snapshotTime,
                    },
                  });

                if (!existingSnapshot) {
                  await prisma.marketSnapshot.create({
                    data: {
                      symbol: item.symbol,
                      price: quote.price,
                      volume: quote.volume,
                      timestamp: snapshotTime,
                      source: "BharatStock",
                    },
                  });
                }
              }
            } catch (providerError) {
              /*
               * BharatStock failed.
               *
               * Use the latest saved snapshot if one exists.
               */
              if (!latestSnapshot) {
                throw providerError;
              }

              price = latestSnapshot.price;
              volume = latestSnapshot.volume;

              timestamp = Math.floor(
                latestSnapshot.timestamp.getTime() /
                  1000
              );

              const previousSnapshot =
                await prisma.marketSnapshot.findFirst({
                  where: {
                    symbol: item.symbol,
                    timestamp: {
                      lt: latestSnapshot.timestamp,
                    },
                  },
                  orderBy: {
                    timestamp: "desc",
                  },
                });

              const previousPrice =
                previousSnapshot?.price ?? price;

              change = price - previousPrice;

              changePercent =
                previousPrice !== 0
                  ? (change / previousPrice) * 100
                  : 0;

              dataSource = "Database fallback";
            }
          }

          /*
           * Get recent snapshots for volume analysis.
           *
           * We use previous snapshots rather than today's
           * snapshot because today's volume is what we want
           * to compare against the historical baseline.
           */
          const recentSnapshots =
            await prisma.marketSnapshot.findMany({
              where: {
                symbol: item.symbol,
                volume: {
                  not: null,
                },
                timestamp: {
                  lt: timestamp
                    ? new Date(timestamp * 1000)
                    : new Date(),
                },
              },
              orderBy: {
                timestamp: "desc",
              },
              take: 10,
            });

          /*
           * Calculate the average volume from recent
           * historical snapshots.
           */
          let typicalVolume: number | null = null;

          if (recentSnapshots.length > 0) {
            const validVolumes =
              recentSnapshots
                .map(
                  (snapshot) =>
                    snapshot.volume
                )
                .filter(
                  (
                    volume
                  ): volume is number =>
                    volume !== null &&
                    volume > 0
                );

            if (validVolumes.length > 0) {
              typicalVolume =
                validVolumes.reduce(
                  (sum, currentVolume) =>
                    sum + currentVolume,
                  0
                ) /
                validVolumes.length;
            }
          }

          /*
           * Get the user's last-seen baseline.
           */
          const previousState =
            await prisma.userStockState.findUnique({
              where: {
                userId_symbol: {
                  userId: user.id,
                  symbol: item.symbol,
                },
              },
            });

          /*
           * Detect meaningful changes using:
           *
           * 1. Price movement since last check
           * 2. Historical volume behaviour
           * 3. User's previous baseline
           */
          const detectedChange = detectChange(
            {
              price,
              volume,
            },
            previousState,
            typicalVolume
          );

          return {
            itemId: item.id,

            symbol: item.symbol,

            current: {
              price,
              change,
              changePercent,
              volume,
            },

            previous: previousState
              ? {
                  price:
                    previousState.lastSeenPrice,
                  volume:
                    previousState.lastSeenVolume,
                  seenAt:
                    previousState.lastSeenAt,
                }
              : null,

            change: detectedChange,

            freshness: {
              type: "EOD",
              timestamp: timestamp
                ? new Date(
                    timestamp * 1000
                  ).toISOString()
                : null,
            },

            dataSource,

            error: null,
          };
        } catch (error) {
          return {
            itemId: item.id,

            symbol: item.symbol,

            current: null,
            previous: null,
            change: null,
            freshness: null,

            dataSource: null,

            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch market data",
          };
        }
      })
    );

    return Response.json({
      watchlist: {
        id: watchlist.id,
        name: watchlist.name,
      },

      stocks,
    });
  } catch (error) {
    console.error(
      "Failed to fetch watchlist market data:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to fetch watchlist market data",
      },
      { status: 500 }
    );
  }
}

/*
 * EOD data doesn't change throughout the day.
 *
 * We consider a snapshot from the last 48 hours
 * recent enough to reuse.
 *
 * This also handles weekends and market holidays.
 */
function isRecentSnapshot(
  timestamp: Date
) {
  const now = Date.now();

  const age =
    now - timestamp.getTime();

  const fortyEightHours =
    48 * 60 * 60 * 1000;

  return age <= fortyEightHours;
}