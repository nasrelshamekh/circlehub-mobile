type Listener = () => void;

const listeners = new Set<Listener>();

export function requestFeedScrollToTop() {
    listeners.forEach((listener) => listener());
}

export function subscribeFeedScrollToTop(listener: Listener) {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}
