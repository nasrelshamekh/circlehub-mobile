import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";

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
