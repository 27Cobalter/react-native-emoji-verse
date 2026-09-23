import { describe, expect, it } from "vitest";
import { buildCategories, CATEGORY_TITLES_JA } from "../src/categories";
import { loadEmojiData } from "../src/loader";
import { LATEST_UNICODE_VERSION, UNICODE_VERSIONS, type UnicodeVersion } from "../src/versions";

const has = (data: Awaited<ReturnType<typeof loadEmojiData>>, emoji: string) =>
  data.groups.some(([, emojis]) => emojis.some(([e]) => e === emoji));

describe("loadEmojiData", () => {
  it.each(UNICODE_VERSIONS)("%s のデータを読み込める", async (version) => {
    expect((await loadEmojiData(version)).version).toBe(version);
  });

  it("既定は最新バージョンで、同じバージョンは同じオブジェクトを返す", async () => {
    const latest = await loadEmojiData();
    expect(latest.version).toBe(LATEST_UNICODE_VERSION);
    expect(await loadEmojiData(LATEST_UNICODE_VERSION)).toBe(latest);
  });

  it("バージョンに応じて収録される絵文字が変わる", async () => {
    // 🙂‍↔️ head shaking horizontally (E15.1), 🫩 face with bags under eyes (E16.0)
    const [v15, v151, v16] = await Promise.all([loadEmojiData("15.0"), loadEmojiData("15.1"), loadEmojiData("16.0")]);
    expect(has(v15, "🙂‍↔️")).toBe(false);
    expect(has(v151, "🙂‍↔️")).toBe(true);
    expect(has(v151, "🫩")).toBe(false);
    expect(has(v16, "🫩")).toBe(true);
  });

  it("未対応のバージョンは reject する", async () => {
    await expect(loadEmojiData("1.0" as UnicodeVersion)).rejects.toThrow("Unsupported");
  });
});

describe("buildCategories", () => {
  it("Unicode のグループをカテゴリにまとめ、肌の色のバリエーションを保持する", async () => {
    const categories = buildCategories(await loadEmojiData("16.0"));
    expect(categories.map((c) => c.id)).toEqual([
      "smileys_and_people",
      "animals_and_nature",
      "food_and_drink",
      "activity",
      "travel_and_places",
      "objects",
      "symbols",
      "flags",
    ]);
    expect(categories[0].title).toBe("Smileys & People");

    const wave = categories[0].emojis.find((e) => e.id === "👋");
    expect(wave).toMatchObject({ type: { kind: "unicode", emoji: "👋" }, keywords: ["waving hand"] });
    expect(wave?.variants).toHaveLength(5);
    // 肌の色付きの絵文字は単独のセルとしては並ばない
    expect(categories[0].emojis.some((e) => e.id === "👋🏻")).toBe(false);
  });

  it("タイトルの差し替えとカテゴリの除外ができる", async () => {
    const categories = buildCategories(await loadEmojiData("16.0"), {
      titles: CATEGORY_TITLES_JA,
      exclude: ["flags", "smileys_and_people"],
    });
    expect(categories[0]).toMatchObject({ id: "animals_and_nature", title: "動物と自然" });
    expect(categories.some((c) => c.id === "flags" || c.id === "smileys_and_people")).toBe(false);
  });
});
