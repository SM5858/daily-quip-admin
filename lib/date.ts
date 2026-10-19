export const APP_TIMEZONE = "America/New_York";

/** `YYYY-MM-DD` for an instant, in the contest's timezone. */
export function dayInAppTz(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(
    new Date(value)
  );
}

/** Hour 0-23 for an instant, in the contest's timezone. */
export function hourInAppTz(value: string | Date) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIMEZONE,
      hour: "2-digit",
      hour12: false,
    }).format(new Date(value))
  ) % 24;
}

export function formatDay(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
