// 依存を持たせないこと: scripts/generate-data.ts から Node の型ストリップで直接読み込まれる
import type { EmojiData, RawEmoji } from "./types";

const SKIN_TONE_MODIFIERS = /[\u{1F3FB}-\u{1F3FF}]/gu;
const SKIN_TONE_NAMES = new Set([
  "light skin tone",
  "medium-light skin tone",
  "medium skin tone",
  "medium-dark skin tone",
  "dark skin tone",
]);

type Entry = { emoji: string; name: string; variants: string[] };

// 肌の色の modifier と FE0F を取り除いた比較用のキー
function codepointKey(emoji: string): string {
  return emoji.replace(SKIN_TONE_MODIFIERS, "").replace(/️/g, "");
}

// "handshake: light skin tone, dark skin tone" -> "handshake"
function nameKey(name: string): string {
  const [base, attributes] = name.split(": ");
  if (!attributes) return base;
  const rest = attributes.split(", ").filter((a) => !SKIN_TONE_NAMES.has(a));
  return rest.length > 0 ? `${base}: ${rest.join(", ")}` : base;
}

/**
 * Unicode の emoji-test.txt をパースする。
 * fully-qualified のみを対象とし、肌の色の modifier を含む絵文字は基本となる絵文字の variants にまとめる。
 * Component グループ (肌の色・髪型の部品) は除外する。
 */
export function parseEmojiTest(content: string): EmojiData {
  let version = "";
  const groups: [string, Entry[]][] = [];
  const byCodepoint = new Map<string, Entry>();
  const byName = new Map<string, Entry>();
  let current: Entry[] | null = null;

  for (const line of content.split("\n")) {
    if (line.startsWith("# Version:")) {
      version = line.slice("# Version:".length).trim();
      continue;
    }
    if (line.startsWith("# group:")) {
      const name = line.slice("# group:".length).trim();
      current = name === "Component" ? null : [];
      if (current) groups.push([name, current]);
      continue;
    }
    if (!current || line.startsWith("#")) continue;

    const match = line.match(/^[0-9A-F ]+;\s*fully-qualified\s*#\s*(\S+)\s+E\d+\.\d+\s+(.+)$/);
    if (!match) continue;
    const [, emoji, name] = match;

    if (emoji.match(SKIN_TONE_MODIFIERS)) {
      // 🫱🏻‍🫲🏿 (handshake) や 🧑🏻‍❤️‍💋‍🧑🏼 (kiss: person, person) のように、
      // 混合トーンは基本絵文字とコードポイントが異なるため名前でも照合する
      const base =
        byCodepoint.get(codepointKey(emoji)) ?? byName.get(nameKey(name)) ?? byName.get(name.split(": ")[0]);
      if (!base) throw new Error(`No base emoji found for ${emoji} (${name})`);
      base.variants.push(emoji);
      continue;
    }

    const entry: Entry = { emoji, name, variants: [] };
    current.push(entry);
    byCodepoint.set(codepointKey(emoji), entry);
    byName.set(name, entry);
  }

  if (!version) throw new Error("Version header not found");

  return {
    version,
    groups: groups.map(([name, entries]) => [
      name,
      entries.map((e): RawEmoji => (e.variants.length > 0 ? [e.emoji, e.name, e.variants] : [e.emoji, e.name])),
    ]),
  };
}
