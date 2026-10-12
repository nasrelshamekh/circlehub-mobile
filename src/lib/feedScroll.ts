type Listener = () => void;

const listeners = new Set<Listener>();

// Ask the feed to scroll back to the top. Only mounted feeds are listening;
// an unmounted feed renders at the top anyway.
export function requestFeedScrollToTop() {
    listeners.forEach((listener) => listener());
}

export function subscribeFeedScrollToTop(listener: Listener) {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}
