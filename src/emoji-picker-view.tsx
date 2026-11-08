import {
  Clock,
  Flag,
  Heart,
  Lightbulb,
  PawPrint,
  Plane,
  Search,
  Smile,
  Star,
  StarPlus,
  Trophy,
  Utensils,
  X,
} from "lucide-react-native";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  type FlatListProps,
  Image,
  type ImageStyle,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { applySkinTone, SKIN_TONE_MODIFIERS, SKIN_TONES, toVariantItem } from "./skin-tone";
import type { EmojiCategory, EmojiIcon, EmojiItem, SkinTone } from "./types";

// 列数はグリッドの幅から決める。iPad かどうかで決めると、iPhone Duo を開いた状態のような広い画面ですき間が空く
const MIN_GRID_COLUMNS = 8;
const TARGET_CELL_SIZE = 56;
const GRID_PADDING = 8;
const EMOJI_SIZE = 36;
const SKIN_TONE_ICON_SIZE = 20;

// 肌の色の選択肢として表示する ✋ (U+270B)
const skinToneSample = (tone: SkinTone) => (tone === 0 ? "\u270B" : `\u270B${SKIN_TONE_MODIFIERS[tone - 1]}`);

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  clock: Clock,
  smile: Smile,
  "paw-print": PawPrint,
  utensils: Utensils,
  trophy: Trophy,
  plane: Plane,
  lightbulb: Lightbulb,
  heart: Heart,
  flag: Flag,
  star: Star,
  "star-plus": StarPlus,
};

export type EmojiImageProps = {
  source: { uri: string };
  style: StyleProp<ImageStyle>;
};

export type EmojiPickerViewProps = {
  categories: EmojiCategory[];
  onEmojiSelected: (emoji: EmojiItem) => void;
  /** ローディング中は ActivityIndicator を表示する */
  isLoading?: boolean;
  /** スティッキーヘッダーの先頭に追加するコンテンツ（タイトル等） */
  listHeaderPrepend?: React.ReactNode;
  /**
   * 使用する FlatList コンポーネント。
   * デフォルトは RN の FlatList。BottomSheet 内では BottomSheetFlatList を渡すこと。
   *
   * アーキテクチャ上の注意:
   * - BottomSheetView でラップすると position:absolute で height が未定義になりスクロール不可
   * - 代わりに通常の View (flex:1) をルートにし、BottomSheetFlatList を直接子にする構成を取る
   * - こうすることで BottomSheetContent が計算した height が正しく伝播しスクロールが機能する
   */
  // biome-ignore lint/suspicious/noExplicitAny: FlatList と BottomSheetFlatList は互換プロップを持つが型定義が異なる
  FlatListComponent?: React.ComponentType<FlatListProps<EmojiItem> & any>;
  /**
   * Unicode 絵文字を画像で表示する場合の URL。undefined を返すとテキスト (システムフォント) で表示する。
   * Twemoji 形式のファイル名には `emojiToTwemojiKey` が使える。
   */
  getEmojiImageUrl?: (emoji: string) => string | undefined;
  /** 画像の描画に使うコンポーネント。既定は React Native の Image (contain) */
  ImageComponent?: React.ComponentType<EmojiImageProps>;
  /** 検索欄のプレースホルダー */
  searchPlaceholder?: string;
  /** 肌の色 (controlled)。省略時はコンポーネント内部で保持する */
  skinTone?: SkinTone;
  /** 肌の色の初期値 (uncontrolled) */
  defaultSkinTone?: SkinTone;
  onSkinToneChange?: (tone: SkinTone) => void;
  /** 検索欄に肌の色の切り替えボタンを表示する。既定では肌の色のバリエーションを持つ絵文字がある場合のみ表示する */
  showSkinToneSelector?: boolean;
};

function DefaultImage({ source, style }: EmojiImageProps) {
  return <Image source={source} style={style} resizeMode="contain" />;
}

type GlyphRenderer = (emoji: string, size: number) => React.ReactNode;

const EmojiItemCell = memo(
  ({
    item,
    skinTone,
    onPress,
    onLongPress,
    renderGlyph,
    ImageComponent,
    columns,
  }: {
    item: EmojiItem;
    skinTone: SkinTone;
    onPress: (item: EmojiItem) => void;
    onLongPress: (item: EmojiItem) => void;
    renderGlyph: GlyphRenderer;
    ImageComponent: React.ComponentType<EmojiImageProps>;
    columns: number;
  }) => {
    // 長押しでは肌の色を適用する前の絵文字からバリエーションを選ばせる
    const toned = useMemo(() => applySkinTone(item, skinTone), [item, skinTone]);
    const handlePress = useCallback(() => onPress(toned), [toned, onPress]);
    const handleLongPress = useCallback(() => onLongPress(item), [item, onLongPress]);

    return (
      <Pressable
        onPress={handlePress}
        onLongPress={item.variants ? handleLongPress : undefined}
        style={[styles.emojiCell, { width: `${100 / columns}%` }]}
      >
        {toned.type.kind === "unicode" ? (
          renderGlyph(toned.type.emoji, EMOJI_SIZE)
        ) : (
          <ImageComponent source={{ uri: toned.type.url }} style={styles.emojiImage} />
        )}
      </Pressable>
    );
  },
);
EmojiItemCell.displayName = "EmojiItemCell";

// 開いたときは、絵文字のある最初のカテゴリを選ぶ (先頭の「最近使用」などが空のことがある)
function defaultCategoryId(categories: EmojiCategory[]) {
  return (categories.find((c) => c.emojis.length > 0) ?? categories[0])?.id ?? "";
}

function CategoryButton({
  icon,
  isSelected,
  disabled,
  onPress,
}: {
  icon: EmojiIcon;
  isSelected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useColorScheme() ?? "light";
  const IconComponent = typeof icon === "string" ? ICON_MAP[icon] : icon;
  const activeColor = theme === "dark" ? "#0A84FF" : "#007AFF";
  const inactiveColor = "#8E8E93";

  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.categoryButton, disabled && { opacity: 0.5 }]}>
      {IconComponent && <IconComponent size={22} color={isSelected ? activeColor : inactiveColor} />}
      <View style={[styles.categoryIndicator, isSelected && { backgroundColor: activeColor }]} />
    </Pressable>
  );
}

export function EmojiPickerView({
  categories,
  onEmojiSelected,
  isLoading = false,
  listHeaderPrepend,
  FlatListComponent = FlatList,
  getEmojiImageUrl,
  ImageComponent = DefaultImage,
  searchPlaceholder = "Search emoji",
  skinTone: controlledSkinTone,
  defaultSkinTone = 0,
  onSkinToneChange,
  showSkinToneSelector: showSkinToneSelectorProp,
}: EmojiPickerViewProps) {
  const theme = useColorScheme() ?? "light";
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => defaultCategoryId(categories));
  const [searchText, setSearchText] = useState("");
  const [innerSkinTone, setInnerSkinTone] = useState<SkinTone>(defaultSkinTone);
  const [isSkinTonePickerOpen, setIsSkinTonePickerOpen] = useState(false);
  const [variantTarget, setVariantTarget] = useState<EmojiItem | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const gridColumns = Math.max(MIN_GRID_COLUMNS, Math.floor((gridWidth - GRID_PADDING * 2) / TARGET_CELL_SIZE));
  // セルは正方形 (aspectRatio: 1) なので、行の高さはセルの幅と同じ
  const rowHeight = gridWidth > 0 ? (gridWidth - GRID_PADDING * 2) / gridColumns : EMOJI_SIZE + 8;
  const skinTone = controlledSkinTone ?? innerSkinTone;
  const hasVariants = useMemo(() => categories.some((c) => c.emojis.some((e) => e.variants)), [categories]);
  const showSkinToneSelector = showSkinToneSelectorProp ?? hasVariants;

  useEffect(() => {
    if (categories.length === 0) return;
    const isValid = categories.some((c) => c.id === selectedCategoryId);
    if (!isValid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCategoryId(defaultCategoryId(categories));
    }
  }, [categories, selectedCategoryId]);
  const isSearching = searchText.trim().length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const query = searchText.toLowerCase().trim();
    const results: EmojiItem[] = [];
    // 同じ絵文字を複数のカテゴリ (「最近使用」など) に入れていても、結果には 1 つだけ出す
    const seen = new Set<string>();
    for (const category of categories) {
      for (const emoji of category.emojis) {
        if (seen.has(emoji.id)) continue;
        if (emoji.id.toLowerCase().includes(query) || emoji.keywords.some((k) => k.toLowerCase().includes(query))) {
          seen.add(emoji.id);
          results.push(emoji);
        }
      }
    }
    return results;
  }, [searchText, categories, isSearching]);

  const renderGlyph = useCallback<GlyphRenderer>(
    (emoji, size) => {
      const uri = getEmojiImageUrl?.(emoji);
      return uri ? (
        <ImageComponent source={{ uri }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ fontSize: size - 4, lineHeight: size + 4 }}>{emoji}</Text>
      );
    },
    [getEmojiImageUrl, ImageComponent],
  );

  const handleSkinToneChange = useCallback(
    (tone: SkinTone) => {
      setInnerSkinTone(tone);
      setIsSkinTonePickerOpen(false);
      onSkinToneChange?.(tone);
    },
    [onSkinToneChange],
  );

  const handleEmojiPress = useCallback(
    (emoji: EmojiItem) => {
      setVariantTarget(null);
      onEmojiSelected(emoji);
    },
    [onEmojiSelected],
  );

  const renderItem = useCallback(
    ({ item }: { item: EmojiItem }) => (
      <EmojiItemCell
        item={item}
        skinTone={skinTone}
        onPress={handleEmojiPress}
        onLongPress={setVariantTarget}
        renderGlyph={renderGlyph}
        ImageComponent={ImageComponent}
        columns={gridColumns}
      />
    ),
    [skinTone, handleEmojiPress, renderGlyph, ImageComponent, gridColumns],
  );

  const keyExtractor = useCallback((item: EmojiItem, index: number) => `${item.id}-${index}`, []);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? categories[0];
  const displayEmojis = isSearching ? searchResults : (selectedCategory?.emojis ?? []);

  const bgColor = theme === "dark" ? "#1C1C1E" : "#FFFFFF";
  const panelColor = theme === "dark" ? "#2C2C2E" : "#F2F2F7";
  const dividerColor = theme === "dark" ? "#38383A" : "#E5E5EA";

  return (
    // 通常の View (flex:1) をルートにすることで、BottomSheetContent が計算した
    // height を正しく受け取れる。BottomSheetView は position:absolute のため不可。
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* ===== スティッキーヘッダー ===== */}
      <View style={{ backgroundColor: bgColor }}>
        {/* タイトル等、呼び出し元から渡されるコンテンツ */}
        {listHeaderPrepend}

        {/* 検索バー */}
        <View style={[styles.searchBar, { backgroundColor: panelColor }]}>
          <Search size={16} color="#8E8E93" />
          <TextInput
            style={[styles.searchInput, { color: theme === "dark" ? "#FFFFFF" : "#000000" }]}
            placeholder={searchPlaceholder}
            placeholderTextColor="#8E8E93"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText("")}>
              <X size={16} color="#8E8E93" />
            </Pressable>
          )}
          {showSkinToneSelector && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skin tone"
              onPress={() => setIsSkinTonePickerOpen((open) => !open)}
              hitSlop={8}
            >
              {renderGlyph(skinToneSample(skinTone), SKIN_TONE_ICON_SIZE)}
            </Pressable>
          )}
        </View>

        {/* 肌の色の選択 */}
        {showSkinToneSelector && isSkinTonePickerOpen && (
          <View style={[styles.skinTonePicker, { backgroundColor: panelColor }]}>
            {SKIN_TONES.map((tone) => (
              <Pressable
                key={tone}
                accessibilityRole="button"
                accessibilityState={{ selected: tone === skinTone }}
                onPress={() => handleSkinToneChange(tone)}
                style={[styles.skinToneOption, tone === skinTone && { backgroundColor: dividerColor }]}
              >
                {renderGlyph(skinToneSample(tone), SKIN_TONE_ICON_SIZE)}
              </Pressable>
            ))}
          </View>
        )}

        {/* カテゴリタブ (水平スクロールのため通常の ScrollView で問題なし) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryBar}
          contentContainerStyle={styles.categoryBarContent}
        >
          {categories.map((category) => (
            <CategoryButton
              key={category.id}
              icon={category.icon}
              isSelected={selectedCategoryId === category.id}
              disabled={isSearching}
              onPress={() => setSelectedCategoryId(category.id)}
            />
          ))}
        </ScrollView>

        <View style={[styles.divider, { backgroundColor: dividerColor }]} />
      </View>

      {/* ===== スクロール領域 ===== */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
        </View>
      ) : !isSearching && displayEmojis.length === 0 && selectedCategory?.emptyMessage ? (
        <View style={styles.list}>
          <Text style={styles.message}>{selectedCategory.emptyMessage}</Text>
        </View>
      ) : (
        <FlatListComponent
          // FlatList は numColumns を実行中に変えられないので、列数が変わったら作り直す
          key={gridColumns}
          style={styles.list}
          onLayout={(e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width)}
          data={displayEmojis}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={gridColumns}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          // numColumns > 1 のとき、index は絵文字ではなく行の番号になる
          getItemLayout={(_: unknown, index: number) => ({
            length: rowHeight,
            offset: GRID_PADDING + rowHeight * index,
            index,
          })}
          initialNumToRender={40}
          maxToRenderPerBatch={40}
          windowSize={5}
          removeClippedSubviews
        />
      )}

      {/* 長押しした絵文字の肌の色バリエーション */}
      {variantTarget && (
        <Pressable style={styles.variantBackdrop} onPress={() => setVariantTarget(null)}>
          <View style={[styles.variantPanel, { backgroundColor: panelColor }]}>
            {[variantTarget.id, ...(variantTarget.variants ?? [])].map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => handleEmojiPress(toVariantItem(variantTarget, emoji))}
                style={styles.variantCell}
              >
                {renderGlyph(emoji, EMOJI_SIZE)}
              </Pressable>
            ))}
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  skinTonePicker: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 4,
    borderRadius: 10,
  },
  skinToneOption: {
    padding: 6,
    borderRadius: 8,
  },
  categoryBar: {
    maxHeight: 48,
    flexShrink: 0,
    flexGrow: 0,
  },
  categoryBarContent: {
    paddingHorizontal: 12,
    gap: 12,
    alignItems: "center",
  },
  categoryButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 40,
    gap: 4,
  },
  categoryIndicator: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: "transparent",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  list: {
    flex: 1,
  },
  gridContent: {
    padding: GRID_PADDING,
  },
  message: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    textAlign: "center",
    fontSize: 14,
    color: "#8E8E93",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gridRow: {
    justifyContent: "flex-start",
  },
  emojiCell: {
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiImage: {
    width: EMOJI_SIZE,
    height: EMOJI_SIZE,
  },
  variantBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "center",
    padding: 12,
  },
  variantPanel: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    padding: 8,
    borderRadius: 12,
  },
  variantCell: {
    width: EMOJI_SIZE + 12,
    height: EMOJI_SIZE + 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
