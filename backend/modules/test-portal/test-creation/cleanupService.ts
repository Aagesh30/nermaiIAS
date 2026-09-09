import admin from "firebase-admin";
import { logger } from "../../../core/logger";

const db = admin.firestore();
const COLLECTION = "tests";
const QUESTIONS_COLLECTION = "questions";

/**
 * Utility to parse Firestore Timestamp / Date string / number to milliseconds
 */
function getMs(val: any): number {
    if (!val) return 0;
    if (typeof val?.toDate === "function") return val.toDate().getTime();
    if (val?._seconds) return val._seconds * 1000;
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
}

export class TestPortalCleanupService {
    private static intervalId: NodeJS.Timeout | null = null;

    /**
     * Scans for published tests whose endTime has passed and purges heavy
     * Base64 image data from Firestore questions, switching imageUrl to driveUrl.
     */
    static async cleanExpiredTestImages(): Promise<{ cleanedCount: number; errors: number }> {
        let cleanedCount = 0;
        let errors = 0;

        try {
            const now = Date.now();
            const testsSnapshot = await db.collection(COLLECTION)
                .where("isDeleted", "==", false)
                .get();

            for (const testDoc of testsSnapshot.docs) {
                const testData = testDoc.data();
                
                // Skip if already cleaned
                if (testData.isBase64Cleaned === true) {
                    continue;
                }

                // Check if test has an endTime and has expired
                if (!testData.endTime) {
                    continue;
                }

                const endTimeMs = getMs(testData.endTime);
                if (endTimeMs === 0 || now <= endTimeMs) {
                    // Not expired yet
                    continue;
                }

                logger.info(`[TestPortalCleanup] Cleaning Base64 images for expired test: ${testData.title || testDoc.id} (ended at ${new Date(endTimeMs).toISOString()})`);

                const questionIds: string[] = testData.questionIds || [];
                if (questionIds.length > 0) {
                    // Fetch question docs in chunks of 30 for FieldPath.documentId() 'in' query
                    for (let i = 0; i < questionIds.length; i += 30) {
                        const chunk = questionIds.slice(i, i + 30);
                        const qSnap = await db.collection(QUESTIONS_COLLECTION)
                            .where(admin.firestore.FieldPath.documentId(), "in", chunk)
                            .get();

                        const batch = db.batch();
                        let hasBatchUpdates = false;

                        for (const qDoc of qSnap.docs) {
                            const qData = qDoc.data();
                            const updates: Record<string, any> = {};

                            // If question has imageBase64, remove it
                            if (qData.imageBase64) {
                                updates.imageBase64 = admin.firestore.FieldValue.delete();
                            }

                            // If imageUrl was storing raw base64 data, switch to driveUrl if available
                            if (typeof qData.imageUrl === "string" && qData.imageUrl.startsWith("data:") && qData.driveUrl) {
                                updates.imageUrl = qData.driveUrl;
                            }

                            if (Object.keys(updates).length > 0) {
                                updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
                                batch.update(qDoc.ref, updates);
                                hasBatchUpdates = true;
                            }
                        }

                        if (hasBatchUpdates) {
                            await batch.commit();
                        }
                    }
                }

                // Mark test as cleaned in Firestore
                await testDoc.ref.update({
                    isBase64Cleaned: true,
                    base64CleanedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                cleanedCount++;
            }
        } catch (error: any) {
            logger.error("[TestPortalCleanup] Error running cleanExpiredTestImages:", error);
            errors++;
        }

        return { cleanedCount, errors };
    }

    /**
     * Cleans up Firestore question images when a test is deleted
     */
    static async cleanTestImagesOnDelete(testId: string): Promise<void> {
        try {
            const testDoc = await db.collection(COLLECTION).doc(testId).get();
            if (!testDoc.exists) return;

            const testData = testDoc.data()!;
            const questionIds: string[] = testData.questionIds || [];

            if (questionIds.length > 0) {
                for (let i = 0; i < questionIds.length; i += 30) {
                    const chunk = questionIds.slice(i, i + 30);
                    const qSnap = await db.collection(QUESTIONS_COLLECTION)
                        .where(admin.firestore.FieldPath.documentId(), "in", chunk)
                        .get();

                    const batch = db.batch();
                    for (const qDoc of qSnap.docs) {
                        const qData = qDoc.data();
                        const updates: Record<string, any> = {
                            isDeleted: true,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        };
                        if (qData.imageBase64) {
                            updates.imageBase64 = admin.firestore.FieldValue.delete();
                        }
                        if (typeof qData.imageUrl === "string" && qData.imageUrl.startsWith("data:") && qData.driveUrl) {
                            updates.imageUrl = qData.driveUrl;
                        }
                        batch.update(qDoc.ref, updates);
                    }
                    await batch.commit();
                }
            }

            await testDoc.ref.update({
                isBase64Cleaned: true,
                base64CleanedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            logger.info(`[TestPortalCleanup] Successfully purged Base64 images for deleted test: ${testId}`);
        } catch (error: any) {
            logger.warn(`[TestPortalCleanup] Non-critical error during cleanTestImagesOnDelete for ${testId}:`, error);
        }
    }

    /**
     * Starts background periodic timer (runs every 15 minutes)
     */
    static startPeriodicCleanup(intervalMs: number = 15 * 60 * 1000): void {
        if (this.intervalId) return;

        // Run once 1 minute after server boot, then every intervalMs
        setTimeout(() => {
            this.cleanExpiredTestImages().catch(() => {});
        }, 60 * 1000);

        this.intervalId = setInterval(() => {
            this.cleanExpiredTestImages().catch(() => {});
        }, intervalMs);

        // Allow process to exit cleanly if needed
        if (this.intervalId.unref) {
            this.intervalId.unref();
        }
    }
}
