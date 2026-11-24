// How fast a visit gets to its first arrival time, and from where: one GET per page load of an empty file on
// staseis.gr (/m/eta/{city}/{bucket}/{source}/{tab|pwa}; the build writes all of them, scripts/eta-paths.ts, so the
// answer is 200 and the console stays clean). Cloudflare's zone analytics count the paths.
// Nothing is stored on the device and nothing identifies the visitor: no id, no query, no Referer, no cookies.
// Audit 2026-11-24 (docs/audit-no-daily-users-2026-11-24.md, section 5).

import { cardFromUrl } from "./paths";

// near: «Κοντά σου», fav: the ★ panel, link: the stop card the page was opened on, card: a stop card opened later.
export type EtaSrc = "near" | "fav" | "link" | "card";

const BUCKETS = ["lt5", "5-15", "15-30", "gt30"] as const;
const SOURCES: EtaSrc[] = ["near", "fav", "link", "card"];
// The two big cities apart, the 28 small ones together (Cloudflare Pages caps the preview's file count); root: the page
// was opened on «/», whose city the URL does not name.
const CITY_KEYS = ["athens", "thessaloniki", "other", "root"] as const;
const cityKey = (city: string) => (city === "athens" || city === "thessaloniki" ? city : city ? "other" : "root");

export function etaBucket(ms: number): (typeof BUCKETS)[number] {
  if (!(ms >= 0)) return "gt30";   // NaN or a clock that went back: the slow end, so it never flatters
  if (ms < 5_000) return "lt5";
  if (ms < 15_000) return "5-15";
  if (ms < 30_000) return "15-30";
  return "gt30";
}

export const etaPath = (o: { ms: number; src: EtaSrc; city: string; standalone: boolean }) =>
  `/m/eta/${cityKey(o.city)}/${etaBucket(o.ms)}/${o.src}/${o.standalone ? "pwa" : "tab"}`;

// Every path etaPath can give: the empty files the build writes.
export const etaPaths = (): string[] =>
  CITY_KEYS.flatMap(c => BUCKETS.flatMap(b => SOURCES.flatMap(s => ["tab", "pwa"].map(m => `/m/eta/${c}/${b}/${s}/${m}`))));

export function makeEtaPing(o: {
  visible: () => boolean; send: (path: string) => void; now: () => number; standalone: () => boolean; host: () => string; city: () => string;
}): (src: EtaSrc) => void {
  let sent = false;
  return src => {
    if (sent || !o.visible()) return;   // hidden: the next refresh after the tab comes back tries again
    sent = true;
    if (o.host() !== "staseis.gr") return;
    try { o.send(etaPath({ ms: o.now(), src, city: o.city(), standalone: o.standalone() })); } catch { /* a blocked request changes nothing */ }
  };
}

// The address the page was opened on, before the app rewrites it: the card it names is a «link».
const landing = typeof location === "undefined" ? { path: "", search: "" } : { path: location.pathname, search: location.search };
const landedCity = () => landing.path.split("/")[1] ?? "";
export const landedOn = (cardId: string) => cardFromUrl(landing.path, landing.search)?.id === cardId;

// The page's own ping: ms since the navigation started, the city of the address it was opened on.
export const firstEta = makeEtaPing({
  visible: () => document.visibilityState === "visible",
  send: p => { void fetch(p, { keepalive: true, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" }).catch(() => {}); },
  now: () => performance.now(),
  standalone: () => matchMedia("(display-mode: standalone)").matches || !!(navigator as { standalone?: boolean }).standalone,
  host: () => location.hostname,
  city: landedCity,
});
