import { Camera } from "lucide-react-native";
import { Image, Pressable, View } from "react-native";

import Avatar from "@/components/avatar";
import { useTheme } from "@/context/themecontext";
import { themeColors } from "@/theme/colors";

type ProfileImagePickerProps = {
    name: string;
    avatarUri: string | null;
    coverUri: string | null;
    onPickAvatar: () => void;
    onPickCover: () => void;
};

export default function ProfileImagePicker({
    name,
    avatarUri,
    coverUri,
    onPickAvatar,
    onPickCover,
}: ProfileImagePickerProps) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;

    return (
        <>
            <Pressable
                onPress={onPickCover}
                accessibilityRole="button"
                accessibilityLabel="Change cover image"
                className="relative h-40 w-full bg-surface-high"
            >
                {coverUri ? (
                    <Image
                        source={{ uri: coverUri }}
                        className="h-full w-full"
                        resizeMode="cover"
                    />
                ) : null}

                <View className="absolute inset-0 items-center justify-center bg-black/25">
                    <Camera size={22} color="#ffffff" />
                </View>
            </Pressable>

            <View className="-mt-12 px-4">
                <Pressable
                    onPress={onPickAvatar}
                    accessibilityRole="button"
                    accessibilityLabel="Change profile photo"
                    className="self-start rounded-full bg-surface-low p-1"
                >
                    <View className="relative">
                        <Avatar
                            src={avatarUri}
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
