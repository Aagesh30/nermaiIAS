import { Request, Response } from "express";
import admin from "firebase-admin";
import { randomUUID } from "crypto";
import { testQuestionsCache, testDetailsCache, attemptCache } from "../../../shared/utils/cache";

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8",
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();

export class ExaminationController {
    // In-memory Set to act as locks for double-start protection
    private static startingSet = new Set<string>();

    private static getMs(val: any): number {
        if (!val) return Date.now();
        if (typeof val.toDate === "function") return val.toDate().getTime();
        if (val._seconds) return val._seconds * 1000;
        if (typeof val === "string" && val.includes("T") && !val.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(val)) {
            return new Date(val + "+05:30").getTime();
        }
        return new Date(val).getTime();
    }

    private static getStudentId(req: Request): string {
        if (!req.user) {
            throw new Error("Authentication required");
        }
        const { role, userId, studentId } = req.user;
        if (role === "admin" || role === "super_admin" || role === "staff") {
            const target = req.body?.studentId || req.query?.studentId || req.params?.studentId || studentId || userId;
            return String(target);
        }
        // For students, ALWAYS use their verified auth identity from JWT/Firebase claims
        return String(studentId || userId);
    }

    private static async handleAutoSubmit(attemptId: string) {
        attemptCache.delete(`attempt_${attemptId}`); // Clear cache before writing to DB
        const attemptRef = db.collection("student_attempts").doc(attemptId);
        await attemptRef.update({
            status: "submitted",
            isSubmitted: true,
            submittedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    /**
     * START TEST
     * POST /start/:testId
     */
    static async startTest(req: Request, res: Response) {
        const { testId } = req.params;
        let studentId = "";
        try {
            studentId = ExaminationController.getStudentId(req);
        } catch (e: any) {
            return res.status(400).json({ success: false, message: e.message });
        }

        const lockKey = `${studentId}:${testId}`;
        if (ExaminationController.startingSet.has(lockKey)) {
            return res.status(429).json({
                success: false,
                message: "A test start request is already in progress. Please wait."
            });
        }
        ExaminationController.startingSet.add(lockKey);

        try {
            // Block admin/staff — they can only monitor tests.
            // SECURITY: Use req.user.role (verified by JWT middleware), NOT req.headers["user-role"] (client-controlled).
            const role = req.user!.role;
            if (role === "admin" || role === "staff" || role === "super_admin") {
                return res.status(403).json({
                    success: false,
                    message: "Admins and staff cannot take tests. Use the Admin panel to monitor live results."
                });
            }

            // High Concurrency Cache for Test Details
            let test = testDetailsCache.get<any>(`test_${testId}`);
            if (!test) {
                const testDoc = await db.collection("tests").doc(testId).get();
                if (!testDoc.exists) {
                    return res.status(404).json({
                        success: false,
                        message: "Test not found"
                    });
                }
                test = testDoc.data()!;
                testDetailsCache.set(`test_${testId}`, test, 600);
            }
            if (test.isDeleted) {
                return res.status(400).json({
                    success: false,
                    message: "This test has been deleted"
                });
            }

            if (!test.published) {
                return res.status(400).json({
                    success: false,
                    message: "This test is not published yet"
                });
            }

            const now = Date.now();

            // Enforce scheduled start time
            if (test.startTime) {
                const startTimeMs = ExaminationController.getMs(test.startTime);
                if (now < startTimeMs) {
                    const diffMs = startTimeMs - now;
                    const diffMin = Math.ceil(diffMs / 60000);
                    return res.status(400).json({
                        success: false,
                        message: `This test has not started yet. It starts in ${diffMin} minute(s).`
                    });
                }
            }

            if (test.endTime) {
                const endTimeMs = ExaminationController.getMs(test.endTime);
                if (now > endTimeMs) {
                    return res.status(400).json({
                        success: false,
                        message: "This test has expired"
                    });
                }
            }

            // Check max attempts
            const attemptsSnapshot = await db.collection("student_attempts")
                .where("testId", "==", testId)
                .where("studentId", "==", studentId)
                .where("isDeleted", "==", false)
                .get();

            const completedAttemptsCount = attemptsSnapshot.docs.filter(
                doc => doc.data().status === "submitted" || doc.data().status === "evaluated" || doc.data().isSubmitted === true
            ).length;

            const maxAttempts = test.maxAttempts !== undefined ? Number(test.maxAttempts) : (test.allowMultipleAttempts ? 999 : 1);
            if (completedAttemptsCount >= maxAttempts) {
                return res.status(400).json({
                    success: false,
                    message: `You have already completed this test. Use "Review Answers" to revisit your submission.`
                });
            }

            const attemptId = randomUUID();

            // Duration: prefer explicit durationMinutes, otherwise derive from startTime–endTime window
            let durationMinutes = test.durationMinutes || 60;
            if (test.startTime && test.endTime) {
                const windowMs = ExaminationController.getMs(test.endTime) - ExaminationController.getMs(test.startTime);
                const windowMin = Math.floor(windowMs / 60000);
                if (windowMin > 0) durationMinutes = windowMin;
            }

            // Attempt end = min(now + duration, test.endTime)
            const startTime = admin.firestore.FieldValue.serverTimestamp();
            const attemptEndTimeMs = now + durationMinutes * 60 * 1000;
            let finalEndTime = new Date(attemptEndTimeMs);
            if (test.endTime) {
                const testEndTimeMs = ExaminationController.getMs(test.endTime);
                if (finalEndTime.getTime() > testEndTimeMs) {
                    finalEndTime = new Date(testEndTimeMs);
                }
            }

            const remainingSeconds = Math.max(0, Math.floor((finalEndTime.getTime() - now) / 1000));

            const attemptPayload = {
                id: attemptId,
                testId,
                studentId,
                status: "started",
                isSubmitted: false,
                submittedAt: null,
                startTime,
                endTime: admin.firestore.Timestamp.fromDate(finalEndTime),
                durationMinutes,
                lastActiveAt: startTime,
                isDeleted: false,
                createdAt: startTime,
                updatedAt: startTime
            };

            await db.collection("student_attempts").doc(attemptId).set(attemptPayload);

            // Seed it in attemptCache
            attemptCache.set(`attempt_${attemptId}`, attemptPayload, 15);

            return res.status(200).json({
                success: true,
                message: "Test started successfully",
                data: {
                    attemptId,
                    testId,
                    testTitle: test.title || "",
                    durationMinutes,
                    endTime: finalEndTime.toISOString(),
                    remainingTime: remainingSeconds
                }
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while starting the test"
            });
        } finally {
            ExaminationController.startingSet.delete(lockKey);
        }
    }

    /**
     * RESUME TEST
     * GET /resume/:attemptId
     */
    static async resumeTest(req: Request, res: Response) {
        try {
            const { attemptId } = req.params;
            const studentId = ExaminationController.getStudentId(req);

            let attempt = attemptCache.get<any>(`attempt_${attemptId}`);
            if (!attempt) {
                const attemptDoc = await db.collection("student_attempts").doc(attemptId).get();
                if (!attemptDoc.exists) {
                    return res.status(404).json({
                        success: false,
                        message: "Test attempt not found"
                    });
                }
                attempt = attemptDoc.data()!;
                attemptCache.set(`attempt_${attemptId}`, attempt, 15);
            }

            if (attempt.isDeleted) {
                return res.status(400).json({
                    success: false,
                    message: "This test attempt has been deleted"
                });
            }

            if (attempt.studentId !== studentId) {
                return res.status(403).json({
                    success: false,
                    message: "You are not authorized to access this test attempt"
                });
            }

            if (attempt.isSubmitted || attempt.status === "submitted") {
                return res.status(400).json({
                    success: false,
                    message: "This test has already been submitted"
                });
            }

            // Verify the test itself
            const testDoc = await db.collection("tests").doc(attempt.testId).get();
            if (!testDoc.exists || testDoc.data()!.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Associated test not found or deleted"
                });
            }

            const test = testDoc.data()!;
            if (!test.published) {
                return res.status(400).json({
                    success: false,
                    message: "The associated test is no longer published"
                });
            }

            const endTimeMs = ExaminationController.getMs(attempt.endTime);
            const now = Date.now();
            const remainingTime = Math.max(0, Math.floor((endTimeMs - now) / 1000));

            if (remainingTime <= 0) {
                await ExaminationController.handleAutoSubmit(attemptId);
                return res.status(400).json({
                    success: false,
                    message: "Time has expired. Test has been auto-submitted."
                });
            }

            // Update last active
            await db.collection("student_attempts").doc(attemptId).update({
                lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Find last answered question: use simple where (no orderBy) to avoid
            // requiring a composite Firestore index while it is still building.
            // The frontend fetches the full answer list via /progress anyway.
            let lastAnsweredQuestionId = null;
            try {
                const answersSnapshot = await db.collection("student_answers")
                    .where("attemptId", "==", attemptId)
                    .limit(1)
                    .get();
                if (!answersSnapshot.empty) {
                    lastAnsweredQuestionId = answersSnapshot.docs[0].data().questionId;
                }
            } catch (_) {
                // Non-critical — frontend will recover progress via /progress endpoint
            }

            return res.status(200).json({
                success: true,
                message: "Test resumed successfully",
                data: {
                    attemptId,
                    testId: attempt.testId,
                    status: "started",
                    endTime: new Date(endTimeMs).toISOString(),
                    remainingTime,
                    lastAnsweredQuestionId
                }
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while resuming the test"
            });
        }
    }

    /**
     * GET TEST QUESTIONS
     * GET /questions/:attemptId
     */
    static async getQuestions(req: Request, res: Response) {
        try {
            const { attemptId } = req.params;
            const studentId = ExaminationController.getStudentId(req);

            let attempt = attemptCache.get<any>(`attempt_${attemptId}`);
            if (!attempt) {
                const attemptDoc = await db.collection("student_attempts").doc(attemptId).get();
                if (!attemptDoc.exists) {
                    return res.status(404).json({
                        success: false,
                        message: "Test attempt not found"
                    });
                }
                attempt = attemptDoc.data()!;
                attemptCache.set(`attempt_${attemptId}`, attempt, 15);
            }

            if (attempt.isDeleted || attempt.studentId !== studentId) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            if (attempt.isSubmitted || attempt.status === "submitted") {
                return res.status(400).json({
                    success: false,
                    message: "Cannot get questions for a submitted test"
                });
            }

            // High Concurrency Optimization: Check memory cache for test questions
            const cacheKey = `questions_${attempt.testId}`;

            // Set Firebase Hosting CDN Edge Caching headers (10 mins CDN edge cache)
            res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600, stale-while-revalidate=60");

            const cachedQuestions = testQuestionsCache.get<any[]>(cacheKey);
            if (cachedQuestions) {
                const etag = `W/"${attempt.testId}-${cachedQuestions.length}"`;
                res.setHeader("ETag", etag);
                if (req.headers["if-none-match"] === etag) {
                    return res.status(304).end();
                }
                return res.status(200).json({
                    success: true,
                    message: "Questions retrieved successfully",
                    data: cachedQuestions
                });
            }

            const testDoc = await db.collection("tests").doc(attempt.testId).get();
            if (!testDoc.exists || testDoc.data()!.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Associated test not found or deleted"
                });
            }

            const test = testDoc.data()!;
            const questionIds = test.questionIds || [];
            if (questionIds.length === 0) {
                return res.status(200).json({
                    success: true,
                    data: []
                });
            }

            // Fetch questions. We can fetch them in batches or all at once since db.getAll is efficient
            const questionRefs = questionIds.map((id: string) => db.collection("questions").doc(id));
            const questionDocs = await db.getAll(...questionRefs);

            const cleanedQuestions = questionDocs
                .filter(doc => doc.exists && !doc.data()?.isDeleted)
                .map(doc => {
                    const data = doc.data()!;
                    
                    // Normalize options and optionsTa arrays
                    let options: string[] = [];
                    let optionsTa: string[] = [];
                    
                    if (data.options && Array.isArray(data.options)) {
                        options = data.options.map((o: any) => typeof o === "string" ? o : (o?.en || ""));
                    } else if (data.options && typeof data.options === "object") {
                        options = [
                            data.options.A?.en || data.options.A || "",
                            data.options.B?.en || data.options.B || "",
                            data.options.C?.en || data.options.C || "",
                            data.options.D?.en || data.options.D || ""
                        ];
                    }
                    
                    if (data.optionsTa && Array.isArray(data.optionsTa)) {
                        optionsTa = data.optionsTa.map((o: any) => typeof o === "string" ? o : (o?.ta || ""));
                    } else if (data.options && typeof data.options === "object") {
                        optionsTa = [
                            data.options.A?.ta || "",
                            data.options.B?.ta || "",
                            data.options.C?.ta || "",
                            data.options.D?.ta || ""
                        ];
                    }
                    
                    // Ensure length is exactly 4
                    while (options.length < 4) options.push("");
                    while (optionsTa.length < 4) optionsTa.push("");
                    
                    // Fallback to cross-lingual option or placeholder if empty to prevent empty options/mismatches
                    for (let i = 0; i < 4; i++) {
                        options[i] = String(options[i] || "").trim();
                        optionsTa[i] = String(optionsTa[i] || "").trim();
                        
                        if (!options[i] && optionsTa[i]) options[i] = optionsTa[i];
                        if (!optionsTa[i] && options[i]) optionsTa[i] = options[i];
                        
                        const letter = ["A", "B", "C", "D"][i];
                        if (!options[i]) options[i] = `Option ${letter}`;
                        if (!optionsTa[i]) optionsTa[i] = `விடை ${letter}`;
                    }

                    // EXTREMELY IMPORTANT: Never send correct answers, correct options or explanations to the client
                    const {
                        correctAnswer,
                        correctOption,
                        correctOptions,
                        answer,
                        answerKey,
                        explanation,
                        explanationTa,
                        solution,
                        solutionTa,
                        isDeleted,
                        createdAt,
                        updatedAt,
                        createdBy,
                        updatedBy,
                        ...clientQuestion
                    } = data;
                    
                    return {
                        ...clientQuestion,
                        options,
                        optionsTa
                    };
                });

            // Cache cleaned questions in memory for 15 minutes
            testQuestionsCache.set(cacheKey, cleanedQuestions, 900);

            const etag = `W/"${attempt.testId}-${cleanedQuestions.length}"`;
            res.setHeader("ETag", etag);
            if (req.headers["if-none-match"] === etag) {
                return res.status(304).end();
            }

            return res.status(200).json({
                success: true,
                message: "Questions retrieved successfully",
                data: cleanedQuestions
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving questions"
            });
        }
    }

    /**
     * SAVE SINGLE ANSWER
     * POST /answer/:attemptId
     */
    static async saveAnswer(req: Request, res: Response) {
        try {
            const { attemptId } = req.params;
            const { questionId, answer } = req.body;
            const studentId = ExaminationController.getStudentId(req);

            if (!questionId) {
                return res.status(400).json({
                    success: false,
                    message: "Question ID is required"
                });
            }

            let attempt = attemptCache.get<any>(`attempt_${attemptId}`);
            if (!attempt) {
                const attemptDoc = await db.collection("student_attempts").doc(attemptId).get();
                if (!attemptDoc.exists) {
                    return res.status(404).json({
                        success: false,
                        message: "Attempt not found"
                    });
                }
                attempt = attemptDoc.data()!;
                attemptCache.set(`attempt_${attemptId}`, attempt, 15);
            }

            if (attempt.isDeleted || attempt.studentId !== studentId) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            if (attempt.isSubmitted || attempt.status === "submitted" || attempt.status === "evaluated") {
                return res.status(400).json({
                    success: false,
                    message: "Cannot save answer for a submitted test"
                });
            }

            const endTimeMs = ExaminationController.getMs(attempt.endTime);
            if (Date.now() > endTimeMs) {
                await ExaminationController.handleAutoSubmit(attemptId);
                return res.status(400).json({
                    success: false,
                    message: "Time has expired. Test has been auto-submitted."
                });
            }

            const answerDocId = `${attemptId}_${questionId}`;
            const answerRef = db.collection("student_answers").doc(answerDocId);

            const payload = {
                id: answerDocId,
                attemptId,
                studentId,
                testId: attempt.testId,
                questionId,
                selectedAnswer: answer !== undefined ? answer : null,
                savedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            await answerRef.set(payload, { merge: true });

            await db.collection("student_attempts").doc(attemptId).update({
                lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return res.status(200).json({
                success: true,
                message: "Answer saved successfully",
                data: {
                    questionId,
                    savedAt: new Date().toISOString()
                }
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while saving the answer"
            });
        }
    }

    /**
     * AUTO SAVE
     * POST /autosave/:attemptId
     */
    static async autoSave(req: Request, res: Response) {
        try {
            const { attemptId } = req.params;
            const { answers } = req.body; // Expects array of { questionId, answer }
            const studentId = ExaminationController.getStudentId(req);

            if (!answers || !Array.isArray(answers)) {
                return res.status(400).json({
                    success: false,
                    message: "answers array is required"
                });
            }

            let attempt = attemptCache.get<any>(`attempt_${attemptId}`);
            if (!attempt) {
                const attemptDoc = await db.collection("student_attempts").doc(attemptId).get();
                if (!attemptDoc.exists) {
                    return res.status(404).json({
                        success: false,
                        message: "Attempt not found"
                    });
                }
                attempt = attemptDoc.data()!;
                attemptCache.set(`attempt_${attemptId}`, attempt, 15);
            }

            if (attempt.isDeleted || attempt.studentId !== studentId) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            if (attempt.isSubmitted || attempt.status === "submitted" || attempt.status === "evaluated") {
                return res.status(200).json({
                    success: true,
                    message: "Cannot auto-save for a submitted test",
                    data: { countSaved: 0 }
                });
            }

            const endTimeMs = ExaminationController.getMs(attempt.endTime);
            if (Date.now() > endTimeMs) {
                await ExaminationController.handleAutoSubmit(attemptId);
                return res.status(400).json({
                    success: false,
                    message: "Time has expired. Test has been auto-submitted."
                });
            }

            if (answers.length > 0) {
                const batch = db.batch();
                for (const item of answers) {
                    if (!item.questionId) continue;
                    const answerDocId = `${attemptId}_${item.questionId}`;
                    const answerRef = db.collection("student_answers").doc(answerDocId);
                    batch.set(answerRef, {
                        id: answerDocId,
                        attemptId,
                        studentId,
                        testId: attempt.testId,
                        questionId: item.questionId,
                        selectedAnswer: item.answer !== undefined ? item.answer : null,
                        savedAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }
                await batch.commit();
            }

            await db.collection("student_attempts").doc(attemptId).update({
                lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return res.status(200).json({
                success: true,
                message: "Progress auto-saved successfully",
                data: {
                    countSaved: answers.length,
                    savedAt: new Date().toISOString()
                }
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred during auto-save"
            });
        }
    }

    /**
     * GET CURRENT PROGRESS
     * GET /progress/:attemptId
     */
    static async getProgress(req: Request, res: Response) {
        try {
            const { attemptId } = req.params;
            const studentId = ExaminationController.getStudentId(req);

            let attempt = attemptCache.get<any>(`attempt_${attemptId}`);
            if (!attempt) {
                const attemptDoc = await db.collection("student_attempts").doc(attemptId).get();
                if (!attemptDoc.exists) {
                    return res.status(404).json({
                        success: false,
                        message: "Attempt not found"
                    });
                }
                attempt = attemptDoc.data()!;
                attemptCache.set(`attempt_${attemptId}`, attempt, 15);
            }

            if (attempt.isDeleted || attempt.studentId !== studentId) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            const testDoc = await db.collection("tests").doc(attempt.testId).get();
            if (!testDoc.exists) {
                return res.status(404).json({
                    success: false,
                    message: "Associated test not found"
                });
            }

            const test = testDoc.data()!;
            const totalQuestions = test.questionIds ? test.questionIds.length : 0;

            const answersSnapshot = await db.collection("student_answers")
                .where("attemptId", "==", attemptId)
                .get();

            const answeredQuestionIds = answersSnapshot.docs
                .filter(doc => doc.data().selectedAnswer !== null && doc.data().selectedAnswer !== undefined && doc.data().selectedAnswer !== "")
                .map(doc => doc.data().questionId);

            const answeredCount = answeredQuestionIds.length;
            const remainingCount = Math.max(0, totalQuestions - answeredCount);

            return res.status(200).json({
                success: true,
                message: "Progress retrieved successfully",
                data: {
                    totalQuestions,
                    answeredQuestions: answeredCount,
                    remainingQuestions: remainingCount,
                    answeredQuestionIds
                }
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving progress"
            });
        }
    }

    /**
     * SUBMIT TEST
     * POST /submit/:attemptId
     */
    static async submitTest(req: Request, res: Response) {
        try {
            const { attemptId } = req.params;
            const studentId = ExaminationController.getStudentId(req);

            let attempt = attemptCache.get<any>(`attempt_${attemptId}`);
            if (!attempt) {
                const attemptDoc = await db.collection("student_attempts").doc(attemptId).get();
                if (!attemptDoc.exists) {
                    return res.status(404).json({
                        success: false,
                        message: "Attempt not found"
                    });
                }
                attempt = attemptDoc.data()!;
                attemptCache.set(`attempt_${attemptId}`, attempt, 15);
            }

            if (attempt.isDeleted || attempt.studentId !== studentId) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            if (attempt.isSubmitted || attempt.status === "submitted" || attempt.status === "evaluated") {
                return res.status(200).json({
                    success: true,
                    message: "Test is already submitted",
                    data: {
                        attemptId,
                        status: attempt.status || "submitted",
                        submittedAt: attempt.submittedAt || new Date().toISOString()
                    }
                });
            }

            // Invalidate the cache item before writing status update to database
            attemptCache.delete(`attempt_${attemptId}`);

            const submissionTime = admin.firestore.FieldValue.serverTimestamp();
            await db.collection("student_attempts").doc(attemptId).update({
                status: "submitted",
                isSubmitted: true,
                submittedAt: submissionTime,
                updatedAt: submissionTime
            });

            return res.status(200).json({
                success: true,
                message: "Test submitted successfully",
                data: {
                    attemptId,
                    status: "submitted",
                    submittedAt: new Date().toISOString()
                }
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while submitting the test"
            });
        }
    }

    /**
     * GET REMAINING TIME
     * GET /timer/:attemptId
     */
    static async getRemainingTime(req: Request, res: Response) {
        try {
            const { attemptId } = req.params;
            const studentId = ExaminationController.getStudentId(req);

            let attempt = attemptCache.get<any>(`attempt_${attemptId}`);
            if (!attempt) {
                const attemptDoc = await db.collection("student_attempts").doc(attemptId).get();
                if (!attemptDoc.exists) {
                    return res.status(404).json({
                        success: false,
                        message: "Attempt not found"
                    });
                }
                attempt = attemptDoc.data()!;
                attemptCache.set(`attempt_${attemptId}`, attempt, 15);
            }

            if (attempt.isDeleted || attempt.studentId !== studentId) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            const endTimeMs = ExaminationController.getMs(attempt.endTime);
            const now = Date.now();
            let remainingTime = Math.max(0, Math.floor((endTimeMs - now) / 1000));

            if (remainingTime <= 0 && !attempt.isSubmitted && attempt.status !== "submitted") {
                await ExaminationController.handleAutoSubmit(attemptId);
                remainingTime = 0;
            }

            return res.status(200).json({
                success: true,
                message: "Remaining time retrieved successfully",
                data: {
                    remainingTime, // in seconds
                    isExpired: remainingTime <= 0
                }
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving remaining time"
            });
        }
    }

    /**
     * LIVE VIEWER COUNT (Admin only)
     * GET /live-count/:testId
     * Returns count of students currently actively taking the test (started, not submitted)
     */
    static async getLiveViewerCount(req: Request, res: Response) {
        try {
            const { testId } = req.params;

            const snapshot = await db.collection("student_attempts")
                .where("testId", "==", testId)
                .where("isDeleted", "==", false)
                .get();

            const now = Date.now();
            const activeAttempts = snapshot.docs.filter(doc => {
                const d = doc.data();
                if (d.isSubmitted || d.status === "submitted" || d.status === "evaluated") return false;
                if (d.status !== "started") return false;
                // Must have time remaining
                const endMs = d.endTime?._seconds ? d.endTime._seconds * 1000 : new Date(d.endTime).getTime();
                return endMs > now;
            });

            const submittedCount = snapshot.docs.filter(doc => {
                const d = doc.data();
                return d.isSubmitted || d.status === "submitted" || d.status === "evaluated";
            }).length;

            // Lookup maps for user & student details
            const usersSnapshot = await db.collection("users").get();
            const userToStudentMap: { [userId: string]: any } = {};
            usersSnapshot.docs.forEach(doc => {
                const u = doc.data();
                userToStudentMap[u.id || doc.id] = u;
            });

            const studentsSnapshot = await db.collection("students").get();
            const studentsMap: { [id: string]: any } = {};
            studentsSnapshot.docs.forEach(doc => {
                const s = doc.data();
                studentsMap[s.id || doc.id] = s;
            });

            const activeStudents = activeAttempts.map(doc => {
                const d = doc.data();
                const sid = d.studentId;
                const userObj = userToStudentMap[sid];
                const resolvedStudentId = userObj?.studentId || sid;
                const student = studentsMap[resolvedStudentId] || studentsMap[sid] || {};

                const rollNumber = student.rollNumber || student.rollNo || student.admissionNumber || student.loginUsername || userObj?.username || userObj?.loginUsername || sid;

                let studentName = "";
                if (student.firstName) {
                    studentName = `${student.firstName} ${student.lastName || ""}`.trim();
                } else if (student.fullName || student.name) {
                    studentName = student.fullName || student.name;
                } else if (userObj?.name) {
                    studentName = userObj.name;
                } else {
                    studentName = sid ? `Student (${sid})` : "Unknown Student";
                }

                return {
                    attemptId: d.id || doc.id,
                    studentId: sid,
                    studentName,
                    rollNumber
                };
            });

            return res.status(200).json({
                success: true,
                data: {
                    testId,
                    liveCount: activeAttempts.length,
                    submittedCount,
                    totalAttempts: snapshot.docs.length,
                    activeStudentIds: activeAttempts.map(d => d.data().studentId),
                    activeStudents,
                    refreshedAt: new Date().toISOString()
                }
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving live count"
            });
        }
    }

    /**
     * STUDY MODE - Read-only past test review for students
     * GET /study/:testId
     * Returns all questions with correct answers + explanations for expired published tests.
     * No attempt is created. Validates student batch membership.
     */
    static async studyMode(req: Request, res: Response) {
        try {
            const { testId } = req.params;
            const studentId = req.headers["user-id"] as string || req.query?.studentId as string;

            // Fetch test document
            const testDoc = await db.collection("tests").doc(testId).get();
            if (!testDoc.exists) {
                return res.status(404).json({ success: false, message: "Test not found" });
            }

            const test = testDoc.data()!;
            if (test.isDeleted || !test.published) {
                return res.status(400).json({ success: false, message: "Test is not available" });
            }

            // Validate: test must be expired (endTime < now) OR no endTime
            if (test.endTime) {
                const endMs = ExaminationController.getMs(test.endTime);
                if (Date.now() <= endMs) {
                    return res.status(400).json({
                        success: false,
                        message: "This test is still active. Study mode is only available after the test ends."
                    });
                }
            }

            // Batch membership validation (if targetAudience is batch-specific)
            if (studentId && test.targetAudience === "batch" && test.targetBatch) {
                try {
                    const usersSnap = await db.collection("users").where("isDeleted", "==", false).get();
                    let resolvedStudentDbId: string | null = null;

                    // Try to resolve studentId → student document
                    for (const uDoc of usersSnap.docs) {
                        const u = uDoc.data();
                        if ((u.id === studentId || uDoc.id === studentId) && u.role === "student" && u.studentId) {
                            resolvedStudentDbId = u.studentId;
                            break;
                        }
                    }

                    let studentBatch = "";
                    if (resolvedStudentDbId) {
                        const studentDoc = await db.collection("students").doc(resolvedStudentDbId).get();
                        if (studentDoc.exists) {
                            studentBatch = String(studentDoc.data()?.batch || "").trim().toLowerCase();
                        }
                    } else {
                        const studentDoc = await db.collection("students").doc(studentId).get();
                        if (studentDoc.exists && !studentDoc.data()?.isDeleted) {
                            studentBatch = String(studentDoc.data()?.batch || "").trim().toLowerCase();
                        }
                    }

                    const testBatch = String(test.targetBatch || "").trim().toLowerCase();
                    if (testBatch && studentBatch && studentBatch !== testBatch) {
                        return res.status(403).json({
                            success: false,
                            message: "This test is not available for your batch."
                        });
                    }
                } catch (batchErr) {
                    console.log("[STUDY MODE] Batch check failed, allowing access:", batchErr);
                }
            }

            // Fetch all questions (with answers and explanations for study mode)
            const questionIds: string[] = test.questionIds || [];
            if (questionIds.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: "No questions found in this test",
                    data: { testId, testTitle: test.title, questions: [] }
                });
            }

            const questionRefs = questionIds.map((id: string) => db.collection("questions").doc(id));
            const questionDocs = await db.getAll(...questionRefs);

            const studyQuestions = questionDocs
                .filter(doc => doc.exists && !doc.data()?.isDeleted)
                .map((doc, idx) => {
                    const data = doc.data()!;

                    // Normalize options array
                    let options: string[] = [];
                    let optionsTa: string[] = [];

                    if (data.options && Array.isArray(data.options)) {
                        options = data.options.map((o: any) => typeof o === "string" ? o : (o?.en || ""));
                    } else if (data.options && typeof data.options === "object") {
                        options = [
                            data.options.A?.en || data.options.A || "",
                            data.options.B?.en || data.options.B || "",
                            data.options.C?.en || data.options.C || "",
                            data.options.D?.en || data.options.D || ""
                        ];
                    }

                    if (data.optionsTa && Array.isArray(data.optionsTa)) {
                        optionsTa = data.optionsTa.map((o: any) => typeof o === "string" ? o : (o?.ta || ""));
                    } else if (data.options && typeof data.options === "object") {
                        optionsTa = [
                            data.options.A?.ta || "",
                            data.options.B?.ta || "",
                            data.options.C?.ta || "",
                            data.options.D?.ta || ""
                        ];
                    }

                    while (options.length < 4) options.push("");
                    while (optionsTa.length < 4) optionsTa.push("");

                    return {
                        id: doc.id,
                        questionNo: data.questionNo || (idx + 1),
                        question: data.questionText || data.question || "",
                        questionTa: data.questionTa || "",
                        options,
                        optionsTa,
                        correctAnswer: data.correctAnswer || null,
                        explanation: data.explanation || "",
                        marks: data.marks || 1,
                        imageUrl: data.imageUrl || data.questionImage || null
                    };
                });

            return res.status(200).json({
                success: true,
                message: "Study mode questions retrieved successfully",
                data: {
                    testId,
                    testTitle: test.title,
                    description: test.description || "",
                    totalQuestions: studyQuestions.length,
                    marksPerQuestion: test.marksPerQuestion || 1,
                    endedAt: test.endTime,
                    questions: studyQuestions
                }
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while loading study mode"
            });
        }
    }

    /**
     * RECORD FOCUS EVENT (TAB SWITCH / BLUR TRACKING)
     * POST /focus-event/:attemptId
     */
    static async recordFocusEvent(req: Request, res: Response) {
        try {
            const { attemptId } = req.params;
            const { tabLeaveCount } = req.body;
            const studentId = ExaminationController.getStudentId(req);

            const attemptDoc = await db.collection("student_attempts").doc(attemptId).get();
            if (!attemptDoc.exists) {
                return res.status(404).json({
                    success: false,
                    message: "Attempt not found"
                });
            }

            const attempt = attemptDoc.data()!;
            if (attempt.studentId !== studentId) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            await db.collection("student_attempts").doc(attemptId).update({
                tabLeaveCount: Number(tabLeaveCount || 0),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return res.status(200).json({
                success: true,
                message: "Focus event recorded successfully"
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while recording focus event"
            });
        }
    }

    /**
     * REPORT QUESTION (Student/Admin)
     * POST /report-question/:testId
     * Body: { qIndex: number }
     */
    static async reportQuestion(req: Request, res: Response) {
        try {
            const { testId } = req.params;
            const { qIndex } = req.body;

            if (qIndex === undefined || qIndex === null) {
                return res.status(400).json({
                    success: false,
                    message: "qIndex is required"
                });
            }

            const studentId = ExaminationController.getStudentId(req);
            const logId = `${testId}_${qIndex}_${studentId}`;
            const logRef = db.collection("question_report_logs").doc(logId);

            // 1. Check if this student already reported this question
            const logDoc = await logRef.get();
            if (logDoc.exists) {
                return res.status(400).json({
                    success: false,
                    message: "You have already reported this question."
                });
            }

            // 2. Fetch student name & roll number from student collection or req.user
            let studentName = "Student";
            let rollNumber = "";
            
            const studentDoc = await db.collection("students").doc(studentId).get();
            if (studentDoc.exists) {
                const sData = studentDoc.data()!;
                studentName = `${sData.firstName || ""} ${sData.lastName || ""}`.trim() || sData.name || "Student";
                rollNumber = sData.rollNumber || sData.rollNo || sData.loginUsername || "";
            } else {
                const userDoc = await db.collection("users").doc(studentId).get();
                if (userDoc.exists) {
                    const uData = userDoc.data()!;
                    studentName = uData.name || "Student";
                    rollNumber = uData.rollNumber || uData.username || "";
                }
            }

            // 3. Write report log doc
            await logRef.set({
                id: logId,
                testId,
                qIndex: Number(qIndex),
                studentId,
                studentName,
                rollNumber,
                reportedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // 4. Increment aggregated report map for UI compatibility
            const qKey = `Q.N ${Number(qIndex) + 1}`;
            const reportRef = db.collection("question_reports").doc(testId);

            await reportRef.set({
                reports: {
                    [qKey]: admin.firestore.FieldValue.increment(1)
                }
            }, { merge: true });

            const updatedDoc = await reportRef.get();
            const reportsData = updatedDoc.data()?.reports || {};

            return res.status(200).json({
                success: true,
                message: "Question reported successfully",
                data: reportsData
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while reporting question"
            });
        }
    }

    /**
     * GET DETAILED QUESTION REPORTS (Admin only)
     * GET /reports/detail/:testId
     */
    static async getDetailedQuestionReports(req: Request, res: Response) {
        try {
            const { testId } = req.params;
            const snapshot = await db.collection("question_report_logs")
                .where("testId", "==", testId)
                .get();

            const logs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    testId: data.testId,
                    qIndex: data.qIndex,
                    studentId: data.studentId,
                    studentName: data.studentName || "Student",
                    rollNumber: data.rollNumber || "",
                    reportedAt: data.reportedAt ? (data.reportedAt.toDate ? data.reportedAt.toDate().toISOString() : data.reportedAt) : null
                };
            });

            // Sort in-memory to prevent missing Firestore index requirements
            logs.sort((a, b) => {
                const timeA = a.reportedAt ? new Date(a.reportedAt).getTime() : 0;
                const timeB = b.reportedAt ? new Date(b.reportedAt).getTime() : 0;
                return timeB - timeA;
            });

            return res.status(200).json({
                success: true,
                data: logs
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving detailed reports"
            });
        }
    }

    /**
     * GET QUESTION REPORTS (Admin/Student)
     * GET /reports/:testId
     */
    static async getQuestionReports(req: Request, res: Response) {
        try {
            const { testId } = req.params;

            const reportDoc = await db.collection("question_reports").doc(testId).get();
            const reportsData = reportDoc.exists ? (reportDoc.data()?.reports || {}) : {};

            let myReportedIndexes: number[] = [];
            try {
                const studentId = ExaminationController.getStudentId(req);
                if (studentId) {
                    const myReportsSnap = await db.collection("question_report_logs")
                        .where("testId", "==", testId)
                        .where("studentId", "==", studentId)
                        .get();
                    myReportedIndexes = myReportsSnap.docs.map(doc => doc.data().qIndex);
                }
            } catch (err) {
                // Ignore auth error for public/guest cases
            }

            return res.status(200).json({
                success: true,
                message: "Question reports retrieved successfully",
                data: {
                    reports: reportsData,
                    myReportedIndexes
                }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving question reports"
            });
        }
    }
}

