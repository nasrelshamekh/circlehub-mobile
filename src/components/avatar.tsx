import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";

import { DEFAULT_AVATAR_URL, getImageUrl } from "@/lib/imageUrl";

type AvatarProps = {
    src: string | null | undefined;
    name: string;
    className: string;
    textClassName?: string;
    fallback?: "placeholder" | "initial";
};

export default function Avatar({
    src,
    name,
    className,
    textClassName = "text-label-md",
    fallback = "placeholder",
}: AvatarProps) {
    const [failed, setFailed] = useState(false);
    const resolvedSrc = src || (fallback === "placeholder" ? DEFAULT_AVATAR_URL : null);
    const uri = getImageUrl(resolvedSrc);

    useEffect(() => {
        setFailed(false);
    }, [uri]);

    const handleError = () => setFailed(true);

    if (!uri || failed) {
        const initial = (name?.trim()?.charAt(0) || "?").toUpperCase();
        return (
            <View
                className={`${className} items-center justify-center rounded-full bg-surface-highest`}
            >
                <Text className={`${textClassName} text-text-secondary`}>
                    {initial}
                </Text>
            </View>
        );
    }

    return (
        <Image
            source={{ uri }}
            onError={handleError}
            className={`${className} rounded-full`}
            resizeMode="cover"
        />
    );
}
