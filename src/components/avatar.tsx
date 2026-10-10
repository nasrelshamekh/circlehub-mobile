import { useState } from "react";
import { Image, Text, View } from "react-native";

import { getImageUrl } from "@/lib/imageUrl";

type AvatarProps = {
    /**
     * Raw avatar URL from the API. The backend rewrites relative "/uploads/..."
     * paths to absolute URLs, but getImageUrl also resolves any that slip
     * through, so both forms are safe to pass.
     */
    src: string | null | undefined;

    /** Used to render the initial-letter fallback. */
    name: string;

    /** NativeWind classes for the circle, e.g. "h-10 w-10" or "mr-3 h-11 w-11". */
    className: string;

    /** NativeWind classes for the fallback initial. */
    textClassName?: string;
};

/**
 * Circular user avatar, mirroring the web app's <Avatar>: shows the image when
 * one is available and falls back to the person's initial when it is missing or
 * fails to load.
 */
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
            resizeMode="cover"
        />
    );
}
