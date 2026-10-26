export type FeedScrollOptions = {
    refresh?: boolean;
};

type Listener = (options?: FeedScrollOptions) => void;

const listeners = new Set<Listener>();

export function requestFeedScrollToTop(options?: FeedScrollOptions) {
    listeners.forEach((listener) => {
        try {
            listener(options);
        } catch {}
    });
}

export function subscribeFeedScrollToTop(listener: Listener) {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}
