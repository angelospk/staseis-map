import { describe, expect, it } from "vitest";
import { DARK_PAINT, baseWatch, boldFont, lightenDark, styleUrl } from "../src/lib/map/basemap";
import darkLayers from "../src/fixtures/openfreemap-dark-layers.json";

// A stand-in for the MapLibre map: the style's layer ids, and the paint calls it receives.
function fakeMap(ids: string[]) {
  const calls: [string, string, unknown][] = [];
  return {
    calls,
    getStyle: () => ({ layers: ids.map(id => ({ id })) }),
    setPaintProperty: (id: string, prop: string, value: unknown) => void calls.push([id, prop, value]),
  };
}

describe("lightenDark", () => {
  it("paints every listed layer the style has", () => {
    const m = fakeMap(["background", "highway_minor", "place_city"]);
    lightenDark(m);
    expect(m.calls).toContainEqual(["background", "background-color", DARK_PAINT.background["background-color"]]);
    expect(m.calls).toContainEqual(["highway_minor", "line-color", DARK_PAINT.highway_minor["line-color"]]);
    expect(m.calls.filter(([id, p]) => id === "place_city" && !p.endsWith("-transition")).map(([, p]) => p)).toEqual(["text-color", "text-halo-color"]);
  });

  it("leaves layers it does not know, and skips listed layers the style lacks", () => {
    const m = fakeMap(["speed", "building"]);
    lightenDark(m);
    expect(m.calls.every(([id]) => id === "building")).toBe(true);
    expect(m.calls).toContainEqual(["building", "fill-color-transition", { duration: 0, delay: 0 }]);
    expect(m.calls.length).toBeGreaterThan(0);
  });

  // The layer ids of tiles.openfreemap.org/styles/dark (fetched 2026-10-26). If OpenFreeMap renames one, refresh the
  // fixture and this test names the paint that no longer applies.
  it("knows only layers of OpenFreeMap's dark style", () => {
    expect(Object.keys(DARK_PAINT).filter(id => !darkLayers.includes(id))).toEqual([]);
    expect(darkLayers.some(id => id.startsWith("place_"))).toBe(true);
  });

  it("lightens the near-black colours of OpenFreeMap's dark style", () => {
    expect(DARK_PAINT.background["background-color"]).not.toBe("rgb(12,12,12)");
    expect(DARK_PAINT.highway_minor["line-color"]).not.toBe("#181818");
  });
});

describe("styleUrl", () => {
  it("OpenFreeMap first, VersaTiles as the fallback, light and dark", () => {
    expect(styleUrl("openfreemap", false)).toBe("https://tiles.openfreemap.org/styles/positron");
    expect(styleUrl("openfreemap", true)).toBe("https://tiles.openfreemap.org/styles/dark");
    expect(styleUrl("versatiles", false)).toBe("https://tiles.versatiles.org/assets/styles/gray/style.json");
    expect(styleUrl("versatiles", true)).toBe("https://tiles.versatiles.org/assets/styles/colorful-dark/style.json");
  });
});

// 2026-11-25: EasyPrivacy (Brave Shields, uBlock Origin) blocked ||tiles.openfreemap.org/planet: the style loaded,
// every tile failed, the map showed our stops on a blank ground.
describe("baseWatch", () => {
  it("fails on an error of a base-map source before any of its tiles loaded", () => {
    const w = baseWatch(["openmaptiles"]);
    expect(w.failed({ sourceId: "openmaptiles" })).toBe(true);
  });

  it("ignores errors of our own sources and errors with no source", () => {
    const w = baseWatch(["openmaptiles"]);
    expect(w.failed({ sourceId: "stops" })).toBe(false);
    expect(w.failed({})).toBe(false);
  });

  it("keeps the provider once one of its tiles loaded (a lone tile error later is not a blocked host)", () => {
    const w = baseWatch(["openmaptiles"]);
    w.loaded({ sourceId: "stops", tile: {} });
    expect(w.failed({ sourceId: "openmaptiles" })).toBe(true);
    w.loaded({ sourceId: "openmaptiles" });   // the source's TileJSON, not a tile
    expect(w.failed({ sourceId: "openmaptiles" })).toBe(true);
    w.loaded({ sourceId: "openmaptiles", tile: {} });
    expect(w.failed({ sourceId: "openmaptiles" })).toBe(false);
  });
});

describe("boldFont", () => {
  it("names the bold font the way each host's glyph server does", () => {
    expect(boldFont("openfreemap")).toEqual(["Noto Sans Bold"]);
    expect(boldFont("versatiles")).toEqual(["noto_sans_bold"]);   // "Noto Sans Bold" is a 404 there
  });
});
