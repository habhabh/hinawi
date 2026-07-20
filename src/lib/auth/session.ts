import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { assertPermission, type Permission, type Role } from "@/lib/permissions";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.user.banned) redirect("/admin/login?disabled=1");
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireSession();
  assertPermission(session.user.role as Role, permission);
  return session;
}
