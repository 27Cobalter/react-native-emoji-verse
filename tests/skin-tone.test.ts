import { describe, expect, it } from "vitest";
import { applySkinTone, findSkinToneVariant } from "../src/skin-tone";
import type { EmojiItem } from "../src/types";

const handshake = ["🤝🏻", "🤝🏼", "🤝🏽", "🤝🏾", "🤝🏿", "🫱🏻‍🫲🏿", "🫱🏿‍🫲🏻"];
const holdingHands = ["🧑🏻‍🤝‍🧑🏻", "🧑🏻‍🤝‍🧑🏿", "🧑🏿‍🤝‍🧑🏻", "🧑🏿‍🤝‍🧑🏿"];

describe("findSkinToneVariant", () => {
  it("指定なし (0) やバリエーションの無い絵文字は undefined", () => {
    expect(findSkinToneVariant(handshake, 0)).toBeUndefined();
    expect(findSkinToneVariant(undefined, 3)).toBeUndefined();
  });

  it("単一の肌の色で統一されたバリエーションを返す", () => {
    expect(findSkinToneVariant(handshake, 1)).toBe("🤝🏻");
    expect(findSkinToneVariant(handshake, 5)).toBe("🤝🏿");
  });

  it("複数人の絵文字では全員が同じ肌の色のものを選び、混合トーンは選ばない", () => {
    expect(findSkinToneVariant(holdingHands, 5)).toBe("🧑🏿‍🤝‍🧑🏿");
    expect(findSkinToneVariant(holdingHands, 3)).toBeUndefined();
  });
});

describe("applySkinTone", () => {
  const item: EmojiItem = { id: "🤝", type: { kind: "unicode", emoji: "🤝" }, keywords: ["handshake"], variants: handshake };

  it("肌の色を適用した EmojiItem を返す", () => {
    expect(applySkinTone(item, 3)).toEqual({ id: "🤝🏽", type: { kind: "unicode", emoji: "🤝🏽" }, keywords: ["handshake"] });
  });

  it("指定なし・URL 絵文字はそのまま返す", () => {
    expect(applySkinTone(item, 0)).toBe(item);
    const url: EmojiItem = { id: ":a:", type: { kind: "url", url: "https://example.com/a.png" }, keywords: [] };
    expect(applySkinTone(url, 2)).toBe(url);
  });
});
