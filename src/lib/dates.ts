/** Horário local: noite até 6h, manhã até 12h, tarde até 18h. */
export function dayGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) return "Bom dia!";
  if (hour >= 12 && hour < 18) return "Boa tarde!";
  return "Boa noite!";
}

/** Próximo instante local em que o cumprimento ou o dia mudam. */
export function nextGreetingChange(date = new Date()) {
  const hour = date.getHours();
  const next = new Date(date);
  const mark = [6, 12, 18].find((item) => item > hour);
  if (mark != null) {
    next.setHours(mark, 0, 0, 0);
    return next;
  }
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function calendarDay(iso: string | null | undefined) {
  if (!iso) return "";
  const match = iso.match(/(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? "";
}

export function clockOf(iso: string | null | undefined) {
  if (!iso) return "";
  const match = iso.match(/(?:T|\s)(\d{2}:\d{2})/);
  if (!match || match[1] === "12:00") return "";
  return match[1];
}

export function noonUtc(day: string) {
  return `${day}T12:00:00.000Z`;
}

export function withClock(day: string, clock: string) {
  if (!day) return null;
  if (!/^\d{2}:\d{2}$/.test(clock)) return noonUtc(day);
  return `${day}T${clock}:00.000Z`;
}

export function formatDayLabel(iso: string | null) {
  const day = calendarDay(iso);
  if (!day) return null;
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return null;
  return new Date(year, month - 1, date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function formatRange(startIso: string | null, endIso: string | null) {
  const start = formatDayLabel(startIso);
  const end = formatDayLabel(endIso);
  if (!start) return null;
  const startClock = clockOf(startIso);
  const endClock = clockOf(endIso);
  const startText = startClock ? `${start} ${startClock}` : start;
  const endText = endClock ? `${end ?? start} ${endClock}` : end;
  if (!endText || startText === endText) return startText;
  return `${startText} – ${endText}`;
}

export function spanDays(startIso: string | null, endIso: string | null) {
  const start = calendarDay(startIso);
  const end = calendarDay(endIso) || start;
  if (!start) return [] as string[];
  const from = start <= end ? start : end;
  const to = start <= end ? end : start;
  const days: string[] = [];
  const cursor = new Date(`${from}T12:00:00Z`);
  const last = new Date(`${to}T12:00:00Z`);
  while (cursor.getTime() <= last.getTime() && days.length < 400) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function isSameCalendarDay(iso: string | null, day = new Date()) {
  const key = calendarDay(iso);
  if (!key) return false;
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return key === `${day.getFullYear()}-${month}-${date}`;
}
