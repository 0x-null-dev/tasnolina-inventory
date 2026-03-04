import { prisma } from "@/lib/prisma";
import IstorijaClient from "./IstorijaClient";

export const dynamic = "force-dynamic";

export default async function IstorijaPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { username: true } },
    },
  });

  const serialized = logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }));

  return <IstorijaClient initialLogs={serialized} />;
}
