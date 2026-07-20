import { LogoutButton } from "@/components/admin/logout-button";
import { Sidebar } from "@/components/admin/sidebar";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "لوحة التحكم", robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) { const session = await requireSession(); return <div className="admin-shell"><Sidebar /><main id="main" className="admin-main"><header className="admin-header"><div><span className="eyebrow">لوحة إدارة المحتوى</span><div className="muted">{session.user.name} · {session.user.role}</div></div><LogoutButton /></header>{children}</main></div>; }
