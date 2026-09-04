import prisma from "@/lib/prisma";
import { getDemoUser } from "@/lib/demo-user";

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

    const watchlist =
      await prisma.watchlist.findFirst({
        where: {
          id: watchlistId,
          userId: user.id,
        },
      });

    if (!watchlist) {
      return Response.json(
        {
          error: "Watchlist not found",
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    const symbol =
      typeof body.symbol === "string"
        ? body.symbol.trim().toUpperCase()
        : "";

    if (!symbol) {
      return Response.json(
        {
          error: "Stock symbol is required",
        },
        { status: 400 }
      );
    }

    /*
     * Basic symbol validation.
     *
     * We don't call the external market-data provider
     * here because the provider may be temporarily
     * unavailable or rate-limited.
     */
    if (!/^[A-Z0-9.-]{1,20}$/.test(symbol)) {
      return Response.json(
        {
          error:
            "Invalid stock symbol format",
        },
        { status: 400 }
      );
    }

    /*
     * Check for duplicates before creating the item.
     */
    const existingItem =
      await prisma.watchlistItem.findUnique({
        where: {
          watchlistId_symbol: {
            watchlistId,
            symbol,
          },
        },
      });

    if (existingItem) {
      return Response.json(
        {
          error:
            "Stock is already in this watchlist",
        },
        { status: 409 }
      );
    }

    /*
     * Add the stock to the watchlist.
     *
     * Market data is fetched separately by the market
     * endpoint. This means a temporary provider failure
     * does not prevent watchlist management.
     */
    const item =
      await prisma.watchlistItem.create({
        data: {
          symbol,
          watchlistId,
        },
      });

    return Response.json(
      item,
      { status: 201 }
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return Response.json(
        {
          error:
            "Stock is already in this watchlist",
        },
        { status: 409 }
      );
    }

    console.error(
      "Failed to add stock:",
      error
    );

    return Response.json(
      {
        error: "Failed to add stock",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { watchlistId } = await params;
    const user = await getDemoUser();

    const body = await request.json();

    const itemId =
      typeof body.itemId === "string"
        ? body.itemId.trim()
        : "";

    if (!itemId) {
      return Response.json(
        {
          error:
            "Stock item ID is required",
        },
        { status: 400 }
      );
    }

    const item =
      await prisma.watchlistItem.findFirst({
        where: {
          id: itemId,
          watchlistId,
          watchlist: {
            userId: user.id,
          },
        },
      });

    if (!item) {
      return Response.json(
        {
          error:
            "Stock not found in watchlist",
        },
        { status: 404 }
      );
    }

    await prisma.watchlistItem.delete({
      where: {
        id: item.id,
      },
    });

    return Response.json({
      success: true,
      symbol: item.symbol,
    });
  } catch (error) {
    console.error(
      "Failed to remove stock:",
      error
    );

    return Response.json(
      {
        error: "Failed to remove stock",
      },
      { status: 500 }
    );
  }
}