import { getQuote } from "@/lib/market/twelve-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim().toUpperCase();

  if (!symbol) {
    return Response.json(
      { error: "Symbol is required" },
      { status: 400 }
    );
  }

  try {
    const quote = await getQuote(symbol);

    return Response.json({
      success: true,
      quote,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 502 }
    );
  }
}