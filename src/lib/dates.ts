// Dates are stored in UTC and shown in Rwanda's time (Africa/Kigali, UTC+2),
// wherever the server runs.

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Kigali",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateOnly = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Kigali",
  day: "numeric",
  month: "short",
  year: "numeric",
});

// "7 Nov 2026, 14:32"
export function formatDateTime(date: Date): string {
  return dateTime.format(date);
}

// "7 Nov 2026"
export function formatDate(date: Date): string {
  return dateOnly.format(date);
}
