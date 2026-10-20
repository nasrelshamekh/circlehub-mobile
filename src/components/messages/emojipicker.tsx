import { Search, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

type EmojiItem = {
    char: string;
    name: string;
    tags: string[];
};

type EmojiCategory = {
    name: string;
    shortName: string;
    emojis: EmojiItem[];
};

const EMOJI_CATEGORIES: EmojiCategory[] = [
    {
        name: "Smileys & Emotion",
        shortName: "Smileys",
        emojis: [
            { char: "😀", name: "grinning face", tags: ["happy", "smile"] },
            { char: "😃", name: "grinning face with big eyes", tags: ["happy", "joy"] },
            { char: "😄", name: "grinning face with smiling eyes", tags: ["laugh", "happy"] },
            { char: "😁", name: "beaming face", tags: ["grin", "happy"] },
            { char: "😆", name: "grinning squinting face", tags: ["haha", "laugh"] },
            { char: "😅", name: "grinning face with sweat", tags: ["relief", "sweat"] },
            { char: "😂", name: "face with tears of joy", tags: ["lol", "crying", "laugh"] },
            { char: "🤣", name: "rolling on the floor laughing", tags: ["rofl", "lol"] },
            { char: "😊", name: "smiling face with smiling eyes", tags: ["blush", "proud"] },
            { char: "😇", name: "smiling face with halo", tags: ["angel", "innocent"] },
            { char: "🙂", name: "slightly smiling face", tags: ["smile"] },
            { char: "😉", name: "winking face", tags: ["wink"] },
            { char: "😌", name: "relieved face", tags: ["peace", "calm"] },
            { char: "😍", name: "smiling face with heart-eyes", tags: ["love", "crush"] },
            { char: "🥰", name: "smiling face with hearts", tags: ["love", "warm"] },
            { char: "😘", name: "face blowing a kiss", tags: ["kiss", "love"] },
            { char: "😗", name: "kissing face", tags: ["kiss"] },
            { char: "😋", name: "face savoring food", tags: ["delicious", "yum"] },
            { char: "😛", name: "face with tongue", tags: ["tongue", "playful"] },
            { char: "😜", name: "winking face with tongue", tags: ["playful", "joke"] },
            { char: "🤪", name: "zany face", tags: ["crazy", "wild"] },
            { char: "😝", name: "squinting face with tongue", tags: ["prank"] },
            { char: "🤑", name: "money-mouth face", tags: ["money", "rich"] },
            { char: "🤗", name: "smiling face with open hands", tags: ["hug"] },
            { char: "🤭", name: "face with hand over mouth", tags: ["oops", "secret"] },
            { char: "🤫", name: "shushing face", tags: ["quiet", "shh"] },
            { char: "🤔", name: "thinking face", tags: ["think", "ponder"] },
            { char: "🤐", name: "zipper-mouth face", tags: ["shut", "silent"] },
            { char: "🤨", name: "face with raised eyebrow", tags: ["skeptical", "suspicious"] },
            { char: "😐", name: "neutral face", tags: ["meh"] },
            { char: "😑", name: "expressionless face", tags: ["blank"] },
            { char: "😶", name: "face without mouth", tags: ["mute"] },
            { char: "😏", name: "smirking face", tags: ["smirk", "flirt"] },
            { char: "😒", name: "unamused face", tags: ["bored", "displeased"] },
            { char: "🙄", name: "face with rolling eyes", tags: ["eyeroll"] },
            { char: "😬", name: "grimacing face", tags: ["awkward", "nervous"] },
            { char: "🤥", name: "lying face", tags: ["pinocchio", "lie"] },
            { char: "😴", name: "sleeping face", tags: ["tired", "sleep", "zzz"] },
            { char: "😷", name: "face with medical mask", tags: ["sick"] },
            { char: "🤒", name: "face with thermometer", tags: ["ill"] },
            { char: "🤕", name: "face with head-bandage", tags: ["hurt"] },
            { char: "🤢", name: "nauseated face", tags: ["gross"] },
            { char: "🤮", name: "face vomiting", tags: ["puke"] },
            { char: "🥵", name: "hot face", tags: ["heat", "sweat"] },
            { char: "🥶", name: "cold face", tags: ["freezing"] },
            { char: "😵", name: "dizzy face", tags: ["faint"] },
            { char: "🤯", name: "exploding head", tags: ["mindblown"] },
            { char: "🥳", name: "partying face", tags: ["celebrate", "party"] },
            { char: "😎", name: "smiling face with sunglasses", tags: ["cool", "shades"] },
            { char: "🤓", name: "nerd face", tags: ["geek"] },
            { char: "🧐", name: "face with monocle", tags: ["curious"] },
            { char: "😕", name: "confused face", tags: ["puzzled"] },
            { char: "😟", name: "worried face", tags: ["nervous"] },
            { char: "🙁", name: "slightly frowning face", tags: ["sad"] },
            { char: "😮", name: "face with open mouth", tags: ["surprise", "wow"] },
            { char: "😯", name: "hushed face", tags: ["stunned"] },
            { char: "😲", name: "astonished face", tags: ["shocked"] },
            { char: "😳", name: "flushed face", tags: ["embarrassed"] },
            { char: "🥺", name: "pleading face", tags: ["puppy", "please"] },
            { char: "😢", name: "crying face", tags: ["tear", "sad"] },
            { char: "😭", name: "loudly crying face", tags: ["sob", "sad"] },
            { char: "😱", name: "face screaming in fear", tags: ["horror"] },
            { char: "😤", name: "face with steam from nose", tags: ["triumph", "angry"] },
            { char: "😡", name: "enraged face", tags: ["furious", "angry"] },
            { char: "😠", name: "angry face", tags: ["mad"] },
            { char: "😈", name: "smiling face with horns", tags: ["devil", "mischief"] },
            { char: "💀", name: "skull", tags: ["dead", "skeleton"] },
            { char: "💩", name: "pile of poo", tags: ["poop"] },
            { char: "🤡", name: "clown face", tags: ["clown"] },
            { char: "👻", name: "ghost", tags: ["spooky", "boo"] },
        ],
    },
    {
        name: "Hands & Gestures",
        shortName: "Hands",
        emojis: [
            { char: "👋", name: "waving hand", tags: ["hello", "bye", "wave"] },
            { char: "🤚", name: "raised back of hand", tags: ["stop"] },
            { char: "🖐️", name: "hand with fingers splayed", tags: ["five"] },
            { char: "✋", name: "raised hand", tags: ["high five", "stop"] },
            { char: "🖖", name: "vulcan salute", tags: ["spock"] },
            { char: "👌", name: "OK hand", tags: ["perfect", "ok"] },
            { char: "🤌", name: "pinched fingers", tags: ["italian"] },
            { char: "🤏", name: "pinching hand", tags: ["tiny", "little"] },
            { char: "✌️", name: "victory hand", tags: ["peace"] },
            { char: "🤞", name: "crossed fingers", tags: ["luck", "hope"] },
            { char: "🤟", name: "love-you gesture", tags: ["ily"] },
            { char: "🤘", name: "sign of the horns", tags: ["rock"] },
            { char: "🤙", name: "call me hand", tags: ["shaka", "hang loose"] },
            { char: "👈", name: "backhand index pointing left", tags: ["point"] },
            { char: "👉", name: "backhand index pointing right", tags: ["point"] },
            { char: "👆", name: "backhand index pointing up", tags: ["up"] },
            { char: "👇", name: "backhand index pointing down", tags: ["down"] },
            { char: "☝️", name: "index pointing up", tags: ["one"] },
            { char: "👍", name: "thumbs up", tags: ["approve", "like", "yes"] },
            { char: "👎", name: "thumbs down", tags: ["dislike", "no"] },
            { char: "✊", name: "raised fist", tags: ["power"] },
            { char: "👊", name: "oncoming fist", tags: ["fist bump", "bro"] },
            { char: "🤛", name: "left-facing fist", tags: ["bump"] },
            { char: "🤜", name: "right-facing fist", tags: ["bump"] },
            { char: "👏", name: "clapping hands", tags: ["applause", "bravo"] },
            { char: "🙌", name: "raising hands", tags: ["praise", "cheer"] },
            { char: "👐", name: "open hands", tags: ["open"] },
            { char: "🤲", name: "palms up together", tags: ["prayer", "duo"] },
            { char: "🤝", name: "handshake", tags: ["deal", "agreement"] },
            { char: "🙏", name: "folded hands", tags: ["please", "thank you", "pray"] },
            { char: "✍️", name: "writing hand", tags: ["write", "pen"] },
            { char: "💪", name: "flexed biceps", tags: ["strong", "workout"] },
        ],
    },
    {
        name: "Hearts & Symbols",
        shortName: "Hearts",
        emojis: [
            { char: "❤️", name: "red heart", tags: ["love", "heart"] },
            { char: "🧡", name: "orange heart", tags: ["love"] },
            { char: "💛", name: "yellow heart", tags: ["love", "friendship"] },
            { char: "💚", name: "green heart", tags: ["love"] },
            { char: "💙", name: "blue heart", tags: ["love", "peace"] },
            { char: "💜", name: "purple heart", tags: ["love"] },
            { char: "🖤", name: "black heart", tags: ["dark"] },
            { char: "🤍", name: "white heart", tags: ["pure"] },
            { char: "🤎", name: "brown heart", tags: ["heart"] },
            { char: "💔", name: "broken heart", tags: ["sad", "heartbreak"] },
            { char: "❤️‍🔥", name: "heart on fire", tags: ["passion", "flame"] },
            { char: "💖", name: "sparkling heart", tags: ["shine", "love"] },
            { char: "💗", name: "growing heart", tags: ["pulse"] },
            { char: "💓", name: "beating heart", tags: ["heartbeat"] },
            { char: "💞", name: "revolving hearts", tags: ["love"] },
            { char: "💕", name: "two hearts", tags: ["love"] },
            { char: "🔥", name: "fire", tags: ["lit", "hot", "flame"] },
            { char: "✨", name: "sparkles", tags: ["magic", "clean", "shine"] },
            { char: "🌟", name: "glowing star", tags: ["star"] },
            { char: "⭐", name: "star", tags: ["fav"] },
            { char: "⚡", name: "high voltage", tags: ["lightning", "fast", "bolt"] },
            { char: "💥", name: "collision", tags: ["boom", "bang"] },
            { char: "💯", name: "hundred points", tags: ["perfect", "score", "100"] },
            { char: "🎉", name: "party popper", tags: ["tada", "celebration"] },
            { char: "🎊", name: "confetti ball", tags: ["party"] },
            { char: "🎈", name: "balloon", tags: ["birthday"] },
            { char: "🎁", name: "wrapped gift", tags: ["present"] },
            { char: "🏆", name: "trophy", tags: ["winner", "prize"] },
            { char: "🥇", name: "1st place medal", tags: ["gold"] },
            { char: "🎯", name: "direct hit", tags: ["target", "bullseye"] },
            { char: "🚀", name: "rocket", tags: ["launch", "moon", "fast"] },
            { char: "💡", name: "light bulb", tags: ["idea"] },
            { char: "💬", name: "speech balloon", tags: ["message", "chat"] },
            { char: "✅", name: "check mark button", tags: ["done", "yes"] },
            { char: "❌", name: "cross mark", tags: ["no", "cancel"] },
        ],
    },
    {
        name: "Animals & Food",
        shortName: "Animals",
        emojis: [
            { char: "🐶", name: "dog face", tags: ["puppy", "pet"] },
            { char: "🐱", name: "cat face", tags: ["kitten", "pet"] },
            { char: "🐭", name: "mouse face", tags: ["mouse"] },
            { char: "🐰", name: "rabbit face", tags: ["bunny"] },
            { char: "🦊", name: "fox", tags: ["fox"] },
            { char: "🐻", name: "bear", tags: ["bear"] },
            { char: "🐼", name: "panda", tags: ["panda"] },
            { char: "🦁", name: "lion", tags: ["lion", "king"] },
            { char: "🐯", name: "tiger face", tags: ["tiger"] },
            { char: "🐵", name: "monkey face", tags: ["monkey"] },
            { char: "🐧", name: "penguin", tags: ["penguin"] },
            { char: "🐦", name: "bird", tags: ["bird"] },
            { char: "🦄", name: "unicorn", tags: ["magic"] },
            { char: "🍕", name: "pizza", tags: ["food", "cheese"] },
            { char: "🍔", name: "hamburger", tags: ["burger", "food"] },
            { char: "🍟", name: "french fries", tags: ["fries", "food"] },
            { char: "🌮", name: "taco", tags: ["mexican"] },
            { char: "🍣", name: "sushi", tags: ["japanese"] },
            { char: "🍦", name: "ice cream", tags: ["sweet"] },
            { char: "🍩", name: "doughnut", tags: ["donut"] },
            { char: "🍪", name: "cookie", tags: ["sweet"] },
            { char: "🍫", name: "chocolate bar", tags: ["candy"] },
            { char: "☕", name: "hot beverage", tags: ["coffee", "tea"] },
            { char: "🧋", name: "bubble tea", tags: ["boba"] },
            { char: "🍺", name: "beer mug", tags: ["drink", "cheers"] },
            { char: "🍻", name: "clinking beer mugs", tags: ["toast", "cheers"] },
        ],
    },
];

export default function EmojiPicker({
    onSelect,
}: {
    onSelect: (emoji: string) => void;
}) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState(0);

    const filteredEmojis = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return null;

        const results: EmojiItem[] = [];
        for (const cat of EMOJI_CATEGORIES) {
            for (const item of cat.emojis) {
                if (
                    item.name.toLowerCase().includes(query) ||
                    item.tags.some((tag) => tag.includes(query))
                ) {
                    results.push(item);
                }
            }
        }
        return results;
    }, [search]);

    const currentList = filteredEmojis ?? EMOJI_CATEGORIES[activeTab].emojis;

    return (
        <View className="h-64 border-t border-border bg-surface-lowest">
            <View className="flex-row items-center gap-2 border-b border-border px-3 py-2">
                <Search size={15} color={colors.textSecondary} />
                <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search emojis..."
                    placeholderTextColor={colors.textSecondary}
                    className="flex-1 py-0.5 text-body-sm text-text-primary"
                />
                {search.length > 0 && (
                    <Pressable
                        onPress={() => setSearch("")}
                        accessibilityRole="button"
                        accessibilityLabel="Clear emoji search"
                        hitSlop={8}
                    >
                        <X size={15} color={colors.textSecondary} />
                    </Pressable>
                )}
            </View>

            {!filteredEmojis && (
                <View className="flex-row border-b border-border px-2 py-1">
                    {EMOJI_CATEGORIES.map((cat, idx) => (
                        <Pressable
                            key={cat.name}
                            onPress={() => setActiveTab(idx)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: activeTab === idx }}
                            className={
                                activeTab === idx
                                    ? "flex-1 items-center rounded-lg bg-surface-low py-1.5"
                                    : "flex-1 items-center rounded-lg py-1.5"
                            }
                        >
                            <Text
                                numberOfLines={1}
                                className={
                                    activeTab === idx
                                        ? "text-label-sm font-semibold text-primary"
                                        : "text-label-sm text-text-secondary"
                                }
                            >
                                {cat.shortName}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            )}

            <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerClassName="p-2"
            >
                {filteredEmojis && filteredEmojis.length === 0 ? (
                    <View className="items-center py-8">
                        <Text className="text-body-sm text-text-secondary">
                            No emojis found for &ldquo;{search}&rdquo;
                        </Text>
                    </View>
                ) : (
                    <View className="flex-row flex-wrap">
                        {currentList.map((item) => (
                            <Pressable
                                key={`${item.name}-${item.char}`}
                                onPress={() => onSelect(item.char)}
                                accessibilityRole="button"
                                accessibilityLabel={item.name}
                                className="h-10 w-[12.5%] items-center justify-center rounded-lg active:bg-surface-low"
                            >
                                <Text className="text-xl">{item.char}</Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
