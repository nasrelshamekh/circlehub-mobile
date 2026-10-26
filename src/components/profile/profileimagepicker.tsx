import { Camera } from "lucide-react-native";
import { Alert, Image, Pressable, View } from "react-native";

import Avatar from "@/components/avatar";
import { useTheme } from "@/context/themecontext";
import { DEFAULT_AVATAR_URL, DEFAULT_COVER_URL } from "@/lib/imageUrl";
import { themeColors } from "@/theme/colors";

type ProfileImagePickerProps = {
    name: string;
    avatarUri: string | null;
    coverUri: string | null;
    onPickAvatar: () => void;
    onPickCover: () => void;
    onRemoveAvatar?: () => void;
    onRemoveCover?: () => void;
};

export default function ProfileImagePicker({
    name,
    avatarUri,
    coverUri,
    onPickAvatar,
    onPickCover,
    onRemoveAvatar,
    onRemoveCover,
}: ProfileImagePickerProps) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    const hasRemovableAvatar = Boolean(avatarUri && !avatarUri.includes("defaults/"));
    const hasRemovableCover = Boolean(coverUri && !coverUri.includes("defaults/"));

    const handleCoverPress = () => {
        if (hasRemovableCover && onRemoveCover) {
            Alert.alert("Cover Photo", "Choose an option", [
                { text: "Change Photo", onPress: onPickCover },
                { text: "Remove Photo", style: "destructive", onPress: onRemoveCover },
                { text: "Cancel", style: "cancel" },
            ]);
        } else {
            onPickCover();
        }
    };

    const handleAvatarPress = () => {
        if (hasRemovableAvatar && onRemoveAvatar) {
            Alert.alert("Profile Photo", "Choose an option", [
                { text: "Change Photo", onPress: onPickAvatar },
                { text: "Remove Photo", style: "destructive", onPress: onRemoveAvatar },
                { text: "Cancel", style: "cancel" },
            ]);
        } else {
            onPickAvatar();
        }
    };

    return (
        <>
            <Pressable
                onPress={handleCoverPress}
                accessibilityRole="button"
                accessibilityLabel="Cover image options"
                className="relative h-40 w-full bg-surface-high"
            >
                <Image
                    source={{ uri: coverUri || DEFAULT_COVER_URL }}
                    className="h-full w-full"
                    resizeMode="cover"
                />

                <View className="absolute inset-0 items-center justify-center bg-black/25">
                    <Camera size={22} color="#ffffff" />
                </View>
            </Pressable>

            <View className="-mt-12 px-4">
                <Pressable
                    onPress={handleAvatarPress}
                    accessibilityRole="button"
                    accessibilityLabel="Profile photo options"
                    className="self-start rounded-full bg-surface-low p-1"
                >
                    <View className="relative">
                        <Avatar
                            src={avatarUri || DEFAULT_AVATAR_URL}
                            name={name}
                            className="h-24 w-24"
                            textClassName="text-headline-lg"
                        />

                        <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full bg-surface-lowest">
                            <Camera size={16} color={colors.textPrimary} />
                        </View>
                    </View>
                </Pressable>
            </View>
        </>
    );
}
