"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview", icon: "🏠" },
  { href: "/admin/people", label: "People", icon: "👥" },
  { href: "/admin/roles", label: "Roles", icon: "🎭" },
];

// The admin tabs, with the tab for the current page highlighted. Reading the
// URL needs the browser, so this is a Client Component. The layout wraps it
// in <Suspense> with <AdminNavLinks pathname={null} /> as the fallback: the
// same tabs, not yet highlighted, so the page can be prerendered.
export function AdminNav() {
  return <AdminNavLinks pathname={usePathname()} />;
}

export function AdminNavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto">
      {TABS.map((tab) => {
        const active = tab.href === "/admin" ? pathname === "/admin" : Boolean(pathname?.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 font-bold transition-colors ${
              active ? "bg-brand-700 text-white" : "text-brand-800 hover:bg-brand-50"
            }`}
          >
            <span aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
