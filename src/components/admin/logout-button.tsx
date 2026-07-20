"use client";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth/client";
export function LogoutButton() { return <button className="button" onClick={async () => { await authClient.signOut(); location.href = "/admin/login"; }}><LogOut size={17} />خروج</button>; }
