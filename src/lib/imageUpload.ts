import type { ImagePickerAsset } from "expo-image-picker";

// Shared image-upload rules for the client, mirroring the web app's
// src/lib/imageUpload.js and the API's UploadService (5 MB cap, .jpg/.jpeg/
// .png/.webp only, magic-byte checked). The API is the real gatekeeper; checking
// here avoids a pointless round-trip and gives a friendlier message.
//
// Animated GIFs are deliberately excluded: a multi-frame GIF in a static post
// renders poorly, and the API rejects it.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
] as const;

export const ACCEPTED_IMAGE_TYPES = ALLOWED_IMAGE_TYPES.join(",");

const MIME_TO_EXTENSION: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
};

const EXTENSION_TO_MIME: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
};

const ALLOWED_TYPES_LABEL = "JPG, PNG, WebP";

/** A picked image normalized for upload + preview. */
export type UploadImage = {
    /** Local URI on native, object URL on web — used for the preview. */
    uri: string;
    /** Filename sent to the API; its extension must be an allowed one. */
    name: string;
    /** MIME type sent to the API. */
    type: string;
    /** Web only: the underlying File, which can be appended to FormData as-is. */
    file?: File;
};

function extensionOf(fileName: string | null | undefined): string | null {
    if (!fileName) {
        return null;
    }

    const match = fileName.toLowerCase().match(/\.[a-z0-9]+$/);
    return match ? match[0] : null;
}

/** Returns an error message if the image cannot be uploaded, otherwise null. */
export function validateUploadImage(
    type: string,
    size: number | null | undefined
): string | null {
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(type)) {
        return `Only ${ALLOWED_TYPES_LABEL} images are allowed.`;
    }

    if (typeof size === "number" && size > MAX_IMAGE_BYTES) {
        return "Image must be 5MB or smaller.";
    }

    return null;
}

/**
 * Normalizes an expo-image-picker asset into the shape the API expects.
 *
 * The picker re-encodes to JPEG when a `quality` is set, so when the MIME type
 * and filename extension are both unrecognized (e.g. HEIC) we fall back to
 * .jpg / image/jpeg.
 */
export function imageFromAsset(asset: ImagePickerAsset): UploadImage {
    if (asset.file) {
        // Web: keep the browser File so its real name + type reach the server.
        return {
            uri: asset.uri,
            name: asset.file.name,
            type: asset.file.type,
            file: asset.file,
        };
    }

    const mime = (asset.mimeType ?? "").toLowerCase();
    const extension = extensionOf(asset.fileName);
    const type =
        mime in MIME_TO_EXTENSION
            ? mime
            : extension && extension in EXTENSION_TO_MIME
              ? EXTENSION_TO_MIME[extension]
              : "image/jpeg";

    const baseName =
        (asset.fileName ?? "photo").replace(/\.[^.]+$/, "") || "photo";

    return {
        uri: asset.uri,
        name: `${baseName}${MIME_TO_EXTENSION[type]}`,
        type,
    };
}
