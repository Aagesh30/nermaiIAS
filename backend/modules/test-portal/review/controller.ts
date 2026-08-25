import { Request, Response } from "express";
import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8",
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();

export class ReviewController {

    /**
     * REVIEW COMPLETE ATTEMPT
     * GET /attempt/:attemptId
     */
    static async getAttemptReview(req: Request, res: Response) {
        try {
            const { attemptId } = req.params;

            const resultDoc = await db.collection("results").doc(attemptId).get();
            if (!resultDoc.exists) {
                return res.status(400).json({
                    success: false,
                    message: "Attempt review is not available. Ensure the attempt is evaluated."
                });
            }

            const result = resultDoc.data()!;
            if (result.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "This attempt review has been deleted"
                });
            }

            const testDoc = await db.collection("tests").doc(result.testId).get();
            if (!testDoc.exists) {
                return res.status(404).json({
                    success: false,
                    message: "Associated test not found"
                });
            }

            const test = testDoc.data()!;
            const questionIds = test.questionIds || [];

            let questionsMap: { [id: string]: any } = {};
            if (questionIds.length > 0) {
                const questionRefs = questionIds.map((id: string) => db.collection("questions").doc(id));
                const questionDocs = await db.getAll(...questionRefs);
                questionDocs.forEach(doc => {
                    if (doc.exists) {
                        questionsMap[doc.id] = doc.data();
                    }
                });
            }

            const reviewDetails = (result.questionDetails || []).map((qd: any) => {
                const q = questionsMap[qd.questionId] || {};
                return {
                    questionId: qd.questionId,
                    questionText: q.questionText || q.question || "",
                    questionTa: q.questionTa || "",
                    options: q.options || [],
                    optionsTa: q.optionsTa || [],
                    images: q.images || q.imageUrl || null,
                    type: qd.type || q.type || "",
                    marks: qd.marks,
                    negativeMarks: qd.negativeMarks,
                    selectedAnswer: qd.selectedAnswer,
                    correctAnswer: qd.correctAnswer,
                    explanation: q.explanation || "",
                    isCorrect: qd.isCorrect,
                    isPartiallyCorrect: qd.isPartiallyCorrect,
                    scoreAwarded: qd.scoreAwarded
                };
            });

            return res.status(200).json({
                success: true,
                message: "Attempt review retrieved successfully",
                data: {
                    attemptId: result.attemptId,
                    testId: result.testId,
                    testTitle: test.title,
                    studentId: result.studentId,
                    totalMarks: result.totalMarks,
                    obtainedMarks: result.obtainedMarks,
                    percentage: result.percentage,
                    rank: result.rank,
                    percentile: result.percentile,
                    status: result.status,
                    evaluatedAt: result.evaluatedAt,
                    questions: reviewDetails
                }
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving attempt review"
            });
        }
    }

    /**
     * REVIEW A SINGLE QUESTION
     * GET /attempt/:attemptId/question/:questionId
     */
    static async getQuestionReview(req: Request, res: Response) {
        try {
            const { attemptId, questionId } = req.params;

            const resultDoc = await db.collection("results").doc(attemptId).get();
            if (!resultDoc.exists) {
                return res.status(400).json({
                    success: false,
                    message: "Attempt review is not available. Ensure the attempt is evaluated."
                });
            }

            const result = resultDoc.data()!;
            if (result.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Result deleted"
                });
            }

            const qd = (result.questionDetails || []).find((q: any) => q.questionId === questionId);
            if (!qd) {
                return res.status(404).json({
                    success: false,
                    message: "Question not found in this attempt"
                });
            }

            const questionDoc = await db.collection("questions").doc(questionId).get();
            const qData = questionDoc.exists ? questionDoc.data()! : {};

            return res.status(200).json({
                success: true,
                message: "Question review retrieved successfully",
                data: {
                    questionId: qd.questionId,
                    questionText: qData.questionText || qData.question || "",
                    questionTa: qData.questionTa || "",
                    options: qData.options || [],
                    optionsTa: qData.optionsTa || [],
                    images: qData.images || qData.imageUrl || null,
                    type: qd.type || qData.type || "",
                    marks: qd.marks,
                    negativeMarks: qd.negativeMarks,
                    selectedAnswer: qd.selectedAnswer,
                    correctAnswer: qd.correctAnswer,
                    explanation: qData.explanation || "",
                    isCorrect: qd.isCorrect,
                    isPartiallyCorrect: qd.isPartiallyCorrect,
                    scoreAwarded: qd.scoreAwarded
                }
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving question review"
            });
        }
    }

    /**
     * GET CORRECT ANSWERS
     * GET /answers/:attemptId
     */
    static async getCorrectAnswers(req: Request, res: Response) {
        try {
            const { attemptId } = req.params;

            const resultDoc = await db.collection("results").doc(attemptId).get();
            if (!resultDoc.exists) {
                return res.status(400).json({
                    success: false,
                    message: "Answers are only available after evaluation."
                });
            }

            const result = resultDoc.data()!;
            if (result.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Result deleted"
                });
            }

            const correctAnswers = (result.questionDetails || []).map((qd: any) => ({
                questionId: qd.questionId,
                correctAnswer: qd.correctAnswer
            }));

            return res.status(200).json({
                success: true,
                message: "Correct answers retrieved successfully",
                data: {
                    attemptId,
                    correctAnswers
                }
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving correct answers"
            });
        }
    }

    /**
     * GET EXPLANATIONS
     * GET /explanations/:attemptId
     */
    static async getExplanations(req: Request, res: Response) {
        try {
            const { attemptId } = req.params;

            const resultDoc = await db.collection("results").doc(attemptId).get();
            if (!resultDoc.exists) {
                return res.status(400).json({
                    success: false,
                    message: "Explanations are only available after evaluation."
                });
            }

            const result = resultDoc.data()!;
            if (result.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Result deleted"
                });
            }

            const testDoc = await db.collection("tests").doc(result.testId).get();
            const questionIds = testDoc.exists ? (testDoc.data()!.questionIds || []) : [];

            let explanations: any[] = [];
            if (questionIds.length > 0) {
                const questionRefs = questionIds.map((id: string) => db.collection("questions").doc(id));
                const questionDocs = await db.getAll(...questionRefs);
                explanations = questionDocs
                    .filter(doc => doc.exists)
                    .map(doc => {
                        const data = doc.data()!;
                        return {
                            questionId: doc.id,
                            explanation: data.explanation || ""
                        };
                    });
            }

            return res.status(200).json({
                success: true,
                message: "Explanations retrieved successfully",
                data: {
                    attemptId,
                    explanations
                }
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving explanations"
            });
        }
    }

    /**
     * TOPIC ANALYSIS
     * GET /analysis/topic/:attemptId
     */
    static async getTopicAnalysis(req: Request, res: Response) {
        try {
            const { attemptId } = req.params;

            const resultDoc = await db.collection("results").doc(attemptId).get();
            if (!resultDoc.exists) {
                return res.status(400).json({
                    success: false,
                    message: "Topic analysis is only available after evaluation."
                });
            }

            const result = resultDoc.data()!;
            if (result.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Result deleted"
                });
            }

            const testDoc = await db.collection("tests").doc(result.testId).get();
            const questionIds = testDoc.exists ? (testDoc.data()!.questionIds || []) : [];

            let questionsMap: { [id: string]: any } = {};
            if (questionIds.length > 0) {
                const refs = questionIds.map((id: string) => db.collection("questions").doc(id));
                const docs = await db.getAll(...refs);
                docs.forEach(doc => {
                    if (doc.exists) {
                        questionsMap[doc.id] = doc.data();
                    }
                });
            }

            const topicMap: { [topic: string]: any } = {};

            for (const qd of (result.questionDetails || [])) {
                const q = questionsMap[qd.questionId] || {};
                const topic = q.topic || "General";

                if (!topicMap[topic]) {
                    topicMap[topic] = {
                        topic,
                        totalQuestions: 0,
                        correctCount: 0,
                        wrongCount: 0,
                        skippedCount: 0,
                        totalMarks: 0,
                        obtainedMarks: 0
                    };
                }

                const t = topicMap[topic];
                t.totalQuestions++;
                t.totalMarks += qd.marks || 0;
                t.obtainedMarks += qd.scoreAwarded || 0;

                if (qd.selectedAnswer === null || qd.selectedAnswer === undefined || qd.selectedAnswer === "") {
                    t.skippedCount++;
                } else if (qd.isCorrect) {
                    t.correctCount++;
                } else {
                    t.wrongCount++;
                }
            }

            const topicAnalysis = Object.values(topicMap).map((t: any) => {
                const nonSkipped = t.totalQuestions - t.skippedCount;
                return {
                    ...t,
                    accuracy: nonSkipped > 0 ? Math.round((t.correctCount / nonSkipped) * 10000) / 100 : 0
                };
            });

            return res.status(200).json({
                success: true,
                message: "Topic analysis retrieved successfully",
                data: topicAnalysis
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred during topic analysis"
            });
        }
    }

    /**
     * DIFFICULTY ANALYSIS
     * GET /analysis/difficulty/:attemptId
     */
    static async getDifficultyAnalysis(req: Request, res: Response) {
        try {
            const { attemptId } = req.params;

            const resultDoc = await db.collection("results").doc(attemptId).get();
            if (!resultDoc.exists) {
                return res.status(400).json({
                    success: false,
                    message: "Difficulty analysis is only available after evaluation."
                });
            }

            const result = resultDoc.data()!;
            if (result.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Result deleted"
                });
            }

            const testDoc = await db.collection("tests").doc(result.testId).get();
            const questionIds = testDoc.exists ? (testDoc.data()!.questionIds || []) : [];

            let questionsMap: { [id: string]: any } = {};
            if (questionIds.length > 0) {
                const refs = questionIds.map((id: string) => db.collection("questions").doc(id));
                const docs = await db.getAll(...refs);
                docs.forEach(doc => {
                    if (doc.exists) {
                        questionsMap[doc.id] = doc.data();
                    }
                });
            }

            const diffMap: { [difficulty: string]: any } = {};

            for (const qd of (result.questionDetails || [])) {
                const q = questionsMap[qd.questionId] || {};
                const difficulty = q.difficulty || "Medium";

                if (!diffMap[difficulty]) {
                    diffMap[difficulty] = {
                        difficulty,
                        totalQuestions: 0,
                        correctCount: 0,
                        wrongCount: 0,
                        skippedCount: 0,
                        totalMarks: 0,
                        obtainedMarks: 0
                    };
                }

                const d = diffMap[difficulty];
                d.totalQuestions++;
                d.totalMarks += qd.marks || 0;
                d.obtainedMarks += qd.scoreAwarded || 0;

                if (qd.selectedAnswer === null || qd.selectedAnswer === undefined || qd.selectedAnswer === "") {
                    d.skippedCount++;
                } else if (qd.isCorrect) {
                    d.correctCount++;
                } else {
                    d.wrongCount++;
                }
            }

            const difficultyAnalysis = Object.values(diffMap).map((d: any) => {
                const nonSkipped = d.totalQuestions - d.skippedCount;
                return {
                    ...d,
                    accuracy: nonSkipped > 0 ? Math.round((d.correctCount / nonSkipped) * 10000) / 100 : 0
                };
            });

            return res.status(200).json({
                success: true,
                message: "Difficulty analysis retrieved successfully",
                data: difficultyAnalysis
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred during difficulty analysis"
            });
        }
    }

    /**
     * STUDENT ATTEMPT HISTORY
     * GET /history/:studentId
     */
    static async getAttemptHistory(req: Request, res: Response) {
        try {
            const { studentId } = req.params;

            // Fetch any corresponding student record IDs to cover both userId and studentId queries
            const matchedStudentIds = new Set<string>([studentId]);
            
            try {
                const studentsSnap = await db.collection("students").get();
                studentsSnap.docs.forEach(doc => {
                    const s = doc.data();
                    const sid = doc.id;
                    const uid = s.userId || s.id;
                    if (uid === studentId || sid === studentId) {
                        matchedStudentIds.add(sid);
                        if (s.userId) matchedStudentIds.add(s.userId);
                    }
                });
            } catch (_) {}

            try {
                const usersSnap = await db.collection("users").get();
                usersSnap.docs.forEach(doc => {
                    const u = doc.data();
                    const uid = u.id || doc.id;
                    if (uid === studentId || u.studentId === studentId) {
                        matchedStudentIds.add(uid);
                        if (u.studentId) matchedStudentIds.add(u.studentId);
                    }
                });
            } catch (_) {}

            let attempts: any[] = [];
            for (const sid of matchedStudentIds) {
                const attemptsSnapshot = await db.collection("student_attempts")
                    .where("studentId", "==", sid)
                    .where("isDeleted", "==", false)
                    .get();
                attemptsSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (!attempts.some(a => a.id === data.id)) {
                        attempts.push(data);
                    }
                });
            }
            
            // Sort in memory by createdAt desc
            attempts.sort((a, b) => {
                const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0;
                const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0;
                return timeB - timeA;
            });

            // Fetch results for scores
            const resultsMap: { [attemptId: string]: any } = {};
            for (const sid of matchedStudentIds) {
                const resultsSnapshot = await db.collection("results")
                    .where("studentId", "==", sid)
                    .where("isDeleted", "==", false)
                    .get();
                resultsSnapshot.docs.forEach(doc => {
                    resultsMap[doc.data().attemptId] = doc.data();
                });
            }

            // Fetch tests for titles
            const testIds = Array.from(new Set(attempts.map(a => a.testId)));
            const testMap: { [id: string]: any } = {};

            if (testIds.length > 0) {
                const testRefs = testIds.map(id => db.collection("tests").doc(id));
                const testDocs = await db.getAll(...testRefs);
                testDocs.forEach(doc => {
                    if (doc.exists) {
                        testMap[doc.id] = doc.data();
                    }
                });
            }

            const history = attempts.map(a => {
                const resData = resultsMap[a.id];
                const test = testMap[a.testId];
                return {
                    attemptId: a.id,
                    testId: a.testId,
                    testTitle: test ? test.title : "Deleted/Unknown Test",
                    status: a.status,
                    startTime: a.startTime,
                    endTime: a.endTime,
                    isSubmitted: a.isSubmitted,
                    submittedAt: a.submittedAt,
                    score: resData ? resData.obtainedMarks : null,
                    totalMarks: resData ? resData.totalMarks : (test ? test.totalMarks : null),
                    percentage: resData ? resData.percentage : null,
                    passFailStatus: resData ? (((resData.obtainedMarks || 0) <= 0) ? "fail" : resData.status) : null,
                    rank: resData ? resData.rank : null,
                    percentile: resData ? resData.percentile : null
                };
            });

            return res.status(200).json({
                success: true,
                message: "Attempt history retrieved successfully",
                data: history
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving attempt history"
            });
        }
    }

    /**
     * LEADERBOARD
     * GET /leaderboard/:testId
     */
    static async getLeaderboard(req: Request, res: Response) {
        try {
            const { testId } = req.params;

            const snapshot = await db.collection("leaderboards")
                .where("testId", "==", testId)
                .get();

            const entries = snapshot.docs.map(doc => doc.data()) as any[];

            // Build lookup maps for user & student records
            const usersSnapshot = await db.collection("users").get();
            const userToStudentMap: { [userId: string]: any } = {};
            usersSnapshot.docs.forEach(doc => {
                const u = doc.data();
                const uid = u.id || doc.id;
                userToStudentMap[uid] = u;
            });

            const studentsSnapshot = await db.collection("students").get();
            const studentsMap: { [id: string]: any } = {};
            studentsSnapshot.docs.forEach(doc => {
                const s = doc.data();
                const sid = s.id || doc.id;
                studentsMap[sid] = s;
            });

            const enrichedEntries = entries.map(entry => {
                const sid = entry.studentId;
                const userObj = userToStudentMap[sid];
                const resolvedStudentId = userObj?.studentId || sid;
                const student = studentsMap[resolvedStudentId] || studentsMap[sid] || {};

                const rollNumber = student.rollNumber || student.rollNo || student.admissionNumber || student.loginUsername || userObj?.username || userObj?.loginUsername || sid;

                let studentName = "";
                if (student.firstName) {
                    studentName = `${student.firstName} ${student.lastName || ""}`.trim();
                } else if (student.fullName) {
                    studentName = student.fullName;
                } else if (student.name) {
                    studentName = student.name;
                } else if (userObj?.name) {
                    studentName = userObj.name;
                } else {
                    studentName = sid ? `Student (${sid})` : "Unknown Student";
                }

                return {
                    ...entry,
                    studentName,
                    rollNumber
                };
            });

            // Sort in memory by rank asc
            enrichedEntries.sort((a: any, b: any) => (a.rank || 0) - (b.rank || 0));

            return res.status(200).json({
                success: true,
                message: "Leaderboard retrieved successfully",
                data: enrichedEntries
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving leaderboard"
            });
        }
    }

    /**
     * TOP RANKERS
     * GET /top-rankers/:testId
     */
    static async getTopRankers(req: Request, res: Response) {
        try {
            const { testId } = req.params;

            const snapshot = await db.collection("leaderboards")
                .where("testId", "==", testId)
                .get();

            const entries = snapshot.docs.map(doc => doc.data());
            
            // Sort in memory by rank asc
            entries.sort((a, b) => (a.rank || 0) - (b.rank || 0));
            const top10 = entries.slice(0, 10);

            return res.status(200).json({
                success: true,
                message: "Top rankers retrieved successfully",
                data: top10
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving top rankers"
            });
        }
    }

    /**
     * STUDENT ANALYTICS
     * GET /analytics/:studentId
     */
    static async getStudentAnalytics(req: Request, res: Response) {
        try {
            const { studentId } = req.params;

            const snapshot = await db.collection("results")
                .where("studentId", "==", studentId)
                .where("isDeleted", "==", false)
                .get();

            if (snapshot.empty) {
                return res.status(200).json({
                    success: true,
                    data: {
                        totalAttempts: 0,
                        accuracy: 0,
                        wrongAnswers: 0,
                        skippedQuestions: 0,
                        averageScore: 0,
                        bestScore: 0,
                        worstScore: 0,
                        passRate: 0
                    }
                });
            }

            const results = snapshot.docs.map(doc => doc.data());
            let totalQuestionsEvaluated = 0;
            let totalCorrect = 0;
            let totalWrong = 0;
            let totalSkipped = 0;
            let scoreSum = 0;
            let bestScore = -Infinity;
            let worstScore = Infinity;
            let passCount = 0;

            for (const resData of results) {
                const obtained = resData.obtainedMarks || 0;
                scoreSum += obtained;
                if (obtained > bestScore) bestScore = obtained;
                if (obtained < worstScore) worstScore = obtained;
                if (resData.status === "pass") passCount++;

                const details = resData.questionDetails || [];
                for (const qd of details) {
                    totalQuestionsEvaluated++;
                    if (qd.selectedAnswer === null || qd.selectedAnswer === undefined || qd.selectedAnswer === "") {
                        totalSkipped++;
                    } else if (qd.isCorrect) {
                        totalCorrect++;
                    } else {
                        totalWrong++;
                    }
                }
            }

            const totalAttempts = results.length;
            const averageScore = scoreSum / totalAttempts;
            const passRate = (passCount / totalAttempts) * 100;
            const accuracy = totalQuestionsEvaluated > totalSkipped ? (totalCorrect / (totalQuestionsEvaluated - totalSkipped)) * 100 : 0;

            return res.status(200).json({
                success: true,
                data: {
                    totalAttempts,
                    accuracy: Math.round(accuracy * 100) / 100,
                    wrongAnswers: totalWrong,
                    skippedQuestions: totalSkipped,
                    averageScore: Math.round(averageScore * 100) / 100,
                    bestScore: bestScore === -Infinity ? 0 : bestScore,
                    worstScore: worstScore === Infinity ? 0 : worstScore,
                    passRate: Math.round(passRate * 100) / 100
                }
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving student analytics"
            });
        }
    }

    /**
     * GET ALL TEST RESULTS (Admin Results Log)
     * GET /results/all-tests?keyword=&date=
     * Returns results grouped by test, sorted by marks desc, with correct/wrong answer counts
     */
    static async getAllTestResults(req: Request, res: Response) {
        try {
            const keyword = String(req.query.keyword || "").toLowerCase().trim();
            const dateFilter = String(req.query.date || "").trim(); // YYYY-MM-DD format

            // 1. Fetch all tests
            const testsSnapshot = await db.collection("tests")
                .where("isDeleted", "==", false)
                .get();

            const allTests = testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
            
            // Sort in memory by createdAt desc
            allTests.sort((a, b) => {
                const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0;
                const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0;
                return timeB - timeA;
            });

            // 2. Fetch all non-deleted results
            const resultsSnapshot = await db.collection("results")
                .where("isDeleted", "==", false)
                .get();

            const allResults = resultsSnapshot.docs.map(doc => doc.data()) as any[];

            // 3. Fetch all students for roll-number/name lookup
            const usersSnapshot = await db.collection("users").get();
            const userToStudentMap: { [userId: string]: string } = {};
            usersSnapshot.docs.forEach(doc => {
                const u = doc.data();
                if (u.studentId) {
                    userToStudentMap[u.id || doc.id] = u.studentId;
                }
            });

            const studentsSnapshot = await db.collection("students").get();
            const studentsMap: { [id: string]: any } = {};
            studentsSnapshot.docs.forEach(doc => {
                const s = doc.data();
                studentsMap[s.id || doc.id] = s;
            });

            // 4. Build per-test leaderboard entries
            const testResultsLog: any[] = [];

            for (const test of allTests) {
                // Apply keyword filter on test title
                if (keyword && !test.title?.toLowerCase().includes(keyword)) continue;

                // Apply date filter on test createdAt
                if (dateFilter) {
                    let testDate = "";
                    if (test.createdAt?.toDate) {
                        testDate = test.createdAt.toDate().toISOString().slice(0, 10);
                    } else if (test.createdAt) {
                        testDate = new Date(test.createdAt).toISOString().slice(0, 10);
                    }
                    if (testDate !== dateFilter) continue;
                }

                const testResults = allResults.filter(r => r.testId === test.id);

                // Sort by obtainedMarks descending
                testResults.sort((a, b) => (b.obtainedMarks || 0) - (a.obtainedMarks || 0));

                // Build ranked entries with correct/wrong counts
                const entries = testResults.map((r, idx) => {
                    const resolvedStudentId = userToStudentMap[r.studentId] || r.studentId;
                    const student = studentsMap[resolvedStudentId] || {};
                    const rollNumber = student.rollNumber || student.rollNo || r.studentId || `STU-${idx + 1}`;
                    const studentName = student.firstName
                        ? `${student.firstName} ${student.lastName || ""}`.trim()
                        : (student.name || r.studentId || "Unknown");

                    // Compute correct/wrong from questionDetails
                    const details = r.questionDetails || [];
                    let correct = 0, wrong = 0, skipped = 0;
                    for (const qd of details) {
                        if (qd.selectedAnswer === null || qd.selectedAnswer === undefined || qd.selectedAnswer === "") {
                            skipped++;
                        } else if (qd.isCorrect) {
                            correct++;
                        } else {
                            wrong++;
                        }
                    }

                    let evaluatedAt = "";
                    if (r.evaluatedAt?.toDate) {
                        evaluatedAt = r.evaluatedAt.toDate().toISOString();
                    } else if (r.evaluatedAt) {
                        evaluatedAt = new Date(r.evaluatedAt).toISOString();
                    }

                    return {
                        serialNo: idx + 1,
                        rank: idx + 1,
                        studentId: r.studentId,
                        rollNumber,
                        studentName,
                        attemptId: r.attemptId,
                        obtainedMarks: r.obtainedMarks ?? 0,
                        totalMarks: r.totalMarks ?? 0,
                        percentage: r.percentage ?? 0,
                        status: ((r.obtainedMarks ?? 0) <= 0) ? "fail" : (r.status || "fail"),
                        correct,
                        wrong,
                        skipped,
                        totalQuestions: details.length,
                        evaluatedAt
                    };
                });

                let testCreatedAt = "";
                if (test.createdAt?.toDate) {
                    testCreatedAt = test.createdAt.toDate().toISOString();
                } else if (test.createdAt) {
                    testCreatedAt = new Date(test.createdAt).toISOString();
                }

                testResultsLog.push({
                    testId: test.id,
                    testTitle: test.title || "Untitled Test",
                    testType: test.testType || "mock",
                    category: test.testType || "mock",
                    totalQuestions: test.totalQuestions || (test.questionIds?.length ?? 0),
                    marksPerQuestion: test.marksPerQuestion || 1,
                    negativeMarks: test.negativeMarks || 0.25,
                    totalParticipants: entries.length,
                    createdAt: testCreatedAt,
                    entries
                });
            }

            return res.status(200).json({
                success: true,
                message: "All test results retrieved successfully",
                data: testResultsLog
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving all test results"
            });
        }
    }
}
