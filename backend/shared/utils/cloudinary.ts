import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary using environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "a75kib8t",
    api_key: process.env.CLOUDINARY_API_KEY || "142513215157686",
    api_secret: process.env.CLOUDINARY_API_SECRET || "YuaiR_Syak23RHTGvMvK53KVU24",
    secure: true
});

/**
 * Upload image types for student documents
 */
export type StudentImageType = "passport_photo" | "photo_id";

/**
 * Upload options per image type:
 * - passport_photo: Resized to max 400×500 (face crop), JPEG/WebP, ~80-200 KB stored
 * - photo_id:       Resized to max 1000×700 (limit), JPEG/WebP, ~150-500 KB stored
 *
 * All uploads are stored with quality:85/80 + fetch_format:auto (WebP where possible).
 * Display URLs use f_auto,q_auto for intelligent delivery optimization.
 */
const UPLOAD_PRESETS: Record<StudentImageType, {
    width: number;
    height: number;
    crop: string;
    quality: number;
    folder: string;
}> = {
    passport_photo: {
        width: 400,
        height: 500,
        crop: "fill",       // Fills to exact dimensions, smart gravity-face crop
        quality: 85,        // High quality – ~80-200 KB typical passport shot
        folder: "nermai-ias/students/passport"
    },
    photo_id: {
        width: 1000,
        height: 700,
        crop: "limit",      // Shrinks only if larger, preserves aspect ratio
        quality: 80,        // Good quality for ID verification – ~150-500 KB
        folder: "nermai-ias/students/photo-id"
    }
};

/**
 * Uploads a base64-encoded image to Cloudinary with optimized transformations.
 * Returns the public_id and an optimized display URL (f_auto, q_auto).
 */
export async function uploadStudentImage(
    base64Data: string,
    imageType: StudentImageType,
    studentId: string
): Promise<{ publicId: string; url: string; displayUrl: string }> {
    if (!base64Data || base64Data === "test") {
        throw new Error("No valid image data provided");
    }

    // Ensure it's a proper data URI
    const dataUri = base64Data.startsWith("data:")
        ? base64Data
        : `data:image/jpeg;base64,${base64Data}`;

    const preset = UPLOAD_PRESETS[imageType];
    const safeId = studentId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const publicId = `${preset.folder}/${safeId}_${imageType}`;

    const result = await cloudinary.uploader.upload(dataUri, {
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
        // Resize/crop/compress on upload for consistent stored size
        transformation: [
            {
                width: preset.width,
                height: preset.height,
                crop: preset.crop,
                ...(imageType === "passport_photo" ? { gravity: "face" } : {}),
                quality: preset.quality,
                fetch_format: "auto"  // Store as WebP where Cloudinary supports it
            }
        ],
        tags: ["nermai-ias", "student", imageType, safeId]
    });

    // Generate optimized delivery URL: f_auto (best format), q_auto (best quality/size ratio)
    const displayUrl = cloudinary.url(result.public_id, {
        transformation: [{ fetch_format: "auto", quality: "auto" }],
        secure: true
    });

    return {
        publicId: result.public_id,
        url: result.secure_url,    // Raw stored URL
        displayUrl                  // f_auto, q_auto delivery URL for browsers
    };
}

/**
 * Deletes a student image from Cloudinary by its public_id.
 * Non-fatal – logs a warning on failure rather than throwing.
 */
export async function deleteStudentImage(publicId: string): Promise<void> {
    try {
        if (publicId) {
            await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
        }
    } catch (err) {
        console.warn(`[Cloudinary] Failed to delete ${publicId}:`, err);
    }
}

/**
 * Generates an optimized delivery URL for an existing Cloudinary public_id.
 * Use when serving images to clients: applies f_auto, q_auto for best performance.
 */
export function getOptimizedUrl(publicId: string): string {
    if (!publicId) return "";
    return cloudinary.url(publicId, {
        transformation: [{ fetch_format: "auto", quality: "auto" }],
        secure: true
    });
}
