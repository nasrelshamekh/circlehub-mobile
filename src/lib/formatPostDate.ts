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