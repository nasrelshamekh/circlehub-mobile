export function formatPostDate(date: string) {
    const createdAt = new Date(date);
    const currentYear = new Date().getFullYear();

    const day = createdAt.getDate();

    let ordinal = "th";

    if (day % 10 === 1 && day !== 11) ordinal = "st";
    if (day % 10 === 2 && day !== 12) ordinal = "nd";
    if (day % 10 === 3 && day !== 13) ordinal = "rd";

    const month = createdAt.toLocaleDateString("en-US", {
        month: "long",
    });

    const time = createdAt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });

    const year =
        createdAt.getFullYear() === currentYear
            ? ""
            : `, ${createdAt.getFullYear()}`;

    return `${month} ${day}${ordinal}${year} at ${time}`;
}

// Compact stamp for the conversation list.
export function formatShortTime(date: string) {
    const value = new Date(date);
    const seconds = (Date.now() - value.getTime()) / 1000;

    if (seconds < 60) return "now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;

    return value.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}
