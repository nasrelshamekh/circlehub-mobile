import { router } from "expo-router";
import React from "react";
import { Linking, StyleProp, Text, TextStyle } from "react-native";

interface RichTextProps {
    text?: string | null;
    className?: string;
    style?: StyleProp<TextStyle>;
    numberOfLines?: number;
    onPressBase?: () => void;
}

type Token =
    | { type: "text"; value: string }
    | { type: "url"; value: string; href: string }
    | { type: "mention"; value: string; username: string }
    | { type: "hashtag"; value: string; tag: string };

const TOKEN_REGEX = /(https?:\/\/[^\s]+)|@([a-zA-Z0-9_]{3,30})|#([a-zA-Z0-9_\u0600-\u06FF]+)/g;

function tokenize(text: string): Token[] {
    if (!text) return [];

    const tokens: Token[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    TOKEN_REGEX.lastIndex = 0;

    while ((match = TOKEN_REGEX.exec(text)) !== null) {
        if (match.index > lastIndex) {
            tokens.push({
                type: "text",
                value: text.slice(lastIndex, match.index),
            });
        }

        const [full, url, mention, hashtag] = match;

        if (url) {
            tokens.push({
                type: "url",
                value: url,
                href: url,
            });
        } else if (mention) {
            tokens.push({
                type: "mention",
                value: full,
                username: mention,
            });
        } else if (hashtag) {
            tokens.push({
                type: "hashtag",
                value: full,
                tag: hashtag,
            });
        }

        lastIndex = match.index + full.length;
    }

    if (lastIndex < text.length) {
        tokens.push({
            type: "text",
            value: text.slice(lastIndex),
        });
    }

    return tokens;
}

export default function RichText({
    text,
    className,
    style,
    numberOfLines,
    onPressBase,
}: RichTextProps) {
    if (!text) return null;

    const tokens = tokenize(text);

    return (
        <Text
            className={className}
            style={style}
            numberOfLines={numberOfLines}
            onPress={onPressBase}
        >
            {tokens.map((token, index) => {
                if (token.type === "url") {
                    return (
                        <Text
                            key={index}
                            className="text-primary underline"
                            onPress={async () => {
                                try {
                                    const supported = await Linking.canOpenURL(token.href);
                                    if (supported) {
                                        await Linking.openURL(token.href);
                                    }
                                } catch {}
                            }}
                        >
                            {token.value}
                        </Text>
                    );
                }

                if (token.type === "mention") {
                    return (
                        <Text
                            key={index}
                            className="font-medium text-primary"
                            onPress={() => {
                                router.push({
                                    pathname: "/profile/[username]",
                                    params: { username: token.username },
                                });
                            }}
                        >
                            {token.value}
                        </Text>
                    );
                }

                if (token.type === "hashtag") {
                    return (
                        <Text
                            key={index}
                            className="font-medium text-primary"
                            onPress={() => {
                                router.push({
                                    pathname: "/(tabs)/explore",
                                    params: { q: token.value },
                                });
                            }}
                        >
                            {token.value}
                        </Text>
                    );
                }

                return <React.Fragment key={index}>{token.value}</React.Fragment>;
            })}
        </Text>
    );
}
