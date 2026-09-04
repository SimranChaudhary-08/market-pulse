import prisma from "@/lib/prisma";
import { getDemoUser } from "@/lib/demo-user";
import { getQuote } from "@/lib/market/twelve-data";

type RouteContext = {
  params: Promise<{ watchlistId: string }>;
};

export async function POST(
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

    const results = await Promise.all(
      watchlist.items.map(async (item) => {
        try {
          const quote = await getQuote(item.symbol);

          await prisma.userStockState.upsert({
            where: {
              userId_symbol: {
                userId: user.id,
                symbol: item.symbol,
              },
            },
            update: {
              lastSeenPrice: quote.price,
              lastSeenVolume: quote.volume,
              lastSeenAt: new Date(),
            },
            create: {
              userId: user.id,
              symbol: item.symbol,
              lastSeenPrice: quote.price,
              lastSeenVolume: quote.volume,
            },
          });

          return {
            symbol: item.symbol,
            saved: true,
          };
        } catch (error) {
          return {
            symbol: item.symbol,
            saved: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to save stock state",
          };
        }
      })
    );

    return Response.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Failed to mark watchlist as seen:", error);

    return Response.json(
      { error: "Failed to mark watchlist as seen" },
      { status: 500 }
    );
  }
}