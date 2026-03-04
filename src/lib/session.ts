import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    userId: (session.user as { id: string }).id,
    username: session.user.name || "",
  };
}
