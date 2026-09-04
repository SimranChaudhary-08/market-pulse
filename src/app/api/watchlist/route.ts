import prisma from "@/lib/prisma";
import { getDemoUser } from "@/lib/demo-user";

export async function GET() {
  try {
    const user = await getDemoUser();

    const watchlists = await prisma.watchlist.findMany({
      where: {
        userId: user.id,
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return Response.json(watchlists);
  } catch (error) {
    console.error("Failed to fetch watchlists:", error);

    return Response.json(
      { error: "Failed to fetch watchlists" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getDemoUser();

    const body = await request.json();
    const name = body.name?.trim();

    if (!name) {
      return Response.json(
        { error: "Watchlist name is required" },
        { status: 400 }
      );
    }

    const watchlist = await prisma.watchlist.create({
      data: {
        name,
        userId: user.id,
      },
    });

    return Response.json(watchlist, { status: 201 });
  } catch (error) {
    console.error("Failed to create watchlist:", error);

    return Response.json(
      { error: "Failed to create watchlist" },
      { status: 500 }
    );
  }
}