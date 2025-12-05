import cloudinary from "../config/cloudinary";
import { Readable } from "stream";

interface UploadResult {
    success: boolean;
    url?: string;
    publicId?: string;
    secureUrl?: string;
    format?: string;
    resourceType?: string;
    error?: string;
}

export class CloudinaryUploadService {
    async uploadImage(
        file: Express.Multer.File,
        folder: string = "steadygig/images",
    ): Promise<UploadResult> {
        try {
            return new Promise((resolve) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder,
                        resource_type: "image",
                        transformation: [
                            { width: 1000, height: 1000, crop: "limit" },
                            { quality: "auto" },
                            { fetch_format: "auto" },
                        ],
                    },
                    (error, result) => {
                        if (error) {
                            console.error("Cloudinary upload error:", error);
                            resolve({
                                success: false,
                                error:
                                    error.message || "Failed to upload image",
                            });
                        } else if (result) {
                            resolve({
                                success: true,
                                url: result.url,
                                secureUrl: result.secure_url,
                                publicId: result.public_id,
                                format: result.format,
                                resourceType: result.resource_type,
                            });
                        }
                    },
                );

                const readableStream = Readable.from(file.buffer);
                readableStream.pipe(uploadStream);
            });
        } catch (error: any) {
            console.error("Upload service error:", error);
            return {
                success: false,
                error: error.message || "Failed to upload image",
            };
        }
    }

    async uploadVideo(
        file: Express.Multer.File,
        folder: string = "steadygig/videos",
    ): Promise<UploadResult> {
        try {
            return new Promise((resolve) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder,
                        resource_type: "video",
                        transformation: [
                            { quality: "auto" },
                            { fetch_format: "auto" },
                        ],
                    },
                    (error, result) => {
                        if (error) {
                            console.error(
                                "Cloudinary video upload error:",
                                error,
                            );
                            resolve({
                                success: false,
                                error:
                                    error.message || "Failed to upload video",
                            });
                        } else if (result) {
                            resolve({
                                success: true,
                                url: result.url,
                                secureUrl: result.secure_url,
                                publicId: result.public_id,
                                format: result.format,
                                resourceType: result.resource_type,
                            });
                        }
                    },
                );

                const readableStream = Readable.from(file.buffer);
                readableStream.pipe(uploadStream);
            });
        } catch (error: any) {
            console.error("Upload service error:", error);
            return {
                success: false,
                error: error.message || "Failed to upload video",
            };
        }
    }

    async uploadAudio(
        file: Express.Multer.File,
        folder: string = "steadygig/audio",
    ): Promise<UploadResult> {
        try {
            return new Promise((resolve) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder,
                        resource_type: "video",
                    },
                    (error, result) => {
                        if (error) {
                            console.error(
                                "Cloudinary audio upload error:",
                                error,
                            );
                            resolve({
                                success: false,
                                error:
                                    error.message || "Failed to upload audio",
                            });
                        } else if (result) {
                            resolve({
                                success: true,
                                url: result.url,
                                secureUrl: result.secure_url,
                                publicId: result.public_id,
                                format: result.format,
                                resourceType: result.resource_type,
                            });
                        }
                    },
                );

                const readableStream = Readable.from(file.buffer);
                readableStream.pipe(uploadStream);
            });
        } catch (error: any) {
            console.error("Upload service error:", error);
            return {
                success: false,
                error: error.message || "Failed to upload audio",
            };
        }
    }

    async deleteFile(
        publicId: string,
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const result = await cloudinary.uploader.destroy(publicId);
            if (result.result === "ok") {
                return { success: true };
            } else {
                return {
                    success: false,
                    error: "Failed to delete file from Cloudinary",
                };
            }
        } catch (error: any) {
            console.error("Cloudinary delete error:", error);
            return {
                success: false,
                error: error.message || "Failed to delete file",
            };
        }
    }

    generateThumbnail(videoPublicId: string): string {
        return cloudinary.url(videoPublicId, {
            resource_type: "video",
            transformation: [
                { width: 300, height: 300, crop: "fill" },
                { quality: "auto" },
                { fetch_format: "jpg" },
            ],
            format: "jpg",
        });
    }

    determineFileType(mimetype: string): "image" | "video" | "audio" {
        if (mimetype.startsWith("image/")) return "image";
        if (mimetype.startsWith("video/")) return "video";
        if (mimetype.startsWith("audio/")) return "audio";
        return "image";
    }
}

export default new CloudinaryUploadService();
