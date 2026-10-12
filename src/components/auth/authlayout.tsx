import { ReactNode } from "react";
import {
    Image,
    KeyboardAvoidingView,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <SafeAreaView className="flex-1 bg-surface-low">
            <KeyboardAvoidingView
                className="flex-1"
                behavior="padding"
                keyboardVerticalOffset={16}
            >
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="grow justify-center p-6"
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="w-full max-w-lg self-center">
                        {children}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

export function AuthHeader({
    title,
    subtitle,
    icon,
}: {
    title: string;
    subtitle?: string;
    icon?: ReactNode;
}) {
    return (
        <View className="mb-8 items-center">
            <Image
                source={require("@/assets/images/circlehub-logo.png")}
                className="mb-8 h-16 w-[244px]"
                resizeMode="contain"
            />

            {icon}

            <Text className="text-center text-headline-md font-semibold text-text-primary">
                {title}
            </Text>

            {subtitle ? (
                <Text className="mt-2 text-center text-body-sm text-text-secondary">
                    {subtitle}
                </Text>
            ) : null}
        </View>
    );
}
