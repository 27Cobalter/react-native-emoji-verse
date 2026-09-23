import { useMemo } from "react";
import { type BuildCategoriesOptions, buildCategories } from "./categories";
import type { EmojiCategory, EmojiData } from "./types";

/**
 * マスターデータからカテゴリ一覧を組み立てる。data が未読み込み (undefined) の間は空配列を返す。
 * options はインラインで渡しても内容が変わらない限り再構築しない。
 */
export function useEmojiCategories(
  data: EmojiData | undefined,
  options: BuildCategoriesOptions = {},
): EmojiCategory[] {
  const optionsKey = JSON.stringify([options.titles, options.exclude]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: optionsKey で options の内容変化を検知する
  return useMemo(() => (data ? buildCategories(data, options) : []), [data, optionsKey]);
}
