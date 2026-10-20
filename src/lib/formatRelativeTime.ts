import { formatDistanceToNow } from "date-fns";

export function formatRelativeTime(value: string | Date): string {
    return formatDistanceToNow(Math.min(new Date(value).getTime(), Date.now()), {
        addSuffix: true,
    });
}

export function formatLastSeen(value?: string | Date | null): string | null {
    if (!value) return null;

    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return null;

    if (Date.now() - timestamp < 60_000) {
        return "Last seen just now";
    }

    return `Last seen ${formatRelativeTime(value)}`;
}
