import { File as ExpoFile } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { ImagePickerAsset } from "expo-image-picker";

import { ApiError } from "@/types/api";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
    uri: string;
    name: string;
    type: string;
    size?: number;
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

export function imageFromAsset(asset: ImagePickerAsset): UploadImage {
    if (asset.file) {
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
    error: string | null;
};

export async function prepareUploadImage(
    asset: ImagePickerAsset
): Promise<PreparedUploadImage> {
    const image = imageFromAsset(asset);

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
        return { image, error: validateUploadImage(image.type, size) };
    }
}

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
