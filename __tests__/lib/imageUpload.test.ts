import type { ImagePickerAsset } from "expo-image-picker";

import { prepareUploadImage, uploadFailureMessage } from "@/lib/imageUpload";
import { ApiError } from "@/types/api";

const mockResize = jest.fn();
const mockRenderAsync = jest.fn();
const mockSaveAsync = jest.fn();
const mockManipulate = jest.fn();
const mockCopyAsync = jest.fn().mockResolvedValue(undefined);
const mockDeleteAsync = jest.fn().mockResolvedValue(undefined);
let mockShrunkSize = 300 * 1024;

jest.mock("expo-image-manipulator", () => ({
    ImageManipulator: {
        manipulate: (...args: unknown[]) => mockManipulate(...args),
    },
    SaveFormat: { JPEG: "jpeg" },
}));

jest.mock("expo-file-system/legacy", () => ({
    cacheDirectory: "file:///cache/",
    getInfoAsync: jest.fn().mockImplementation(async () => ({
        exists: true,
        size: mockShrunkSize,
    })),
    copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
    deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
}));

function makeAsset(
    overrides: Partial<ImagePickerAsset> = {}
): ImagePickerAsset {
    return {
        uri: "file:///cache/IMG_1234.jpg",
        width: 800,
        height: 600,
        fileName: "IMG_1234.jpg",
        mimeType: "image/jpeg",
        fileSize: 200 * 1024,
        ...overrides,
    } as ImagePickerAsset;
}

function makeWebAsset(file: Partial<File>): ImagePickerAsset {
    return makeAsset({
        uri: "blob:http://localhost/abc",
        width: undefined,
        height: undefined,
        fileName: undefined,
        mimeType: undefined,
        fileSize: undefined,
        file: file as File,
    });
}

beforeEach(() => {
    jest.clearAllMocks();
    mockShrunkSize = 300 * 1024;
    mockManipulate.mockReturnValue({
        resize: mockResize,
        renderAsync: mockRenderAsync,
    });
    mockRenderAsync.mockResolvedValue({ saveAsync: mockSaveAsync });
    mockSaveAsync.mockResolvedValue({
        uri: "file:///cache/shrunk.jpg",
        width: 1600,
        height: 1200,
    });
});

describe("prepareUploadImage", () => {
    it("keeps a small photo exactly as the picker gave it", async () => {
        const { image, error } = await prepareUploadImage(makeAsset());

        expect(error).toBeNull();
        expect(mockManipulate).not.toHaveBeenCalled();
        expect(image).toEqual({
            uri: "file:///cache/IMG_1234.jpg",
            name: "IMG_1234.jpg",
            type: "image/jpeg",
        });
    });

    it("downscales a wide camera photo and uploads the smaller file", async () => {
        const { image, error } = await prepareUploadImage(
            makeAsset({ width: 4032, height: 3024, fileSize: 3 * 1024 * 1024 })
        );

        expect(error).toBeNull();
        expect(mockResize).toHaveBeenCalledWith({ width: 1600 });
        expect(image).toEqual({
            uri: "file:///cache/shrunk.jpg",
            name: "photo.jpg",
            type: "image/jpeg",
            size: 300 * 1024,
        });
    });

    it("downscales a heavy photo even when it is not wide", async () => {
        await prepareUploadImage(
            makeAsset({ width: 1200, fileSize: 2 * 1024 * 1024 })
        );

        expect(mockManipulate).toHaveBeenCalledWith("file:///cache/IMG_1234.jpg");
    });

    it("copies an Android content:// URI to cache before manipulating", async () => {
        const { image, error } = await prepareUploadImage(
            makeAsset({
                uri: "content://media/external/images/media/41235",
                width: 4032,
                height: 3024,
                fileSize: 4 * 1024 * 1024,
            })
        );

        expect(error).toBeNull();
        expect(mockCopyAsync).toHaveBeenCalled();
        expect(mockManipulate).toHaveBeenCalledWith(
            expect.stringContaining("temp_shrink_")
        );
        expect(mockDeleteAsync).toHaveBeenCalled();
        expect(image.uri).toBe("file:///cache/shrunk.jpg");
    });

    it("never enlarges a photo whose dimensions are unknown", async () => {
        await prepareUploadImage(
            makeAsset({ width: undefined, height: undefined, fileSize: undefined })
        );

        expect(mockManipulate).toHaveBeenCalled();
        expect(mockResize).not.toHaveBeenCalled();
    });

    it("rejects the result when even the downscaled file is over the limit", async () => {
        mockShrunkSize = 6 * 1024 * 1024;

        const { error } = await prepareUploadImage(
            makeAsset({ width: 4032, fileSize: 3 * 1024 * 1024 })
        );

        expect(error).toBe("Image must be 5MB or smaller.");
    });

    it("falls back to the picked file when the resize fails", async () => {
        mockManipulate.mockImplementation(() => {
            throw new Error("unsupported codec");
        });

        const { image, error } = await prepareUploadImage(
            makeAsset({ width: 4032, fileSize: 3 * 1024 * 1024 })
        );

        expect(error).toBeNull();
        expect(image.uri).toBe("file:///cache/IMG_1234.jpg");
    });

    it("sends a browser File untouched, good or bad", async () => {
        const bad = await prepareUploadImage(
            makeWebAsset({ name: "anim.gif", type: "image/gif", size: 100 })
        );
        const good = await prepareUploadImage(
            makeWebAsset({ name: "pic.png", type: "image/png", size: 1024 })
        );

        expect(bad.error).toBe("Only JPG, PNG, WebP images are allowed.");
        expect(mockManipulate).not.toHaveBeenCalled();
        expect(good.error).toBeNull();
    });
});

describe("uploadFailureMessage", () => {
    const unreachable = new ApiError(
        0,
        "Cannot reach the server at http://192.168.137.1:5289. Check that the backend is running and EXPO_PUBLIC_API_URL points at this machine.",
        null
    );

    it("blames the dropped upload, not the API URL, when a photo was attached", () => {
        const message = uploadFailureMessage(unreachable, true, "Could not create the post.");

        expect(message).toBe(
            "The connection dropped before the photo finished uploading. Try again."
        );
        expect(message).not.toContain("EXPO_PUBLIC_API_URL");
    });

    it("keeps the API message when there was no photo to upload", () => {
        expect(
            uploadFailureMessage(unreachable, false, "Could not create the post.")
        ).toBe(unreachable.message);
    });

    it("keeps the server's own message for an HTTP error", () => {
        expect(
            uploadFailureMessage(
                new ApiError(500, "Server Error", null),
                true,
                "Could not create the post."
            )
        ).toBe("Server Error");
    });

    it("uses the caller's fallback for a non-API failure", () => {
        expect(
            uploadFailureMessage(new Error("boom"), true, "Could not create the post.")
        ).toBe("Could not create the post.");
    });
});
