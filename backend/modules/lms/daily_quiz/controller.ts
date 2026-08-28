import { Request, Response } from "express";
import admin from "firebase-admin";
import { randomUUID } from "crypto";

const db = admin.firestore();
const QUIZ_COLLECTION = "dailyQuizzes";
const QUIZ_ATTEMPT_COLLECTION = "quizAttempts";

export class DailyQuizController {
    /**
     * CREATE/UPDATE QUIZ (Admin/Staff)
     * POST /api/lms/daily-quiz
     * Creates a named quiz with a publication date.
     * If a quiz already exists for the given date with same title, appends questions.
     */
    static async createOrUpdateQuiz(req: Request, res: Response) {
        try {
            const {
                quizDate,
                title,
                questions, // array of { questionText, options: [opt1, opt2, opt3, opt4], correctOptionIndex (0-3) }
                createdBy
            } = req.body;

            if (!questions || !Array.isArray(questions) || questions.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Questions array is required and must not be empty"
                });
            }

            const today = new Date().toISOString().split("T")[0];
            const date = quizDate || today;
            const quizTitle = title || `Daily Quiz - ${date}`;

            // Each new call creates a NEW quiz, not appending (unless updating same quiz ID)
            const quizId = randomUUID();
            const now = admin.firestore.FieldValue.serverTimestamp();

            // Auto-disable time: 24 hours after published date midnight
            const publishedDate = new Date(date + "T00:00:00.000Z");
            const autoDisableAt = new Date(publishedDate.getTime() + 24 * 60 * 60 * 1000).toISOString();

            await db.collection(QUIZ_COLLECTION).doc(quizId).set({
                id: quizId,
                title: quizTitle,
                quizDate: date,
                questions,
                status: "active",         // "active" | "disabled" | "unattended"
                publishedAt: now,
                autoDisableAt,            // ISO string - auto disabled after 24h
                createdAt: now,
                updatedAt: now,
                createdBy: createdBy || "admin",
                updatedBy: createdBy || "admin",
                isDeleted: false,
                deletedAt: null,
                deletedBy: null
            });

            return res.status(200).json({
                success: true,
                message: "Quiz published successfully",
                data: { quizId, quizDate: date, title: quizTitle, autoDisableAt }
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while saving quiz"
            });
        }
    }

    /**
     * GET ALL ACTIVE QUIZZES (LMS Page - Students can see ALL at once)
     * GET /api/lms/daily-quiz/all
     */
    static async getAllQuizzes(req: Request, res: Response) {
        try {
            const { studentId } = req.query;

            const snapshot = await db.collection(QUIZ_COLLECTION)
                .where("isDeleted", "==", false)
                .get();

            const now = new Date();

            // Check and auto-disable expired quizzes + get attempts
            const attemptsMap: Record<string, any> = {};
            if (studentId) {
                const attemptsSnapshot = await db.collection(QUIZ_ATTEMPT_COLLECTION)
                    .where("studentId", "==", studentId)
                    .get();
                attemptsSnapshot.docs.forEach(d => {
                    const data = d.data();
                    attemptsMap[data.quizId] = data;
                });
            }

            // OPTIMIZATION: Fetch all attempts in one single query to build count & presence maps
            const allAttemptsSnapshot = await db.collection(QUIZ_ATTEMPT_COLLECTION).get();
            const attemptCountMap: Record<string, number> = {};
            const hasAttemptsMap: Record<string, boolean> = {};

            allAttemptsSnapshot.docs.forEach(d => {
                const qId = d.data()?.quizId;
                if (qId) {
                    attemptCountMap[qId] = (attemptCountMap[qId] || 0) + 1;
                    hasAttemptsMap[qId] = true;
                }
            });

            const quizzes = await Promise.all(snapshot.docs.map(async doc => {
                const data = doc.data();
                const quizId = doc.id;

                // Check auto-disable
                let status = data.status || "active";
                if (status === "active" && data.autoDisableAt) {
                    const disableTime = new Date(data.autoDisableAt);
                    if (now > disableTime) {
                        // Check if any student attempted
                        const hasAttempt = !!hasAttemptsMap[quizId];
                        status = hasAttempt ? "disabled" : "unattended";
                        // Update status in DB (fire and forget)
                        doc.ref.update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                    }
                }

                const attempt = attemptsMap[quizId];
                const attemptCount = attemptCountMap[quizId] || 0;

                return {
                    id: quizId,
                    title: data.title,
                    quizDate: data.quizDate,
                    questionCount: data.questions?.length || 0,
                    status,
                    autoDisableAt: data.autoDisableAt,
                    publishedAt: data.publishedAt ? (data.publishedAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    studentStatus: attempt ? "completed" : (status === "active" ? "pending" : "missed"),
                    score: attempt ? `${attempt.correctCount}/${attempt.totalQuestions}` : null,
                    attemptCount
                };
            }));

            // Sort quizzes by quizDate desc, then publishedAt desc (latest first)
            quizzes.sort((a, b) => {
                const dateA = a.quizDate || "";
                const dateB = b.quizDate || "";
                if (dateA !== dateB) {
                    return dateB.localeCompare(dateA); // latest first
                }
                const timeA = a.publishedAt || "";
                const timeB = b.publishedAt || "";
                return timeB.localeCompare(timeA); // latest first
            });

            return res.status(200).json({ success: true, data: quizzes });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET TODAY'S PENDING QUIZ FOR DASHBOARD (One at a time)
     * GET /api/lms/daily-quiz/today
     * Returns the FIRST pending quiz for the student, so they complete one before seeing next
     */
    static async getTodayQuiz(req: Request, res: Response) {
        try {
            const { studentId } = req.query;
            const now = new Date();
            const today = now.toISOString().split("T")[0];

            const snapshot = await db.collection(QUIZ_COLLECTION)
                .where("isDeleted", "==", false)
                .where("status", "==", "active")
                .get();

            const quizDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
            // Sort in memory by publishedAt asc
            quizDocs.sort((a, b) => {
                const timeA = a.publishedAt ? (a.publishedAt.toDate ? a.publishedAt.toDate().getTime() : new Date(a.publishedAt).getTime()) : 0;
                const timeB = b.publishedAt ? (b.publishedAt.toDate ? b.publishedAt.toDate().getTime() : new Date(b.publishedAt).getTime()) : 0;
                return timeA - timeB;
            });

            // Find first quiz student hasn't completed
            let targetQuiz: any = null;
            let existingAttempt: any = null;

            for (const quizData of quizDocs) {
                const quizId = quizData.id;

                // Check if auto-disable has passed
                if (quizData.autoDisableAt) {
                    const disableTime = new Date(quizData.autoDisableAt);
                    if (now > disableTime) {
                        continue; // Skip expired quizzes
                    }
                }

                if (studentId) {
                    const attemptSnapshot = await db.collection(QUIZ_ATTEMPT_COLLECTION)
                        .where("quizId", "==", quizId)
                        .where("studentId", "==", studentId as string)
                        .limit(1)
                        .get();

                    if (attemptSnapshot.empty) {
                        // This quiz is pending for this student - show it
                        targetQuiz = quizData;
                        existingAttempt = null; // Clear any previously set fallback attempt!
                        break;
                    } else if (!targetQuiz) {
                        // If no pending found yet, remember this completed one for fallback
                        existingAttempt = attemptSnapshot.docs[0].data();
                    }
                } else {
                    targetQuiz = quizData;
                    break;
                }
            }

            if (!targetQuiz) {
                // Check today's quiz even if completed
                const todaySnapshot = await db.collection(QUIZ_COLLECTION)
                    .where("isDeleted", "==", false)
                    .where("quizDate", "==", today)
                    .limit(1)
                    .get();

                if (todaySnapshot.empty) {
                    return res.status(200).json({ success: true, data: null, message: "No quiz available for today" });
                }

                const quizDoc = todaySnapshot.docs[0];
                targetQuiz = { ...quizDoc.data(), id: quizDoc.id };

                if (studentId) {
                    const attemptSnapshot = await db.collection(QUIZ_ATTEMPT_COLLECTION)
                        .where("quizId", "==", targetQuiz.id)
                        .where("studentId", "==", studentId as string)
                        .limit(1)
                        .get();
                    if (!attemptSnapshot.empty) {
                        existingAttempt = attemptSnapshot.docs[0].data();
                    } else {
                        existingAttempt = null;
                    }
                }
            }

            const quizId = targetQuiz.id;

            // Fetch stats
            const attemptsSnapshot = await db.collection(QUIZ_ATTEMPT_COLLECTION)
                .where("quizId", "==", quizId)
                .get();
            const allAttempts = attemptsSnapshot.docs.map(d => d.data());
            const totalPoolCount = allAttempts.length;

            const questionsWithStats = (targetQuiz.questions || []).map((q: any, idx: number) => {
                const counts = [0, 0, 0, 0];
                allAttempts.forEach(attempt => {
                    const attemptAnswers = attempt.answers || attempt.results;
                    const ans = Array.isArray(attemptAnswers)
                        ? attemptAnswers.find((a: any) => a.questionIndex === idx)
                        : (attemptAnswers && typeof attemptAnswers === "object" ? { selectedOptionIndex: (attemptAnswers as any)[idx] } : null);
                    if (ans && typeof ans.selectedOptionIndex === "number" && ans.selectedOptionIndex >= 0 && ans.selectedOptionIndex <= 3) {
                        counts[ans.selectedOptionIndex]++;
                    }
                });
                const percentages = counts.map(count => totalPoolCount > 0 ? Math.round((count / totalPoolCount) * 100) : 0);
                return {
                    questionText: q.questionText,
                    options: q.options,
                    correctOptionIndex: q.correctOptionIndex,
                    optionPercentages: percentages
                };
            });

            return res.status(200).json({
                success: true,
                data: {
                    ...targetQuiz,
                    questions: questionsWithStats,
                    publishedAt: targetQuiz.publishedAt ? (targetQuiz.publishedAt.toDate ? targetQuiz.publishedAt.toDate().toISOString() : new Date(targetQuiz.publishedAt).toISOString()) : null,
                    existingAttempt: existingAttempt ? {
                        correctCount: existingAttempt.correctCount,
                        totalQuestions: existingAttempt.totalQuestions,
                        answers: existingAttempt.answers,
                        results: existingAttempt.results
                    } : null
                }
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET QUIZ BY ID (for attempting)
     * GET /api/lms/daily-quiz/:quizId
     */
    static async getQuiz(req: Request, res: Response) {
        try {
            const { quizId } = req.params;
            const { studentId } = req.query;

            const quizDoc = await db.collection(QUIZ_COLLECTION).doc(quizId).get();
            if (!quizDoc.exists || quizDoc.data()?.isDeleted) {
                return res.status(404).json({ success: false, message: "Quiz not found" });
            }

            const quizData = quizDoc.data()!;

            // Check if student already attempted
            let existingAttempt = null;
            if (studentId) {
                const attemptSnapshot = await db.collection(QUIZ_ATTEMPT_COLLECTION)
                    .where("quizId", "==", quizId)
                    .where("studentId", "==", studentId as string)
                    .limit(1)
                    .get();
                if (!attemptSnapshot.empty) {
                    existingAttempt = attemptSnapshot.docs[0].data();
                }
            }

            const attemptsSnapshot = await db.collection(QUIZ_ATTEMPT_COLLECTION)
                .where("quizId", "==", quizId).get();
            const allAttempts = attemptsSnapshot.docs.map(d => d.data());
            const totalPoolCount = allAttempts.length;

            const questionsWithStats = (quizData.questions || []).map((q: any, idx: number) => {
                const counts = [0, 0, 0, 0];
                allAttempts.forEach(attempt => {
                    const attemptAnswers = attempt.answers || attempt.results;
                    const ans = Array.isArray(attemptAnswers)
                        ? attemptAnswers.find((a: any) => a.questionIndex === idx)
                        : (attemptAnswers && typeof attemptAnswers === "object" ? { selectedOptionIndex: (attemptAnswers as any)[idx] } : null);
                    if (ans && typeof ans.selectedOptionIndex === "number") counts[ans.selectedOptionIndex]++;
                });
                const percentages = counts.map(c => totalPoolCount > 0 ? Math.round((c / totalPoolCount) * 100) : 0);
                return { questionText: q.questionText, options: q.options, correctOptionIndex: q.correctOptionIndex, optionPercentages: percentages };
            });

            return res.status(200).json({
                success: true,
                data: {
                    ...quizData,
                    id: quizId,
                    questions: questionsWithStats,
                    publishedAt: quizData.publishedAt ? (quizData.publishedAt as admin.firestore.Timestamp).toDate().toISOString() : null,
                    existingAttempt: existingAttempt ? {
                        correctCount: existingAttempt.correctCount,
                        totalQuestions: existingAttempt.totalQuestions,
                        answers: existingAttempt.answers,
                        results: existingAttempt.results
                    } : null
                }
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * SUBMIT QUIZ ANSWER (One attempt only)
     * POST /api/lms/daily-quiz/submit
     */
    static async submitQuizAnswer(req: Request, res: Response) {
        try {
            const { studentId, quizId, answers, submittedBy } = req.body;

            if (!studentId || !quizId || !answers) {
                return res.status(400).json({ success: false, message: "studentId, quizId, and answers are required" });
            }

            // Check one attempt per student
            const existingAttempt = await db.collection(QUIZ_ATTEMPT_COLLECTION)
                .where("quizId", "==", quizId)
                .where("studentId", "==", studentId)
                .limit(1)
                .get();

            if (!existingAttempt.empty) {
                return res.status(409).json({ success: false, message: "You have already attempted this quiz" });
            }

            const quizDoc = await db.collection(QUIZ_COLLECTION).doc(quizId).get();
            if (!quizDoc.exists || quizDoc.data()?.isDeleted) {
                return res.status(404).json({ success: false, message: "Quiz not found" });
            }

            const quiz = quizDoc.data()!;

            // Check if quiz is still active
            if (quiz.status !== "active") {
                return res.status(400).json({ success: false, message: `This quiz is ${quiz.status || "disabled"} and can no longer be attempted` });
            }

            if (quiz.autoDisableAt && new Date() > new Date(quiz.autoDisableAt)) {
                return res.status(400).json({ success: false, message: "This quiz has expired (24-hour window passed)" });
            }

            const results = answers.map((answer: any) => {
                const question = quiz.questions[answer.questionIndex];
                const isCorrect = question && answer.selectedOptionIndex === question.correctOptionIndex;
                return {
                    questionIndex: answer.questionIndex,
                    selectedOptionIndex: answer.selectedOptionIndex,
                    correctOptionIndex: question?.correctOptionIndex,
                    isCorrect
                };
            });

            const totalQuestions = quiz.questions.length;
            const correctCount = results.filter((r: { isCorrect: boolean }) => r.isCorrect).length;
            const wrongCount = answers.length - correctCount;
            const skippedCount = totalQuestions - answers.length;

            const attemptId = randomUUID();
            await db.collection(QUIZ_ATTEMPT_COLLECTION).doc(attemptId).set({
                id: attemptId,
                studentId,
                quizId,
                quizDate: quiz.quizDate,
                quizTitle: quiz.title,
                answers,
                results,
                totalQuestions,
                correctCount,
                wrongCount,
                skippedCount,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: submittedBy || studentId
            });

            // Fetch updated stats
            const attemptsSnapshot = await db.collection(QUIZ_ATTEMPT_COLLECTION).where("quizId", "==", quizId).get();
            const allAttempts = attemptsSnapshot.docs.map(d => d.data());
            const totalPoolCount = allAttempts.length;

            const questionsWithStats = quiz.questions.map((q: any, idx: number) => {
                const counts = [0, 0, 0, 0];
                allAttempts.forEach(attempt => {
                    const attemptAnswers = attempt.answers || attempt.results;
                    const ans = Array.isArray(attemptAnswers)
                        ? attemptAnswers.find((a: any) => a.questionIndex === idx)
                        : (attemptAnswers && typeof attemptAnswers === "object" ? { selectedOptionIndex: (attemptAnswers as any)[idx] } : null);
                    if (ans && typeof ans.selectedOptionIndex === "number") counts[ans.selectedOptionIndex]++;
                });
                const percentages = counts.map(c => totalPoolCount > 0 ? Math.round((c / totalPoolCount) * 100) : 0);
                return {
                    questionText: q.questionText,
                    options: q.options,
                    correctOptionIndex: q.correctOptionIndex,
                    userAnswer: answers.find((a: any) => a.questionIndex === idx)?.selectedOptionIndex,
                    optionPercentages: percentages
                };
            });

            return res.status(200).json({
                success: true,
                message: "Quiz submitted successfully",
                data: {
                    attemptId, results, totalQuestions, correctCount, wrongCount, skippedCount, questions: questionsWithStats
                }
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET STUDENT'S QUIZ HISTORY
     * GET /api/lms/daily-quiz/history/:studentId
     */
    static async getStudentHistory(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const snapshot = await db.collection(QUIZ_ATTEMPT_COLLECTION)
                .where("studentId", "==", studentId)
                .get();

            const history = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    createdAt: data.createdAt ? (data.createdAt as admin.firestore.Timestamp).toDate().toISOString() : null
                };
            });

            // Sort in memory by createdAt desc
            history.sort((a, b) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeB - timeA;
            });

            return res.status(200).json({ success: true, data: history });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * DELETE DAILY QUIZ (Admin/Staff)
     * DELETE /api/lms/daily-quiz/:quizId
     */
    static async deleteQuiz(req: Request, res: Response) {
        try {
            const { quizId } = req.params;
            await db.collection(QUIZ_COLLECTION).doc(quizId).delete();

            const attemptsSnapshot = await db.collection(QUIZ_ATTEMPT_COLLECTION).where("quizId", "==", quizId).get();
            const batch = db.batch();
            attemptsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            return res.status(200).json({ success: true, message: "Quiz deleted successfully" });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * MONTHLY ARCHIVE - Get all quizzes for a month (for consolidation)
     * GET /api/lms/daily-quiz/archive?year=2026&month=7
     */
    static async getMonthlyArchive(req: Request, res: Response) {
        try {
            const { year, month } = req.query;
            const y = parseInt(year as string) || new Date().getFullYear();
            const m = parseInt(month as string) || new Date().getMonth() + 1;

            const fromDate = `${y}-${String(m).padStart(2, "0")}-01`;
            const toDate = `${y}-${String(m).padStart(2, "0")}-31`;

            const snapshot = await db.collection(QUIZ_COLLECTION)
                .where("isDeleted", "==", false)
                .get();

            const quizzes = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((q: any) => q.quizDate >= fromDate && q.quizDate <= toDate)
                .map((q: any) => ({
                    id: q.id,
                    title: q.title,
                    quizDate: q.quizDate,
                    questionCount: q.questions?.length || 0,
                    status: q.status,
                    questions: q.questions
                }));

            // Sort in memory by quizDate asc
            quizzes.sort((a, b) => (a.quizDate || "").localeCompare(b.quizDate || ""));

            // Generate plain text archive
            const archiveText = quizzes.map(q => {
                const questionsText = (q.questions || []).map((qs: any, idx: number) =>
                    `  Q${idx + 1}: ${qs.questionText}\n` +
                    (qs.options || []).map((opt: string, oIdx: number) => `    ${String.fromCharCode(65 + oIdx)}: ${opt}`).join("\n") +
                    `\n  Correct: ${String.fromCharCode(65 + (qs.correctOptionIndex || 0))}`
                ).join("\n\n");
                return `=== ${q.title} (${q.quizDate}) ===\n${questionsText}`;
            }).join("\n\n" + "=".repeat(50) + "\n\n");

            return res.status(200).json({
                success: true,
                data: {
                    quizzes,
                    archiveText,
                    totalQuizzes: quizzes.length,
                    period: `${y}-${String(m).padStart(2, "0")}`
                }
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}
