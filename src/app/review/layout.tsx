import Link from "next/link";

// The frame around every review page: a simple header with a way home.
export default function ReviewLayout({ children }: LayoutProps<"/review">) {
  return (
    <div className="flex flex-1 flex-col bg-brand-50">
      <header className="border-b border-brand-100 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/review" className="text-lg font-extrabold text-brand-700">
            Tsinda · Review
          </Link>
          <Link href="/" className="text-sm font-bold text-brand-700 underline">
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
