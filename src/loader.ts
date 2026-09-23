// 全バージョンのデータを動的に読み込むため、メインのエントリポイントとは分けて公開する
import { useEffect, useState } from "react";
import { loaders } from "./loaders";
import type { EmojiData } from "./types";
import { LATEST_UNICODE_VERSION, type UnicodeVersion } from "./versions";

const pending = new Map<UnicodeVersion, Promise<EmojiData>>();
const loaded = new Map<UnicodeVersion, EmojiData>();

/** 指定バージョンのマスターデータを読み込む。複数回呼んでも読み込みは一度だけ */
export function loadEmojiData(version: UnicodeVersion = LATEST_UNICODE_VERSION): Promise<EmojiData> {
  const loader = loaders[version];
  if (!loader) return Promise.reject(new Error(`Unsupported Unicode version: ${version}`));

  let promise = pending.get(version);
  if (!promise) {
    promise = loader().then((m) => {
      loaded.set(version, m.default);
      return m.default;
    });
    // 失敗時は破棄して次回の呼び出しで再試行できるようにする
    promise.catch(() => pending.delete(version));
    pending.set(version, promise);
  }
  return promise;
}

/** 指定バージョンのマスターデータを読み込む hook。結果は useEmojiCategories に渡す */
export function useEmojiData(version: UnicodeVersion = LATEST_UNICODE_VERSION): {
  data: EmojiData | undefined;
  isLoading: boolean;
  error: unknown;
} {
  const [state, setState] = useState<{ version: UnicodeVersion; data?: EmojiData; error?: unknown }>({
    version,
    data: loaded.get(version),
  });

  // version が変わったら同期的にリセットする
  let current = state;
  if (state.version !== version) {
    current = { version, data: loaded.get(version) };
    setState(current);
  }

  useEffect(() => {
    if (loaded.has(version)) return;

    let cancelled = false;
    loadEmojiData(version).then(
      (data) => !cancelled && setState({ version, data }),
      (error: unknown) => !cancelled && setState({ version, error }),
    );
    return () => {
      cancelled = true;
    };
  }, [version]);

  return { data: current.data, isLoading: !current.data && !current.error, error: current.error };
}
