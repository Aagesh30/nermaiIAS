import { Request, Response } from "express";
import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "nermai-academy-backend",
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nermai-academy-backend-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();

export class EvaluationController {

    private static normalize(str: any): string {
        return String(str || "").trim().toLowerCase();
    }

    private static async recalculateRanksAndPercentiles(testId: string) {
        const resultsSnapshot = await db.collection("results")
            .where("testId", "==", testId)
            .where("isDeleted", "==", false)
            .get();

        if (resultsSnapshot.empty) {
            // Clean up leaderboard for this test if no results
            const leaderboardSnapshot = await db.collection("leaderboards")
                .where("testId", "==", testId)
                .get();
            if (!leaderboardSnapshot.empty) {
                const batch = db.batch();
                leaderboardSnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }
            return;
        }

        const results = resultsSnapshot.docs.map(doc => ({
            docId: doc.id,
            ...doc.data()
        })) as any[];

        // Sort by obtainedMarks desc, then by updatedAt asc
        results.sort((a, b) => b.obtainedMarks - a.obtainedMarks);

        const N = results.length;
        const batch = db.batch();
        const bestStudentScores: { [studentId: string]: any } = {};

        for (let i = 0; i < N; i++) {
            const currentResult = results[i];
            const score = currentResult.obtainedMarks;

            // Standard Competition Rank: Number of scores strictly higher than current + 1
            const rank = results.filter(r => r.obtainedMarks > score).length + 1;

            // Percentile: (Count of scores strictly less than S) / N * 100
            const countLess = results.filter(r => r.obtainedMarks < score).length;
            const percentile = N > 1 ? Math.round((countLess / (N - 1)) * 10000) / 100 : 100;

            const resultRef = db.collection("results").doc(currentResult.docId);
            batch.update(resultRef, {
                rank,
                percentile,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Keep only the best score of each student for the leaderboard
            const studentId = currentResult.studentId;
            if (!bestStudentScores[studentId] || score > bestStudentScores[studentId].obtainedMarks) {
                bestStudentScores[studentId] = {
                    ...currentResult,
                    rank,
                    percentile
                };
            }
        }

        await batch.commit();

        // Update leaderboard collection
        const leaderboardSnapshot = await db.collection("leaderboards")
            .where("testId", "==", testId)
            .get();

        const leaderboardBatch = db.batch();

        // Delete existing leaderboard entries for this test first to prevent stale records
        leaderboardSnapshot.docs.forEach(doc => {
            leaderboardBatch.delete(doc.ref);
        });

        // Insert fresh best scores
        for (const studentId of Object.keys(bestStudentScores)) {
            const best = bestStudentScores[studentId];
            const leaderboardDocId = `${testId}_${studentId}`;
            const leaderboardRef = db.collection("leaderboards").doc(leaderboardDocId);

            leaderboardBatch.set(leaderboardRef, {
                id: leaderboardDocId,
                testId,
                studentId,
                attemptId: best.attemptId,
                obtainedMarks: best.obtainedMarks,
                totalMarks: best.totalMarks,
                percentage: best.percentage,
                rank: best.rank,
                percentile: best.percentile,
                status: best.status,
                correct: best.correct ?? 0,
                wrong: best.wrong ?? 0,
                skipped: best.skipped ?? 0,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        await leaderboardBatch.commit();
    }

    /**
     * EVALUATE ATTEMPT
     * POST /evaluate/:attemptId
     */
    static async evaluateAttempt(req: Request, res: Response) {
        try {
            const { attemptId } = req.params;

            const attemptDoc = await db.collection("student_attempts").doc(attemptId).get();
            if (!attemptDoc.exists) {
                return res.status(404).json({
                    success: false,
                    message: "Attempt not found"
                });
            }

            const attempt = attemptDoc.data()!;
            if (attempt.isDeleted) {
                return res.status(400).json({
                    success: false,
                    message: "This attempt has been deleted"
                });
            }

            const testDoc = await db.collection("tests").doc(attempt.testId).get();
            if (!testDoc.exists) {
                return res.status(404).json({
                    success: false,
                    message: "Test not found"
                });
            }

            const test = testDoc.data()!;
            const questionIds = test.questionIds || [];

            let questions: any[] = [];
            if (questionIds.length > 0) {
                const questionRefs = questionIds.map((id: string) => db.collection("questions").doc(id));
                const questionDocs = await db.getAll(...questionRefs);
                questions = questionDocs
                    .filter(doc => doc.exists && !doc.data()?.isDeleted)
                    .map(doc => ({ id: doc.id, ...doc.data() }));
            }

            const answersSnapshot = await db.collection("student_answers")
                .where("attemptId", "==", attemptId)
                .get();

            const studentAnswers = answersSnapshot.docs.map(doc => doc.data());

            // ─────────────────────────────────────────────────────────────
            // MARKS LOGIC:
            //   Correct answer  → +marksPerQuestion (default 1)
            //   Wrong answer    → -negativeMarks    (default 0.25)
            //   Unattempted     → 0
            // ─────────────────────────────────────────────────────────────
            const marksPerQ    = Number(test.marksPerQuestion) || 1;
            const negMarksPerQ = Number(test.negativeMarks)    || 0.25;

            let totalMarks    = questions.length * marksPerQ;
            let obtainedMarks = 0;
            const questionDetails: any[] = [];

            for (const question of questions) {
                const qId   = question.id;
                const qType = String(question.type || "").toUpperCase();

                const studentAns = studentAnswers.find(sa => sa.questionId === qId);
                const selected   = studentAns ? studentAns.selectedAnswer : null;

                let isCorrect          = false;
                let isPartiallyCorrect = false;
                let scoreAwarded       = 0;
                let studentLetter      = "";

                if (selected !== null && selected !== undefined && selected !== "") {
                    const selStr = String(selected).trim();
                    if (/^[A-D]$/i.test(selStr)) {
                        studentLetter = selStr.toUpperCase();
                    } else {
                        const opts = question.options || [];
                        const optsTa = question.optionsTa || [];
                        const idx = opts.findIndex((o: any) => String(o || "").trim().toLowerCase() === selStr.toLowerCase());
                        const idxTa = idx === -1 ? optsTa.findIndex((o: any) => String(o || "").trim().toLowerCase() === selStr.toLowerCase()) : -1;
                        const finalIdx = idx !== -1 ? idx : idxTa;
                        if (finalIdx !== -1) {
                            studentLetter = ["A", "B", "C", "D"][finalIdx];
                        } else {
                            const prefixMatch = selStr.match(/^([A-D])[.):\-]/i);
                            if (prefixMatch) {
                                studentLetter = prefixMatch[1].toUpperCase();
                            }
                        }
                    }
                }

                const isAttempted = studentLetter !== "";

                if (isAttempted) {
                    const correct = String(question.correctAnswer || "").trim().toUpperCase();
                    if (studentLetter === correct && correct !== "") {
                        // ✅ Correct
                        isCorrect    = true;
                        scoreAwarded = marksPerQ;
                    } else {
                        // ❌ Wrong
                        scoreAwarded = -negMarksPerQ;
                    }
                } else {
                    // ⚠️ Unattempted / Unattended
                    const unattendedMarksPerQ = test.unattendedMarks !== undefined ? Number(test.unattendedMarks) : 0;
                    scoreAwarded = unattendedMarksPerQ;
                }

                obtainedMarks += scoreAwarded;

                questionDetails.push({
                    questionId: qId,
                    type:       question.type || "MCQ",
                    marks:      marksPerQ,
                    negativeMarks: negMarksPerQ,
                    selectedAnswer:  studentLetter || null,
                    correctAnswer:   question.correctAnswer,
                    isCorrect,
                    isPartiallyCorrect,
                    scoreAwarded: Math.round(scoreAwarded * 100) / 100
                });
            }

            // Round to 2 decimal places; cap displayed score at 0 (never show negative total)
            const actualObtainedMarks = Math.round(obtainedMarks * 100) / 100;
            const finalObtainedMarks  = Math.max(0, actualObtainedMarks);
            const percentage          = totalMarks > 0 ? (finalObtainedMarks / totalMarks) * 100 : 0;
            const passingMarks        = Number(test.passingMarks) || 0;
            let status = "fail";
            if (finalObtainedMarks > 0) {
                if (passingMarks > 0) {
                    status = finalObtainedMarks >= passingMarks ? "pass" : "fail";
                } else {
                    status = finalObtainedMarks >= (totalMarks * 0.35) ? "pass" : "fail";
                }
            }

            // Compute aggregate counts
            const correctCount  = questionDetails.filter(qd => qd.isCorrect).length;
            const wrongCount    = questionDetails.filter(qd => !qd.isCorrect && qd.selectedAnswer !== null && qd.selectedAnswer !== undefined && qd.selectedAnswer !== "").length;
            const skippedCount  = questionDetails.filter(qd => qd.selectedAnswer === null || qd.selectedAnswer === undefined || qd.selectedAnswer === "").length;

            const resultPayload = {
                id: attemptId,
                attemptId,
                testId: attempt.testId,
                studentId: attempt.studentId,
                totalMarks,
                obtainedMarks: finalObtainedMarks,
                percentage: Math.round(percentage * 100) / 100,
                status,
                rank: 1, // Will be computed in the recalculate stage
                percentile: 100, // Will be computed in the recalculate stage
                correct: correctCount,
                wrong: wrongCount,
                skipped: skippedCount,
                tabLeaveCount: attempt.tabLeaveCount || 0,
                questionDetails,
                evaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
                isDeleted: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            await db.collection("results").doc(attemptId).set(resultPayload);

            // Update attempt status to evaluated
            await db.collection("student_attempts").doc(attemptId).update({
                status: "evaluated",
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Recalculate ranks and percentiles for this test
            await EvaluationController.recalculateRanksAndPercentiles(attempt.testId);

            // Retrieve updated result with rank & percentile
            const updatedDoc = await db.collection("results").doc(attemptId).get();

            return res.status(200).json({
                success: true,
                message: "Attempt evaluated successfully",
                data: updatedDoc.data()
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred during evaluation"
            });
        }
    }

    /**
     * GET EVALUATION RESULT
     * GET /result/:attemptId
     */
    static async getResult(req: Request, res: Response) {
        try {
            const { attemptId } = req.params;

            const resultDoc = await db.collection("results").doc(attemptId).get();
            if (!resultDoc.exists) {
                return res.status(404).json({
                    success: false,
                    message: "Result not found"
                });
            }

            const result = resultDoc.data()!;
            if (result.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: "Result has been deleted"
                });
            }

            return res.status(200).json({
                success: true,
                data: result
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving result"
            });
        }
    }

    private static async enrichResult(r: any): Promise<any> {
        if (!r) return r;
        let studentName = r.studentName || "";
        let rollNumber = r.rollNumber || "";
        
        if (r.studentId === "student-default") {
            return {
                ...r,
                studentName: "Student User (Demo)",
                rollNumber: "DEMO-001"
            };
        }
        
        try {
            // Try finding in users first
            const userDoc = await db.collection("users").doc(r.studentId).get();
            if (userDoc.exists) {
                const userData = userDoc.data()!;
                studentName = userData.name || studentName;
                
                if (userData.studentId) {
                    const studentDoc = await db.collection("students").doc(userData.studentId).get();
                    if (studentDoc.exists) {
                        const studentData = studentDoc.data()!;
                        const first = studentData.firstName || "";
                        const last = studentData.lastName || "";
                        const full = (first + " " + last).trim();
                        studentName = full || studentData.fullName || studentName;
                        rollNumber = studentData.rollNumber || "";
                    }
                } else {
                    rollNumber = userData.username || "";
                }
            } else {
                // Try finding in leads (guests)
                const leadDoc = await db.collection("leads").doc(r.studentId).get();
                if (leadDoc.exists) {
                    const leadData = leadDoc.data()!;
                    studentName = leadData.name || studentName;
                    rollNumber = "Guest";
                }
            }
        } catch (err) {
            console.log("Error enriching result:", err);
        }
        
        if (!studentName) {
            studentName = `Guest: ${r.studentId.substring(0, 8)}`;
            rollNumber = "Guest";
        }

        let tabLeaveCount = r.tabLeaveCount;
        if (tabLeaveCount === undefined || tabLeaveCount === null) {
            try {
                const attemptDoc = await db.collection("student_attempts").doc(r.attemptId || r.id).get();
                if (attemptDoc.exists) {
                    tabLeaveCount = attemptDoc.data()?.tabLeaveCount || 0;
                }
            } catch (err) {
                console.log("Error fetching tabLeaveCount in enrichResult:", err);
            }
        }
        
        return {
            ...r,
            studentName,
            rollNumber,
            tabLeaveCount: tabLeaveCount || 0
        };
    }

    /**
     * GET STUDENT RESULT BY TEST
     * GET /student/:studentId/test/:testId
     */
    static async getStudentResult(req: Request, res: Response) {
        try {
            const { studentId, testId } = req.params;

            const snapshot = await db.collection("results")
                .where("studentId", "==", studentId)
                .where("testId", "==", testId)
                .where("isDeleted", "==", false)
                .orderBy("obtainedMarks", "desc")
                .limit(1)
                .get();

            if (snapshot.empty) {
                return res.status(404).json({
                    success: false,
                    message: "No result found for this student and test"
                });
            }

            const enriched = await EvaluationController.enrichResult(snapshot.docs[0].data());

            return res.status(200).json({
                success: true,
                data: enriched
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving student result"
            });
        }
    }

    /**
     * GET ALL RESULTS OF A TEST
     * GET /test/:testId
     */
    static async getTestResults(req: Request, res: Response) {
        try {
            const { testId } = req.params;

            const snapshot = await db.collection("results")
                .where("testId", "==", testId)
                .where("isDeleted", "==", false)
                .orderBy("obtainedMarks", "desc")
                .get();

            const results = snapshot.docs.map(doc => doc.data());
            const enrichedResults = await Promise.all(results.map(r => EvaluationController.enrichResult(r)));

            return res.status(200).json({
                success: true,
                data: enrichedResults
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while retrieving test results"
            });
        }
    }

    /**
     * RECALCULATE RESULT
     * POST /recalculate/:attemptId
     */
    static async recalculateResult(req: Request, res: Response) {
        // Just call evaluateAttempt, as it fetches latest keys and re-evaluates
        return EvaluationController.evaluateAttempt(req, res);
    }

    /**
     * DELETE RESULT
     * DELETE /result/:resultId
     */
    static async deleteResult(req: Request, res: Response) {
        try {
            const { resultId } = req.params;

            const resultDoc = await db.collection("results").doc(resultId).get();
            if (!resultDoc.exists) {
                return res.status(404).json({
                    success: false,
                    message: "Result not found"
                });
            }

            const result = resultDoc.data()!;
            await db.collection("results").doc(resultId).update({
                isDeleted: true,
                deletedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Recalculate ranks & percentiles for remaining results of the test
            await EvaluationController.recalculateRanksAndPercentiles(result.testId);

            return res.status(200).json({
                success: true,
                message: "Result deleted and ranks recalculated successfully"
            });

        } catch (error: any) {
            return res.status(500).json({
                success: false,
                message: error.message || "An error occurred while deleting result"
            });
        }
    }
}
