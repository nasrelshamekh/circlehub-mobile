import { formatDistanceToNow } from "date-fns";

// Relative times are only shown for things that already happened. Clamp to now
// so a timestamp a second ahead of the device clock reads "…ago" and not "in …".
export function formatRelativeTime(value: string | Date): string {
    return formatDistanceToNow(Math.min(new Date(value).getTime(), Date.now()), {
        addSuffix: true,
    });
}
