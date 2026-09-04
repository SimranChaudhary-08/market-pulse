import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const result = await prisma.$queryRaw`SELECT NOW() as time`;

    return Response.json({
      status: "ok",
      database: "connected",
      time: result,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return Response.json(
      {
        status: "error",
        database: "disconnected",
      },
      { status: 500 }
    );
  }
}