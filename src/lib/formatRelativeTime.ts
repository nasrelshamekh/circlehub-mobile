import { formatDistanceToNow } from "date-fns";

export function formatRelativeTime(value: string | Date): string {
    return formatDistanceToNow(Math.min(new Date(value).getTime(), Date.now()), {
        addSuffix: true,
    });
}
