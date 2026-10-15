import { File as ExpoFile } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { ImagePickerAsset } from "expo-image-picker";

import { ApiError } from "@/types/api";

// Animated GIFs are excluded: they render poorly and the API rejects them.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Phone cameras hand us 3-6 MB photos: right at the API's 5 MB ceiling, and a
// multi-MB body is slow to send and fragile over Wi-Fi. The feed and the thread
// only ever render these a few hundred pixels wide, so anything wider than the
// limit below (or heavier than the threshold) is re-encoded as a smaller JPEG.
export const MAX_UPLOAD_WIDTH = 1600;
const SHRINK_ABOVE_BYTES = 1024 * 1024;
const UPLOAD_JPEG_QUALITY = 0.8;

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
    /** Byte size when known, for the pre-upload limit check. */
    size?: number;
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

// Re-encodes a picked photo as a smaller JPEG in the cache directory. Widths are
// never enlarged, so an already-small photo keeps its dimensions.
async function shrinkImage(asset: ImagePickerAsset): Promise<UploadImage> {
    const context = ImageManipulator.manipulate(asset.uri);
    const width = asset.width ?? 0;

    if (width > 0) {
        context.resize({ width: Math.min(width, MAX_UPLOAD_WIDTH) });
    }

    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
        compress: UPLOAD_JPEG_QUALITY,
        format: SaveFormat.JPEG,
    });

    return {
        uri: saved.uri,
        name: "photo.jpg",
        type: "image/jpeg",
        size: new ExpoFile(saved.uri).size,
    };
}

export type PreparedUploadImage = {
    image: UploadImage;
    /** Why the image cannot be uploaded, or null when it passes. */
    error: string | null;
};

/**
 * Prepares a picked photo for upload: heavy or oversized files are downscaled
 * first, then the same rules the API enforces are applied up front so the user
 * hears about a rejected image before a request that would fail anyway.
 */
export async function prepareUploadImage(
    asset: ImagePickerAsset
): Promise<PreparedUploadImage> {
    const image = imageFromAsset(asset);

    // Web: the picker hands us a File, and the browser sends it untouched.
    if (image.file) {
        return { image, error: validateUploadImage(image.type, image.file.size) };
    }

    const size = asset.fileSize ?? null;
    const width = asset.width ?? 0;
    const needsShrink =
        width <= 0 ||
        size === null ||
        width > MAX_UPLOAD_WIDTH ||
        size > SHRINK_ABOVE_BYTES;

    if (!needsShrink) {
        return { image, error: validateUploadImage(image.type, size) };
    }

    try {
        const shrunk = await shrinkImage(asset);

        return {
            image: shrunk,
            error: validateUploadImage(shrunk.type, shrunk.size),
        };
    } catch {
        // Unreadable codec or no memory for the resize: fall back to the file
        // the picker gave us and let the size rules decide.
        return { image, error: validateUploadImage(image.type, size) };
    }
}

/**
 * A status-0 ApiError means the request never reached the API. When a photo was
 * attached that is usually the upload dying on a weak link, so say that instead
 * of sending the user off to check EXPO_PUBLIC_API_URL.
 */
export function uploadFailureMessage(
    caught: unknown,
    hasImage: boolean,
    fallback: string
): string {
    if (hasImage && caught instanceof ApiError && caught.status === 0) {
        return "The connection dropped before the photo finished uploading. Try again.";
    }

    return caught instanceof ApiError ? caught.message : fallback;
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
