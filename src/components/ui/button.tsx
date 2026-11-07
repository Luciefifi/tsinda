import type { ComponentProps } from "react";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary";
};

const variants = {
  primary: "bg-brand-700 text-white hover:bg-brand-800",
  secondary: "border-2 border-brand-700 bg-white text-brand-700 hover:bg-brand-50",
};

// Big, easy-to-tap buttons (at least 48px high) for small fingers on a phone.
export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`min-h-12 w-full rounded-xl px-5 py-3 text-lg font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sun-400 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
