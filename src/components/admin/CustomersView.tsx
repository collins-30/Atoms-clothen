"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { NoticeBar, type Notice } from "@/components/admin/AdminUi";
import { setUserRole, type AdminCustomer } from "@/server/admin-customers";

export default function CustomersView({ customers }: { customers: AdminCustomer[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const changeRole = async (c: AdminCustomer, role: "USER" | "ADMIN") => {
    if (role === c.role) return;
    if (role === "ADMIN" && !window.confirm(`Give ${c.email} full admin access to the store?`)) return;
    setBusyId(c.id);
    setNotice(null);
    try {
      const res = await setUserRole({ userId: c.id, role });
      if (res.ok) {
        setNotice({ tone: "ok", text: `${c.email} is now ${role === "ADMIN" ? "an admin" : "a customer"}.` });
        router.refresh();
      } else {
        setNotice({ tone: "error", text: res.error });
      }
    } catch {
      setNotice({ tone: "error", text: "Could not change the role. Please try again." });
    } finally {
      setBusyId(null);
    }
  };

  const needle = q.trim().toLowerCase();
  const visible = needle ? customers.filter((c) => `${c.name ?? ""} ${c.email}`.toLowerCase().includes(needle)) : customers;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <p className="text-xs text-stone-500 flex-1">
          {customers.length} account{customers.length === 1 ? "" : "s"}. Customers create their own accounts at /register.
        </p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email…"
          aria-label="Search customers"
          className="h-9 px-3 text-sm bg-transparent border border-stone-300 rounded-none outline-none focus:border-[#1a1a1a] sm:w-64"
        />
      </div>
      {notice && <div className="mb-4"><NoticeBar notice={notice} /></div>}

      {visible.length === 0 ? (
        <p className="text-sm text-stone-400 border border-stone-200 py-16 text-center">No matching customers.</p>
      ) : (
        <div className="divide-y divide-stone-200 border-y border-stone-200">
          {visible.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-4 py-4">
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-medium text-[#1a1a1a]">{c.name || "—"}{c.isSelf && <span className="ml-2 text-[10px] tracking-[0.15em] uppercase text-stone-400">you</span>}</p>
                <p className="text-xs text-stone-500">{c.email}</p>
              </div>
              <span className="text-xs text-stone-500 min-w-[100px]">{c.phone || "—"}</span>
              <span className="text-xs text-stone-500 min-w-[90px]">{c.country || "—"}</span>
              <span className="text-xs text-stone-500">Joined {c.joinedLabel}</span>
              <span className="text-xs text-stone-500 w-16">{c.orders} order{c.orders === 1 ? "" : "s"}</span>
              <span className="text-xs text-[#1a1a1a] w-28 text-right">{c.spend}</span>
              {busyId === c.id ? (
                <span className="w-28 inline-flex"><Loader2 className="w-4 h-4 animate-spin text-stone-400" /></span>
              ) : (
                <select
                  value={c.role}
                  disabled={c.isSelf}
                  onChange={(e) => changeRole(c, e.target.value as "USER" | "ADMIN")}
                  aria-label={`Role for ${c.email}`}
                  title={c.isSelf ? "You can't change your own role" : undefined}
                  className="h-8 w-28 px-2 text-xs bg-transparent border border-stone-300 rounded-none outline-none focus:border-[#1a1a1a] disabled:opacity-50"
                >
                  <option value="USER">Customer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
