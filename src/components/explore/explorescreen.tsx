import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    ScrollView,
    Text,
    View,
} from "react-native";

import ExploreSearch from "@/components/explore/exploresearch";
import ExploreTabs from "@/components/explore/exploretabs";
import useSearch from "@/hooks/useSearch";

export default function ExploreScreen() {
    const params = useLocalSearchParams<{ q?: string }>();
    const initialQuery = typeof params.q === "string" ? params.q : "";
    const [searchQuery, setSearchQuery] = useState(initialQuery);

    useEffect(() => {
        if (typeof params.q === "string") {
            setSearchQuery(params.q);
        }
    }, [params.q]);

    const { users, communities, posts, isLoading } = useSearch(searchQuery);

    return (
        <KeyboardAvoidingView
            className="flex-1"
            behavior="padding"
            keyboardVerticalOffset={16}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerClassName="p-4 pb-8"
                className="flex-1"
            >
                <View className="gap-4">
                    <View>
                        <Text className="text-headline-md font-bold text-text-primary">
                            Explore
                        </Text>

                        <Text className="mt-1 text-body-sm text-text-secondary">
                            Search for posts, people, and communities across
                            CircleHub.
                        </Text>
                    </View>

                    <ExploreSearch value={searchQuery} onChangeText={setSearchQuery} />

                    <ExploreTabs
                        posts={posts}
                        users={users}
                        communities={communities}
                        searchQuery={searchQuery}
                        isLoading={isLoading}
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
