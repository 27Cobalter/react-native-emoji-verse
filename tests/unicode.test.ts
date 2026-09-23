import { describe, expect, it } from "vitest";
import { emojiToCodepoints, emojiToTwemojiKey } from "../src/unicode";

describe("emojiToCodepoints", () => {
  it("単一コードポイントの絵文字を16進数に変換する", () => {
    expect(emojiToCodepoints("😀")).toBe("1f600");
  });

  it("複合絵文字 (ZWJ シーケンス) は - 区切りで連結する", () => {
    expect(emojiToCodepoints("👨‍👩‍👧‍👦")).toBe("1f468-200d-1f469-200d-1f467-200d-1f466");
  });

  it("4桁未満のコードポイントは0埋めする", () => {
    expect(emojiToCodepoints("A")).toBe("0041");
  });
});

describe("emojiToTwemojiKey", () => {
  it("ZWJ の直前の FE0F は保持し、それ以外は除去する", () => {
    expect(emojiToTwemojiKey("❤️‍🔥")).toBe("2764-fe0f-200d-1f525");
    expect(emojiToTwemojiKey("❤️")).toBe("2764");
  });

  it("skin tone modifier を含む絵文字も変換できる", () => {
    expect(emojiToTwemojiKey("👍🏽")).toBe("1f44d-1f3fd");
  });
});
