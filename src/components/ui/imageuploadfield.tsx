import * as ImagePicker from "expo-image-picker";
import { ImagePlus, X } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";

import { useTheme } from "@/context/themecontext";
import {
    imageFromAsset,
    UploadImage,
    validateUploadImage,
} from "@/lib/imageUpload";
import { themeColors } from "@/theme/colors";

type ImageUploadFieldProps = {
    variant: "cover" | "avatar";
    previewUri?: string;
    showRemove?: boolean;
    onPicked: (image: UploadImage) => void;
    onError: (message: string) => void;
    onRemove: () => void;
};

export default function ImageUploadField({
    variant,
    previewUri,
    showRemove = false,
    onPicked,
    onError,
    onRemove,
}: ImageUploadFieldProps) {
    const { isDark } = useTheme();
    const colors = isDark ? themeColors.dark : themeColors.light;
    const isCover = variant === "cover";

    async function pick() {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
        });

        if (result.canceled) return;

        const asset = result.assets[0];
        const picked = imageFromAsset(asset);
        const size = picked.file?.size ?? asset.fileSize;
        const validationError = validateUploadImage(picked.type, size);

        if (validationError) {
            onError(validationError);
            return;
        }

        onPicked(picked);
    }

    return (
        <Pressable
            onPress={pick}
            accessibilityRole="button"
            accessibilityLabel={
                isCover ? "Choose a cover image" : "Choose a community image"
            }
            className={
                isCover
                    ? "relative h-32 overflow-hidden rounded-2xl bg-surface-high"
                    : "relative h-24 w-24 overflow-hidden rounded-xl bg-surface-high"
            }
        >
            {previewUri ? (
                <>
                    <Image
                        source={{ uri: previewUri }}
                        className="h-full w-full"
                        resizeMode="cover"
                    />

                    {showRemove ? (
                        <Pressable
                            onPress={onRemove}
                            accessibilityRole="button"
                            accessibilityLabel={
                                isCover
                                    ? "Remove cover image"
                                    : "Remove community image"
                            }
                            className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-surface-lowest"
                        >
                            <X size={16} color={colors.textPrimary} />
                        </Pressable>
                    ) : null}
                </>
            ) : (
                <View className="h-full w-full items-center justify-center gap-2">
                    <ImagePlus
                        size={isCover ? 24 : 22}
                        color={colors.textSecondary}
                    />

                    <Text className="text-label-sm text-text-secondary">
                        {isCover ? "Add a cover image" : "Add"}
                    </Text>
                </View>
            )}
        </Pressable>
    );
}
