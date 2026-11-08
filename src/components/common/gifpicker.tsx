import { Image as ExpoImage } from "expo-image";
import { Search, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    BackHandler,
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/themecontext";
import { haptics } from "@/lib/haptics";
import {
    GIF_CATEGORIES,
    GifItem,
    fetchTrendingGifs,
    searchGifs,
} from "@/services/gifService";
import { themeColors } from "@/theme/colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface GifPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (gif: GifItem) => void;
}

export default function GifPicker({ visible, onClose, onSelect }: GifPickerProps) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const insets = useSafeAreaInsets();

    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("trending");
    const [gifs, setGifs] = useState<GifItem[]>([]);
    const [loading, setLoading] = useState(true);

    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Android back handler
    useEffect(() => {
        if (!visible) return;
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
            onClose();
            return true;
        });
        return () => sub.remove();
    }, [visible, onClose]);

    // Initial load & category changes
    useEffect(() => {
        if (!visible) return;

        let isCurrent = true;
        const category = GIF_CATEGORIES.find((c) => c.id === activeCategory);
        const query = category?.query || "";

        const load = query ? searchGifs(query) : fetchTrendingGifs();
        load.then((items) => {
            if (isCurrent) {
                setGifs(items);
                setLoading(false);
            }
        }).catch(() => {
            if (isCurrent) setLoading(false);
        });

        return () => {
            isCurrent = false;
        };
    }, [visible, activeCategory]);

    // Handle search input with debounce
    function handleSearchChange(text: string) {
        setSearch(text);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            setLoading(true);
            const load = text.trim() ? searchGifs(text) : fetchTrendingGifs();
            load.then((items) => {
                setGifs(items);
                setLoading(false);
            }).catch(() => {
                setLoading(false);
            });
        }, 350);
    }

    function handleSelectGif(gif: GifItem) {
        haptics.selection();
        onSelect(gif);
        onClose();
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/50">
                <View
                    style={{
                        height: Math.min(SCREEN_HEIGHT * 0.72, 580),
                        paddingBottom: insets.bottom + 8,
                    }}
                    className="w-full rounded-t-3xl bg-surface-lowest shadow-2xl"
                >
                    {/* Header bar */}
                    <View className="border-b border-border/40 px-4 pt-3 pb-2.5">
                        <View className="mb-2 flex-row items-center justify-between">
                            <Text className="text-title-md font-bold text-text-primary">
                                Choose a GIF
                            </Text>

                            <Pressable
                                onPress={onClose}
                                accessibilityRole="button"
                                accessibilityLabel="Close GIF picker"
                                hitSlop={8}
                                className="rounded-full bg-surface-low p-1.5"
                            >
                                <X size={18} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        {/* Search Input */}
                        <View className="flex-row items-center rounded-xl border border-border/40 bg-surface-low px-3 py-1.5">
                            <Search size={16} color={colors.textSecondary} />
                            <TextInput
                                value={search}
                                onChangeText={handleSearchChange}
                                placeholder="Search GIFs via GIPHY..."
                                placeholderTextColor={colors.textSecondary}
                                className="ml-2 flex-1 text-body-sm text-text-primary py-0.5"
                                autoCapitalize="none"
                                returnKeyType="search"
                            />
                            {Boolean(search) && (
                                <Pressable
                                    onPress={() => {
                                        setSearch("");
                                        setLoading(true);
                                        fetchTrendingGifs().then((items) => {
                                            setGifs(items);
                                            setLoading(false);
                                        });
                                    }}
                                    hitSlop={6}
                                >
                                    <X size={15} color={colors.textSecondary} />
                                </Pressable>
                            )}
                        </View>

                        {/* Category Pills */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="mt-2.5"
                            contentContainerStyle={{ gap: 6 }}
                        >
                            {GIF_CATEGORIES.map((cat) => {
                                const isSelected = !search && activeCategory === cat.id;
                                return (
                                    <Pressable
                                        key={cat.id}
                                        onPress={() => {
                                            haptics.selection();
                                            setSearch("");
                                            setActiveCategory(cat.id);
                                            setLoading(true);
                                        }}
                                        className={`rounded-full px-3 py-1 ${
                                            isSelected
                                                ? "bg-primary"
                                                : "border border-border/40 bg-surface-low"
                                        }`}
                                    >
                                        <Text
                                            className={`text-label-sm font-medium ${
                                                isSelected
                                                    ? "text-on-primary font-semibold"
                                                    : "text-text-secondary"
                                            }`}
                                        >
                                            {cat.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* GIF Grid / Loading */}
                    {loading ? (
                        <View className="flex-1 items-center justify-center gap-2 py-10">
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text className="text-body-sm text-text-secondary">
                                Loading GIFs...
                            </Text>
                        </View>
                    ) : gifs.length === 0 ? (
                        <View className="flex-1 items-center justify-center py-10">
                            <Text className="text-body-sm text-text-secondary">
                                No GIFs found for "{search}"
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={gifs}
                            keyExtractor={(item) => item.id}
                            numColumns={2}
                            contentContainerStyle={{ padding: 8, gap: 8 }}
                            columnWrapperStyle={{ gap: 8 }}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <Pressable
                                    onPress={() => handleSelectGif(item)}
                                    accessibilityRole="button"
                                    accessibilityLabel={item.title}
                                    className="flex-1 overflow-hidden rounded-2xl bg-surface-low aspect-[4/3]"
                                >
                                    <ExpoImage
                                        source={{ uri: item.previewUrl }}
                                        style={{ width: "100%", height: "100%" }}
                                        contentFit="cover"
                                        transition={150}
                                    />
                                    <View className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1">
                                        <Text
                                            numberOfLines={1}
                                            className="text-[10px] font-medium text-white"
                                        >
                                            {item.title}
                                        </Text>
                                    </View>
                                </Pressable>
                            )}
                        />
                    )}

                    {/* Footer Attribution */}
                    <View className="flex-row items-center justify-between border-t border-border/40 px-4 py-2">
                        <Text className="text-[11px] font-semibold text-text-secondary uppercase">
                            GIFs
                        </Text>
                        <Text className="text-[11px] font-bold text-primary">
                            Powered by GIPHY
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
