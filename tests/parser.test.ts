import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseEmojiTest } from "../src/parser";
import { UNICODE_VERSIONS } from "../src/versions";

const SAMPLE = `# Version: 99.0
# group: Smileys & Emotion
1F600 ; fully-qualified # 😀 E1.0 grinning face
263A FE0F ; fully-qualified # ☺️ E0.6 smiling face
263A ; unqualified # ☺ E0.6 smiling face
# group: People & Body
1F44B ; fully-qualified # 👋 E0.6 waving hand
1F44B 1F3FB ; fully-qualified # 👋🏻 E1.0 waving hand: light skin tone
1F575 FE0F ; fully-qualified # 🕵️ E0.7 detective
1F575 1F3FF ; fully-qualified # 🕵🏿 E2.0 detective: dark skin tone
1F91D ; fully-qualified # 🤝 E3.0 handshake
1F91D 1F3FB ; fully-qualified # 🤝🏻 E14.0 handshake: light skin tone
1FAF1 1F3FB 200D 1FAF2 1F3FF ; fully-qualified # 🫱🏻‍🫲🏿 E14.0 handshake: light skin tone, dark skin tone
# group: Component
1F3FB ; component # 🏻 E1.0 light skin tone
`;

describe("parseEmojiTest", () => {
  const data = parseEmojiTest(SAMPLE);

  it("バージョンとグループを読み取り、Component グループは除外する", () => {
    expect(data.version).toBe("99.0");
    expect(data.groups.map(([g]) => g)).toEqual(["Smileys & Emotion", "People & Body"]);
  });

  it("fully-qualified のみを対象とする", () => {
    expect(data.groups[0][1]).toEqual([
      ["😀", "grinning face"],
      ["☺️", "smiling face"],
    ]);
  });

  it("肌の色の付いた絵文字は基本の絵文字の variants にまとめる (FE0F の有無・混合トーンを含む)", () => {
    expect(data.groups[1][1]).toEqual([
      ["👋", "waving hand", ["👋🏻"]],
      ["🕵️", "detective", ["🕵🏿"]],
      ["🤝", "handshake", ["🤝🏻", "🫱🏻‍🫲🏿"]],
    ]);
  });

  it("基本の絵文字が見つからない場合はエラーにする", () => {
    expect(() => parseEmojiTest("# Version: 1.0\n# group: A\n1F44B 1F3FB ; fully-qualified # 👋🏻 E1.0 waving hand: light skin tone")).toThrow();
  });

  it.each(UNICODE_VERSIONS)("%s の fully-qualified 絵文字を欠落・重複なく取り込む", (version) => {
    const content = readFileSync(new URL(`../src/unicode/${version}/emoji-test.txt`, import.meta.url), "utf8");
    const parsed = parseEmojiTest(content);
    const emojis = parsed.groups.flatMap(([, e]) => e).flatMap(([emoji, , variants]) => [emoji, ...(variants ?? [])]);

    // Component グループ以外の fully-qualified 行を数える
    const expected = content
      .split("# group: ")
      .filter((section) => !section.startsWith("Component"))
      .flatMap((section) => section.match(/^[0-9A-F ]+;\s*fully-qualified/gm) ?? []);

    expect(parsed.version).toBe(version);
    expect(emojis).toHaveLength(expected.length);
    expect(new Set(emojis).size).toBe(emojis.length);
  });
});
