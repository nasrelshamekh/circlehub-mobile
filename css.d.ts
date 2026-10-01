// Ambient declaration for CSS side-effect imports (e.g. `import "../global.css"`).
// Metro handles these at runtime via the NativeWind babel plugin, but TypeScript
// 6+ reports TS2882 unless a module declaration exists. NativeWind's shipped types
// augment React Native props but do not declare the `*.css` module itself.
declare module "*.css";