import multer from "multer";
import { Request } from "express";

const storage = multer.memoryStorage();

const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
) => {
    const allowedImageTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
    ];
    const allowedVideoTypes = [
        "video/mp4",
        "video/mpeg",
        "video/quicktime",
        "video/x-msvideo",
    ];
    const allowedAudioTypes = ["audio/mpeg", "audio/wav", "audio/mp3"];

    const allAllowedTypes = [
        ...allowedImageTypes,
        ...allowedVideoTypes,
        ...allowedAudioTypes,
    ];

    if (allAllowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Invalid file type. Only images, videos, and audio files are allowed.",
            ),
        );
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024,
    },
});

export const uploadSingle = upload.single("file");

export const uploadMultiple = upload.array("files", 10);

export const uploadFields = upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "audio", maxCount: 1 },
]);

export const uploadProfileImage = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/jpg",
            "image/webp",
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Invalid file type. Only images (JPEG, PNG, JPG, WEBP) are allowed.",
                ),
            );
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
}).single("profileImage");

export default upload;
