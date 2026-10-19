function ordinalSuffix(day: number) {
    if (day % 10 === 1 && day !== 11) return "st";
    if (day % 10 === 2 && day !== 12) return "nd";
    if (day % 10 === 3 && day !== 13) return "rd";

    return "th";
}

export function formatPostDate(date: string) {
    const createdAt = new Date(date);
    const currentYear = new Date().getFullYear();

    const day = createdAt.getDate();

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

    return `${month} ${day}${ordinalSuffix(day)}${year} at ${time}`;
}

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

export function formatMessageTime(date: string) {
    return new Date(date).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export function formatMessageDate(date: string) {
    const value = new Date(date);

    const day = value.getDate();

    const month = value.toLocaleDateString("en-US", {
        month: "long",
    });

    const year =
        value.getFullYear() === new Date().getFullYear()
            ? ""
            : `, ${value.getFullYear()}`;

    return `${month} ${day}${ordinalSuffix(day)}${year}`;
}
