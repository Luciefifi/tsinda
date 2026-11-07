"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

// A password box with "Show" and "Make one for me". The made-up password
// follows the rules (capital, number, symbol) and is easy to read out on the
// phone: no 0/O or 1/l/I that people mix up.
export function PasswordField({ label, error, name = "password" }: { label: string; error?: string; name?: string }) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Input
        label={label}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        error={error}
        required
      />
      <div className="flex gap-4 text-sm font-bold">
        <button
          type="button"
          onClick={() => {
            setValue(makePassword());
            setVisible(true);
          }}
          className="text-brand-700 underline"
        >
          🎲 Make one for me
        </button>
        <button type="button" onClick={() => setVisible((v) => !v)} className="text-brand-700 underline">
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

const WORDS = ["Inka", "Ishyamba", "Izuba", "Ikiyaga", "Umusozi", "Inyange", "Intare", "Imvura"];
const SYMBOLS = "@#!?";

// For example "Izuba-482@": a word, 3 numbers and a symbol.
function makePassword(): string {
  const random = (max: number) => crypto.getRandomValues(new Uint32Array(1))[0] % max;
  const digits = String(200 + random(800));
  return `${WORDS[random(WORDS.length)]}-${digits}${SYMBOLS[random(SYMBOLS.length)]}`;
}
