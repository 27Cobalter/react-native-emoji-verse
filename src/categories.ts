import type { EmojiCategory, EmojiCategoryType, EmojiData, EmojiItem } from "./types";

export const CATEGORY_ORDER: readonly EmojiCategoryType[] = [
  "smileys_and_people",
  "animals_and_nature",
  "food_and_drink",
  "activity",
  "travel_and_places",
  "objects",
  "symbols",
  "flags",
];

export const CATEGORY_ICONS: Record<EmojiCategoryType, string> = {
  smileys_and_people: "smile",
  animals_and_nature: "paw-print",
  food_and_drink: "utensils",
  activity: "trophy",
  travel_and_places: "plane",
  objects: "lightbulb",
  symbols: "heart",
  flags: "flag",
};

export const CATEGORY_TITLES_EN: Record<EmojiCategoryType, string> = {
  smileys_and_people: "Smileys & People",
  animals_and_nature: "Animals & Nature",
  food_and_drink: "Food & Drink",
  activity: "Activity",
  travel_and_places: "Travel & Places",
  objects: "Objects",
  symbols: "Symbols",
  flags: "Flags",
};

export const CATEGORY_TITLES_JA: Record<EmojiCategoryType, string> = {
  smileys_and_people: "スマイリーと人々",
  animals_and_nature: "動物と自然",
  food_and_drink: "食べ物と飲み物",
  activity: "アクティビティ",
  travel_and_places: "旅行と場所",
  objects: "物",
  symbols: "記号",
  flags: "旗",
};

const GROUP_TO_CATEGORY: Record<string, EmojiCategoryType> = {
  "Smileys & Emotion": "smileys_and_people",
  "People & Body": "smileys_and_people",
  "Animals & Nature": "animals_and_nature",
  "Food & Drink": "food_and_drink",
  Activities: "activity",
  "Travel & Places": "travel_and_places",
  Objects: "objects",
  Symbols: "symbols",
  Flags: "flags",
};

export type BuildCategoriesOptions = {
  /** カテゴリ名。既定は英語 */
  titles?: Partial<Record<EmojiCategoryType, string>>;
  /** 除外するカテゴリ */
  exclude?: readonly EmojiCategoryType[];
};

export function buildCategories(data: EmojiData, options: BuildCategoriesOptions = {}): EmojiCategory[] {
  const map = new Map<EmojiCategoryType, EmojiItem[]>();

  for (const [group, emojis] of data.groups) {
    const id = GROUP_TO_CATEGORY[group];
    if (!id || options.exclude?.includes(id)) continue;

    const items = map.get(id) ?? [];
    for (const [emoji, name, variants] of emojis) {
      items.push({ id: emoji, type: { kind: "unicode", emoji }, keywords: [name], variants });
    }
    map.set(id, items);
  }

  return CATEGORY_ORDER.filter((id) => map.has(id)).map((id) => ({
    id,
    title: options.titles?.[id] ?? CATEGORY_TITLES_EN[id],
    icon: CATEGORY_ICONS[id],
    emojis: map.get(id)!,
  }));
}
