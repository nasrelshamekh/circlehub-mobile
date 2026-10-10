import { Redirect } from "expo-router";

/**
 * The post composer lives at the root-level modal route `/compose` so it can
 * slide up from the bottom. This tab route exists only so the tab bar has a
 * "Create" button — its `tabPress` is intercepted in `(tabs)/_layout.tsx`.
 * Should it ever mount (e.g. a deep link), forward to the modal.
 */
export default function CreateTab() {
    return <Redirect href="/compose" />;
}