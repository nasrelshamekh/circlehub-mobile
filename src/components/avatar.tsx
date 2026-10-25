import { Image } from "expo-image";
import { useState } from "react";
import { Text, View } from "react-native";

import { getImageUrl } from "@/lib/imageUrl";

type AvatarProps = {
    src: string | null | undefined;
    name: string;
    className: string;
    textClassName?: string;
};

export default function Avatar({
    src,
    name,
    className,
    textClassName = "text-label-md",
}: AvatarProps) {
    const [failed, setFailed] = useState(false);
    const uri = getImageUrl(src ?? null);

    const handleError = () => setFailed(true);

    if (!uri || failed) {
        return (
            <View
                className={`${className} items-center justify-center rounded-full bg-surface-highest`}
            >
                <Text className={`${textClassName} text-text-secondary`}>
                    {name.charAt(0).toUpperCase()}
                </Text>
            </View>
        );
    }

    return (
        <Image
            source={{ uri }}
            onError={handleError}
            className={`${className} rounded-full`}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
        />
    );
}
