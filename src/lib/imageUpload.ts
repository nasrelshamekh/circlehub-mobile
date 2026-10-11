import type { ImagePickerAsset } from "expo-image-picker";

// Animated GIFs are excluded: they render poorly and the API rejects them.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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

export type UploadImage = {
    /** Local URI on native, object URL on web — used for the preview. */
    uri: string;
    /** Filename sent to the API; its extension must be an allowed one. */
    name: string;
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

// The picker re-encodes to JPEG, so unknown types fall back to .jpg.
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

// The runtime sets the multipart boundary, so never set Content-Type here.
export function appendImageToFormData(
    formData: FormData,
    field: string,
    image: UploadImage | null | undefined
) {
    if (!image) {
        return;
    }

    if (image.file) {
        formData.append(field, image.file);
    } else {
        formData.append(field, {
            uri: image.uri,
            name: image.name,
            type: image.type,
        } as unknown as Blob);
    }
}
