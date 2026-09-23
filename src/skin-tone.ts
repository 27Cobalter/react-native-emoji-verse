import type { EmojiItem, SkinTone } from "./types";

/** SkinTone 1〜5 に対応する Fitzpatrick modifier */
export const SKIN_TONE_MODIFIERS = ["\u{1F3FB}", "\u{1F3FC}", "\u{1F3FD}", "\u{1F3FE}", "\u{1F3FF}"] as const;

export const SKIN_TONES: readonly SkinTone[] = [0, 1, 2, 3, 4, 5];

/** 全ての人物が同じ肌の色で表現されるバリエーションを返す。対応しない絵文字は undefined */
export function findSkinToneVariant(variants: readonly string[] | undefined, tone: SkinTone): string | undefined {
  if (tone === 0 || !variants) return undefined;
  const modifier = SKIN_TONE_MODIFIERS[tone - 1];
  return variants.find((v) => v.includes(modifier) && !SKIN_TONE_MODIFIERS.some((m) => m !== modifier && v.includes(m)));
}

/** 表示・選択用に、指定の肌の色を適用した EmojiItem を返す */
export function applySkinTone(item: EmojiItem, tone: SkinTone): EmojiItem {
  if (item.type.kind !== "unicode") return item;
  const variant = findSkinToneVariant(item.variants, tone);
  return variant ? toVariantItem(item, variant) : item;
}

export function toVariantItem(item: EmojiItem, emoji: string): EmojiItem {
  return { id: emoji, type: { kind: "unicode", emoji }, keywords: item.keywords };
}
