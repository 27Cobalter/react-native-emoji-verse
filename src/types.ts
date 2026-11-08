import type { ComponentType } from "react";

/** [絵文字, CLDR short name, 肌の色バリエーション (ファイル記載順)] */
export type RawEmoji = readonly [emoji: string, name: string, variants?: readonly string[]];

/** emoji-test.txt から生成されるバージョンごとのマスターデータ */
export type EmojiData = {
  version: string;
  groups: readonly (readonly [group: string, emojis: readonly RawEmoji[]])[];
};

/** 0 = 指定なし (黄色), 1〜5 = Fitzpatrick type 1-2 〜 type 6 */
export type SkinTone = 0 | 1 | 2 | 3 | 4 | 5;

export type EmojiItemType =
  | { kind: "unicode"; emoji: string }
  | { kind: "url"; url: string; customReactionId?: string };

export type EmojiItem = {
  id: string;
  type: EmojiItemType;
  keywords: string[];
  /** 肌の色のバリエーション (混合トーンを含む) */
  variants?: readonly string[];
};

export type EmojiIcon = string | ComponentType<{ size: number; color: string }>;

export type EmojiCategory = {
  id: string;
  title: string;
  /** 組み込みアイコン名 (lucide) またはアイコンコンポーネント */
  icon: EmojiIcon;
  emojis: EmojiItem[];
  /** 絵文字が 1 つもないときに表示する文言 */
  emptyMessage?: string;
};

export type EmojiCategoryType =
  | "smileys_and_people"
  | "animals_and_nature"
  | "food_and_drink"
  | "activity"
  | "travel_and_places"
  | "objects"
  | "symbols"
  | "flags";
