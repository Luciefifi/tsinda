import Link from "next/link";
import { Suspense } from "react";
import { AdminNav, AdminNavLinks } from "./admin-nav";

// The frame around every admin page: title, tabs and a way home. Each page
// checks the permission it needs itself, because a layout does not re-run on
// every navigation and must not be the only guard.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col bg-brand-50">
      <header className="border-b border-brand-100 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-6">
            <Link href="/admin" className="text-lg font-extrabold text-brand-700">
              Tsinda · Admin
            </Link>
            <Link href="/" className="text-sm font-bold text-brand-700 underline md:hidden">
              Home
            </Link>
          </div>
          <Suspense fallback={<AdminNavLinks pathname={null} />}>
            <AdminNav />
          </Suspense>
          <Link href="/" className="hidden text-sm font-bold text-brand-700 underline md:block">
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
