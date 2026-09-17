/** yyyy-MM-dd hh:mm */
export function timestamp2Day(ms: number, pattern = "yyyy-MM-dd hh:mm"): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  if (pattern === "yyyy-MM-dd") {
    return `${y}-${m}-${day}`;
  }
  return `${y}-${m}-${day} ${h}:${min}`;
}
