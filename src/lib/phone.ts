// Rwandan mobile numbers are 9 digits starting with 7, after the country code
// 250. People write them in many ways ("0788 123 456", "+250788123456",
// "250-788-123-456"); the database always stores "+250788123456".
// Returns null when the text is not a Rwandan mobile number.
export function normalizeRwandaPhone(input: string): string | null {
  const compact = input.replace(/[\s-]/g, "");
  const match = compact.match(/^(?:\+?250|0)?(7\d{8})$/);
  return match ? `+250${match[1]}` : null;
}

// "+250788123456" -> "0788 123 456", the way people write it in Rwanda.
export function formatPhone(phone: string | null): string {
  if (!phone) return "";
  const local = phone.replace(/^\+250/, "0");
  return local.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");
}
