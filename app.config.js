module.exports = ({ config }) => {
    const isEasBuild =
        process.env.EAS_BUILD === "true" ||
        Boolean(process.env.EAS_BUILD_PROFILE);

    const appName =
        process.env.APP_NAME || (isEasBuild ? "CircleHub" : "circlehub-mobile");

    return {
        ...config,
        name: appName,
        slug: "circlehub-mobile",
    };
};
