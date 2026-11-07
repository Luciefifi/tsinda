import { useId, type ComponentProps } from "react";

type SelectProps = ComponentProps<"select"> & {
  label: string;
  error?: string;
};

// A labelled drop-down list, styled like Input.
export function Select({ label, error, id, className = "", children, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-base font-bold text-ink">
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-12 rounded-xl border-2 bg-white px-3 py-3 text-lg text-ink outline-none transition-colors focus:border-brand-600 ${error ? "border-red-600" : "border-slate-300"} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
