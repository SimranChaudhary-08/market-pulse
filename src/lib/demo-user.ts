import prisma from "@/lib/prisma";

export async function getDemoUser() {
  return prisma.user.upsert({
    where: {
      email: "demo@marketpulse.app",
    },
    update: {},
    create: {
      email: "demo@marketpulse.app",
    },
  });
}