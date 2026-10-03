import assert from "node:assert/strict";
import test from "node:test";
import { googleAgendaUrl, icsFor } from "./agenda.ts";
import { calendarDay, clockOf, dayGreeting, formatRange, nextGreetingChange, noonUtc, spanDays, withClock } from "./dates.ts";
import { localDay } from "./notify.ts";

test("o cumprimento segue o horário local", () => {
  assert.equal(dayGreeting(new Date(2026, 8, 29, 0, 30)), "Boa noite!");
  assert.equal(dayGreeting(new Date(2026, 8, 29, 5, 59)), "Boa noite!");
  assert.equal(dayGreeting(new Date(2026, 8, 29, 6, 0)), "Bom dia!");
  assert.equal(dayGreeting(new Date(2026, 8, 29, 11, 59)), "Bom dia!");
  assert.equal(dayGreeting(new Date(2026, 8, 29, 12, 0)), "Boa tarde!");
  assert.equal(dayGreeting(new Date(2026, 8, 29, 17, 59)), "Boa tarde!");
  assert.equal(dayGreeting(new Date(2026, 8, 29, 18, 0)), "Boa noite!");
  assert.equal(dayGreeting(new Date(2026, 8, 29, 23, 30)), "Boa noite!");
});

test("o relógio acorda na virada da noite, da manhã e do dia", () => {
  const night = nextGreetingChange(new Date(2026, 8, 29, 5, 10));
  assert.equal(night.getHours(), 6);
  assert.equal(night.getDate(), 29);
  const evening = nextGreetingChange(new Date(2026, 8, 29, 18, 5));
  assert.equal(evening.getDate(), 30);
  assert.equal(evening.getHours(), 0);
  const afternoon = nextGreetingChange(new Date(2026, 8, 29, 17, 0));
  assert.equal(afternoon.getHours(), 18);
  assert.equal(afternoon.getDate(), 29);
});
test("meia-noite usa o dia do relógio, não o UTC", () => {
  const justAfter = new Date(2026, 8, 29, 0, 1, 0);
  const local = `${justAfter.getFullYear()}-${String(justAfter.getMonth() + 1).padStart(2, "0")}-${String(justAfter.getDate()).padStart(2, "0")}`;
  assert.equal(localDay(justAfter), "2026-09-29");
  assert.equal(localDay(justAfter), local);
  const utc = justAfter.toISOString().slice(0, 10);
  if (utc !== local) assert.notEqual(localDay(justAfter), utc);
});
test("o dia escolhido não recua por causa do fuso", () => {
  const stored = noonUtc("2026-10-02");
  assert.equal(calendarDay(stored), "2026-10-02");
  assert.equal(calendarDay("2026-10-02 00:00:00+00"), "2026-10-02");
});

test("o período lista cada dia, inclusive o último", () => {
  const days = spanDays(noonUtc("2026-10-02"), noonUtc("2026-10-04"));
  assert.deepEqual(days, ["2026-10-02", "2026-10-03", "2026-10-04"]);
});

test("um dia só não vira intervalo", () => {
  const label = formatRange(noonUtc("2026-10-02"), noonUtc("2026-10-02"));
  assert.match(label ?? "", /02/);
  assert.equal(label?.includes("–"), false);
});

test("a hora fica no mesmo dia e o dia inteiro não vira meio-dia", () => {
  assert.equal(clockOf(noonUtc("2026-10-02")), "");
  assert.equal(clockOf(withClock("2026-10-02", "14:30")), "14:30");
  assert.equal(calendarDay(withClock("2026-10-02", "14:30")), "2026-10-02");
});

test("o Google Agenda recebe o período, com o último dia incluído", () => {
  const url = googleAgendaUrl({
    id: "11111111-1111-1111-1111-111111111111",
    text: "estudar",
    dueAt: noonUtc("2026-10-02"),
    endsAt: noonUtc("2026-10-04"),
  });
  assert.match(url ?? "", /calendar\.google\.com/);
  assert.match(url ?? "", /20261002%2F20261005/);
  const ics = icsFor({
    id: "11111111-1111-1111-1111-111111111111",
    text: "estudar",
    dueAt: withClock("2026-10-02", "09:00"),
    endsAt: withClock("2026-10-02", "10:00"),
  });
  assert.match(ics ?? "", /DTSTART:20261002T090000/);
  assert.match(ics ?? "", /DTEND:20261002T100000/);
});
