import { describe, expect, it } from "vitest";
import { etaBucket, etaPath, etaPaths, makeEtaPing } from "../src/lib/etaPing";

describe("etaBucket", () => {
  it("puts the time to the first arrival time into four coarse buckets", () => {
    expect(etaBucket(0)).toBe("lt5");
    expect(etaBucket(4999)).toBe("lt5");
    expect(etaBucket(5000)).toBe("5-15");
    expect(etaBucket(14999)).toBe("5-15");
    expect(etaBucket(15000)).toBe("15-30");
    expect(etaBucket(29999)).toBe("15-30");
    expect(etaBucket(30000)).toBe("gt30");
    expect(etaBucket(10 * 60_000)).toBe("gt30");
  });
  it("a broken clock counts as the slowest bucket, not the fastest", () => {
    expect(etaBucket(Number.NaN)).toBe("gt30");
    expect(etaBucket(-5)).toBe("gt30");
  });
});

describe("etaPath", () => {
  it("is a path only: city, bucket, source, tab or installed app; no id, no query", () => {
    expect(etaPath({ ms: 8000, src: "near", city: "athens", standalone: false })).toBe("/m/eta/athens/5-15/near/tab");
    expect(etaPath({ ms: 2000, src: "fav", city: "patras", standalone: true })).toBe("/m/eta/other/lt5/fav/pwa");
    expect(etaPath({ ms: 2000, src: "near", city: "", standalone: false })).toBe("/m/eta/root/lt5/near/tab");
    expect(etaPath({ ms: 40000, src: "link", city: "thessaloniki", standalone: false })).toBe("/m/eta/thessaloniki/gt30/link/tab");
  });
});

describe("etaPaths", () => {
  it("lists every path a page can ping, so the build can put an empty file at each (a GET then answers 200)", () => {
    const all = new Set(etaPaths());
    expect(all.size).toBe(4 * 4 * 4 * 2);
    for (const city of ["athens", "thessaloniki", "patras", ""])
      for (const ms of [0, 6000, 20000, 60000])
        for (const src of ["near", "fav", "link", "card"] as const)
          for (const standalone of [false, true]) expect(all.has(etaPath({ ms, src, city, standalone }))).toBe(true);
  });
});

describe("makeEtaPing", () => {
  const setup = (o: { host?: string; standalone?: boolean; now?: number; visible?: () => boolean } = {}) => {
    const sent: string[] = [];
    const ping = makeEtaPing({
      visible: o.visible ?? (() => true),
      send: p => sent.push(p),
      now: () => o.now ?? 7000,
      standalone: () => o.standalone ?? false,
      host: () => o.host ?? "staseis.gr",
      city: () => "athens",
    });
    return { sent, ping };
  };
  it("sends once per page load: the first arrival time shown, from wherever it was shown", () => {
    const { sent, ping } = setup();
    ping("near");
    ping("fav");
    ping("near");
    expect(sent).toEqual(["/m/eta/athens/5-15/near/tab"]);
  });
  it("marks a launch from the home screen", () => {
    const { sent, ping } = setup({ standalone: true, now: 3000 });
    ping("fav");
    expect(sent).toEqual(["/m/eta/athens/lt5/fav/pwa"]);
  });
  it("sends nothing outside staseis.gr (dev server, previews, tests)", () => {
    const { sent, ping } = setup({ host: "localhost" });
    ping("near");
    expect(sent).toEqual([]);
  });
  it("a hidden tab does not count: the time is taken when the arrival is first seen", () => {
    let shown = false;
    const { sent, ping } = setup({ visible: () => shown });
    ping("near");
    expect(sent).toEqual([]);
    shown = true;
    ping("near");
    expect(sent).toEqual(["/m/eta/athens/5-15/near/tab"]);
  });
  it("a failing sender never throws into the page", () => {
    const ping = makeEtaPing({ visible: () => true, send: () => { throw new Error("blocked"); }, now: () => 1, standalone: () => false, host: () => "staseis.gr", city: () => "athens" });
    expect(() => ping("near")).not.toThrow();
  });
});
