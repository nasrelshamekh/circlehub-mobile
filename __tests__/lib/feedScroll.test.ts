import {
    requestFeedScrollToTop,
    subscribeFeedScrollToTop,
} from "@/lib/feedScroll";

describe("feedScroll", () => {
    it("notifies listeners with options when scroll is requested", () => {
        const listener = jest.fn();
        const unsubscribe = subscribeFeedScrollToTop(listener);

        requestFeedScrollToTop({ refresh: true });

        expect(listener).toHaveBeenCalledWith({ refresh: true });

        unsubscribe();

        requestFeedScrollToTop({ refresh: false });
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it("handles multiple listeners gracefully", () => {
        const l1 = jest.fn();
        const l2 = jest.fn();

        const unsub1 = subscribeFeedScrollToTop(l1);
        const unsub2 = subscribeFeedScrollToTop(l2);

        requestFeedScrollToTop();

        expect(l1).toHaveBeenCalledWith(undefined);
        expect(l2).toHaveBeenCalledWith(undefined);

        unsub1();
        unsub2();
    });
});
