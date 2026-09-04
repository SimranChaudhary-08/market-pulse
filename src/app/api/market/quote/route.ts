import { getQuote } from "@/lib/market/twelve-data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.trim().toUpperCase();

    if (!symbol) {
      return Response.json(
        { error: "Stock symbol is required" },
        { status: 400 }
      );
    }

    const quote = await getQuote(symbol);

    return Response.json(quote);
  } catch (error) {
  console.error("Failed to fetch market quote:", error);

  return Response.json(
    {
      error: error instanceof Error ? error.message : "Unknown error",
    },
    { status: 502 }
  );
}
}
