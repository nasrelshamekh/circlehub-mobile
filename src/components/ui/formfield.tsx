import { ReactNode } from "react";
import { Text, View } from "react-native";

export default function Field({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <View className="gap-2">
            <View className="flex-row items-center justify-between">
                <Text className="text-label-md font-semibold text-text-primary">
                    {label}
                </Text>

                {hint ? (
                    <Text className="text-label-sm text-text-secondary">
                        {hint}
                    </Text>
                ) : null}
            </View>

            {children}
        </View>
    );
}
