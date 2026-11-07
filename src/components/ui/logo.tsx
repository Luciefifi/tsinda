// The Tsinda mark: a blue rounded square with a white "T" and a yellow star.
export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden="true">
        <rect width="48" height="48" rx="14" className="fill-brand-700" />
        <path d="M13 14h20v5h-7.5v17h-5V19H13z" fill="#ffffff" />
        <path
          d="M38 5l1.8 3.9 4.2.5-3.1 2.9.8 4.2L38 14.4l-3.7 2.1.8-4.2-3.1-2.9 4.2-.5z"
          className="fill-sun-400"
        />
      </svg>
      <span className="text-3xl font-extrabold tracking-tight text-brand-700">Tsinda</span>
    </div>
  );
}
