import { useState } from "react";
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
    const [searchQuery, setSearchQuery] = useState("");
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
