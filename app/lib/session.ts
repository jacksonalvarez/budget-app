import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { HttpError } from "./http";

export async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new HttpError(401, "Sign in required");
  }
  return session.user.id;
}
