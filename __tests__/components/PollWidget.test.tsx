import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import PollWidget from "@/components/pollwidget";
import { ThemeProvider } from "@/context/themecontext";
import { Poll } from "@/types/post";

const mockMutateAsync = jest.fn();

jest.mock("@/hooks/mutations/useVotePoll", () => () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
}));

async function renderWidget(poll: Poll) {
    const queryClient = new QueryClient();
    return await render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <PollWidget postId="post-1" poll={poll} />
            </ThemeProvider>
        </QueryClientProvider>
    );
}

describe("PollWidget Component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const unvotedPoll: Poll = {
        id: "poll-1",
        question: "Which framework do you prefer?",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        isExpired: false,
        totalVotes: 10,
        myVotedOptionId: null,
        options: [
            {
                id: "opt-1",
                text: "React Native",
                displayOrder: 0,
                votesCount: 7,
                percentage: 70,
            },
            {
                id: "opt-2",
                text: "Flutter",
                displayOrder: 1,
                votesCount: 3,
                percentage: 30,
            },
        ],
    };

    it("renders poll question and options for unvoted state", async () => {
        const { getByText } = await renderWidget(unvotedPoll);

        expect(getByText("Which framework do you prefer?")).toBeTruthy();
        expect(getByText("React Native")).toBeTruthy();
        expect(getByText("Flutter")).toBeTruthy();
        expect(getByText("10 votes")).toBeTruthy();
    });

    it("triggers vote mutation when clicking an option", async () => {
        const { getByText } = await renderWidget(unvotedPoll);

        const optionButton = getByText("React Native");
        fireEvent.press(optionButton);

        expect(mockMutateAsync).toHaveBeenCalledWith({
            postId: "post-1",
            optionId: "opt-1",
        });
    });

    it("displays percentages and results when user has already voted", async () => {
        const votedPoll: Poll = {
            ...unvotedPoll,
            myVotedOptionId: "opt-1",
        };

        const { getByText } = await renderWidget(votedPoll);

        expect(getByText("70%")).toBeTruthy();
        expect(getByText("30%")).toBeTruthy();
        expect(getByText("Change vote")).toBeTruthy();
    });
});
