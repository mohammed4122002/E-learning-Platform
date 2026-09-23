import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/lib/auth";

/** Entry point: signed-in users go to their workspace, visitors to the sign-in screen. */
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? homePathFor(user) : "/login");
}
