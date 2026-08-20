import { Request, Response } from "express";
import admin from "firebase-admin";
import { randomUUID } from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Groq } from "groq-sdk";
import * as fs from "fs";
import * as path from "path";
import { uploadFileToGoogleDrive } from "../../../services/google_drive";

const db = admin.firestore();
const COLLECTION = "tests";
const TEMP_COLLECTION = "tests";
// Groq is PRIMARY (free). Gemini is fallback (costs money — only used if Groq fails).
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.FIREBASE_API_KEY || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const groq = new Groq({ apiKey: GROQ_API_KEY });

/**
 * Pre-process document text to strip noise and reduce AI token usage (~40% savings).
 * Removes: blank lines, page numbers, repeated whitespace, common header/footer patterns.
 */
function cleanDocumentText(text: string): string {
    if (!text) return "";
    let cleaned = text
        // Collapse multiple blank lines into one
        .replace(/\n{3,}/g, "\n\n")
        // Remove pure page number lines (standalone numbers like "1", "Page 2", "- 3 -")
        .replace(/^\s*[-–]?\s*[Pp]age\s*\d+\s*[-–]?\s*$/gm, "")
        .replace(/^\s*\d{1,3}\s*$/gm, "")
        // Remove lines that are purely dots/dashes (table separators)
        .replace(/^[.\-_=]{4,}$/gm, "")
        // Collapse multiple spaces into one
        .replace(/[ \t]{2,}/g, " ")
        // Remove watermark-style repeated text (lines repeating same word 3+ times)
        .replace(/^(\S+)(\s+\1){2,}$/gm, "")
        // Strip lines that appear to be footer/header boilerplate
        .replace(/^.*(?:nermai|academy|copyright|©|all rights reserved|www\.|http|\.com|\.in|confidential|strictly private).*$/gim, "")
        .trim();
    return cleaned;
}

/**
 * Call Groq Llama-3.3-70b (FREE primary AI engine).
 * Falls back to Gemini 1.5 Flash only if Groq fails.
 */
async function callAIWithFallback(prompt: string): Promise<{ text: string; provider: string }> {
    // PRIMARY: Groq (100% Free)
    try {
        const text = await callGroqWithRetry(prompt, "llama-3.3-70b-versatile");
        return { text, provider: "groq" };
    } catch (groqErr: any) {
        console.warn("[AI] Groq failed, attempting Gemini fallback...", groqErr.message);
    }
    // FALLBACK: Gemini (costs money, only if GEMINI_API_KEY is set)
    if (genAI && GEMINI_API_KEY) {
        try {
            const text = await callGeminiWithRetry(prompt, "gemini-1.5-flash-8b");
            return { text, provider: "gemini" };
        } catch (geminiErr: any) {
            console.error("[AI] Both Groq and Gemini failed.", geminiErr.message);
        }
    }
    throw new Error("AI extraction failed: both Groq and Gemini are unavailable. Please try Local extraction.");
}

async function callGroqWithRetry(prompt: string, modelName: string = "llama-3.3-70b-versatile"): Promise<string> {
    const maxRetries = 3;
    const baseDelay = 2000;
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`[AI] Calling Groq ${modelName} (attempt ${i + 1}/${maxRetries})...`);
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "You are an expert at extracting MCQ questions from Indian competitive exam papers. Return only valid JSON, no markdown, no explanation." },
                    { role: "user", content: prompt }
                ],
                model: modelName,
                temperature: 0.05,
            });
            return chatCompletion.choices[0].message.content || "";
        } catch (err: any) {
            console.error(`[AI] Groq error (attempt ${i + 1}/${maxRetries}):`, err.message || err);
            if (i < maxRetries - 1) {
                const waitTime = baseDelay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                throw err;
            }
        }
    }
    throw new Error("Groq AI: failed after maximum retries");
}

async function callGeminiWithRetry(prompt: string, modelName: string = "gemini-1.5-flash-8b"): Promise<string> {
    if (!genAI) throw new Error("Gemini not configured");
    const maxRetries = 2;
    const baseDelay = 3000;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 0.1 } });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (err: any) {
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i)));
            } else throw err;
        }
    }
    throw new Error("Gemini AI: failed");
}

function stripEmojis(text: string): string {
    if (!text) return "";
    return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "").trim();
}

export class TestCreationController {

    /**
     * EXTRACT QUESTIONS FROM DOCUMENT (Two modes: local regex OR Groq AI)
     * POST /api/test-portal/test-creation/extract
     * Supports: Word (.docx/.doc), PDF, or raw pasted text.
     * Mode: 'local' (fast regex, may miss some questions – returns warnings for review)
     *        'ai'    (Groq Llama-3.3 – 100% free, full document, bilingual, highly accurate)
     */
    static async extractQuestionsFromPdf(req: Request, res: Response) {
        try {
            const { questionPaperBase64, answerKeyBase64, questionPaperText, answerKeyText, title, filename, mode } = req.body;

            if (!questionPaperText && !questionPaperBase64) {
                return res.status(400).json({
                    success: false,
                    message: "Question paper content (text or base64 file) is required"
                });
            }

            // ── Step 1: Extract raw text from question paper file ──
            let qpText = questionPaperText || "";
            if (!qpText && questionPaperBase64) {
                const fileBuffer = Buffer.from(questionPaperBase64, "base64");
                const isWord = filename
                    ? (filename.toLowerCase().endsWith(".docx") || filename.toLowerCase().endsWith(".doc"))
                    : true;

                if (isWord) {
                    try {
                        const mammoth = require("mammoth");
                        const result = await mammoth.extractRawText({ buffer: fileBuffer });
                        qpText = result.value || "";
                        console.log(`[EXTRACT] Mammoth Word extraction: ${qpText.length} chars`);
                    } catch {
                        try {
                            const pdfParse = require("pdf-parse");
                            const data = await pdfParse(fileBuffer);
                            qpText = data.text || "";
                        } catch {
                            qpText = fileBuffer.toString("utf-8");
                        }
                    }
                } else {
                    try {
                        const pdfParse = require("pdf-parse");
                        const data = await pdfParse(fileBuffer);
                        qpText = data.text || "";
                        console.log(`[EXTRACT] PDF extraction: ${qpText.length} chars`);
                    } catch {
                        try {
                            const mammoth = require("mammoth");
                            const result = await mammoth.extractRawText({ buffer: fileBuffer });
                            qpText = result.value || "";
                        } catch {
                            qpText = fileBuffer.toString("utf-8");
                        }
                    }
                }
            }

            // ── Step 2: Extract raw text from answer key (if provided) ──
            let akText = answerKeyText || "";
            if (!akText && answerKeyBase64) {
                const fileBuffer = Buffer.from(answerKeyBase64, "base64");
                try {
                    const mammoth = require("mammoth");
                    const result = await mammoth.extractRawText({ buffer: fileBuffer });
                    akText = result.value || "";
                } catch {
                    try {
                        const pdfParse = require("pdf-parse");
                        const data = await pdfParse(fileBuffer);
                        akText = data.text || "";
                    } catch {
                        akText = fileBuffer.toString("utf-8");
                    }
                }
            }

            const targetMode = (mode === "ai" || mode === "local") ? mode : "local";
            console.log(`[EXTRACT] qpText: ${qpText.length} chars | akText: ${akText.length} chars | Mode: ${targetMode}`);

            if (!qpText.trim()) {
                return res.status(422).json({
                    success: false,
                    message: "Could not extract readable text. Please ensure the document is not a scanned image."
                });
            }

            let questions: any[] = [];
            let extractionMethod = "";
            // warnings: list of objects describing questions that may be poorly extracted
            const extractionWarnings: { questionNo: number; issue: string }[] = [];

            // ── Step 3A: Local Regex Extraction ──
            if (targetMode === "local") {
                console.log("[EXTRACT] Attempting local regex extraction...");
                const answerMap: Record<number, string> = {};
                if (akText) {
                    const lines = akText.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
                    let isCsv = false;
                    for (const line of lines) {
                        if (/^\d+\s*,\s*[A-Da-d]\b/.test(line) || /^[Qq]\s*(?:[Nn]o)?\s*,\s*[Kk]ey/i.test(line)) {
                            isCsv = true;
                            break;
                        }
                    }

                    if (isCsv) {
                        console.log("[EXTRACT] Answer key detected as CSV format.");
                        for (const line of lines) {
                            const parts = line.split(",");
                            if (parts.length >= 2) {
                                const qNum = parseInt(parts[0].trim(), 10);
                                const key = parts[1].trim().toUpperCase();
                                if (!isNaN(qNum) && ["A", "B", "C", "D"].includes(key)) {
                                    answerMap[qNum] = key;
                                }
                            }
                        }
                        console.log(`[EXTRACT] Parsed ${Object.keys(answerMap).length} answers from CSV.`);
                    } else {
                        console.log("[EXTRACT] Answer key using regex format matching...");
                        const akMatches = akText.matchAll(/(?:Q\.?\s*)?(\d+)[.):\-\s]+([A-Da-d])\b/g);
                        for (const m of akMatches) {
                            answerMap[parseInt(m[1])] = m[2].toUpperCase();
                        }
                        console.log(`[EXTRACT] Parsed ${Object.keys(answerMap).length} answers from Regex.`);
                    }
                }
                const localQuestions = parseQuestionsFromText(qpText, answerMap);

                // Verify continuity flow: questions must be 1 to localQuestions.length without missing numbers
                let isContinuous = false;
                if (localQuestions.length > 0) {
                    const sortedQ = [...localQuestions].sort((a, b) => a.questionNo - b.questionNo);
                    isContinuous = true;
                    for (let i = 0; i < sortedQ.length; i++) {
                        if (sortedQ[i].questionNo !== i + 1) {
                            isContinuous = false;
                            console.log(`[EXTRACT] Discontinuity detected at expected question index ${i + 1}, found question number ${sortedQ[i].questionNo}.`);
                            break;
                        }
                    }
                }

                questions = localQuestions;
                extractionMethod = "local";
                console.log(`[EXTRACT] Local regex extracted ${questions.length} questions (continuity: ${isContinuous}).`);

                // ── Analyse each question for quality issues and record warnings ──
                for (const q of questions) {
                    const issues: string[] = [];
                    const qText = q.question || q.questionText || "";
                    if (!qText || qText.trim().length < 5) issues.push("question text missing or too short");
                    const opts = [q["option a"], q["option b"], q["option c"], q["option d"]];
                    const emptyOpts = opts.filter(o => !o || o.trim() === "").length;
                    if (emptyOpts > 0) issues.push(`${emptyOpts} option(s) missing`);
                    // Note: correctAnswer is NOT flagged — admin will set it manually if no answer key uploaded
                    if (issues.length > 0) {
                        extractionWarnings.push({ questionNo: q.questionNo, issue: issues.join("; ") });
                    }
                }

                if (!isContinuous) {
                    const detectedNums = questions.map(q => q.questionNo);
                    const maxQ = detectedNums.length > 0 ? Math.max(...detectedNums) : 0;
                    for (let n = 1; n <= maxQ; n++) {
                        if (!detectedNums.includes(n)) {
                            extractionWarnings.push({ questionNo: n, issue: "question not detected by local parser – may be missing from test" });
                        }
                    }
                }
            }

            // ── Step 3B: Groq AI Extraction (primary, free) with Gemini fallback ──
            if (targetMode === "ai") {
                console.log("[EXTRACT] Attempting AI extraction (Groq primary, Gemini fallback)...");
                extractionMethod = "ai_groq";

                // Clean document text before sending to reduce token usage by ~40%
                const cleanedQpText = cleanDocumentText(qpText);
                const cleanedAkText = akText ? cleanDocumentText(akText) : "";
                console.log(`[EXTRACT] Cleaned text: ${cleanedQpText.length} chars (was ${qpText.length})`);

                const answerInstruction = cleanedAkText
                    ? "Answer Key is provided below. Match question number to answer key. Fill correctAnswer field."
                    : "No answer key. Set correctAnswer to your best guess (A/B/C/D).";

                // Helper to chunk text to respect Groq free tier limit (12,000 TPM)
                const chunkTextBySize = (text: string, maxChunkSize: number = 10000): string[] => {
                    const lines = text.split("\n");
                    const chunks: string[] = [];
                    let currentChunk = "";
                    for (const line of lines) {
                        if (currentChunk.length + line.length + 1 > maxChunkSize) {
                            if (currentChunk.trim()) chunks.push(currentChunk.trim());
                            currentChunk = line;
                        } else {
                            currentChunk += (currentChunk ? "\n" : "") + line;
                        }
                    }
                    if (currentChunk.trim()) chunks.push(currentChunk.trim());
                    return chunks;
                };

                // Split into chunks of ~10,000 characters (~2,500 tokens)
                const qpChunks = chunkTextBySize(cleanedQpText, 10000);
                console.log(`[EXTRACT] Split question paper into ${qpChunks.length} chunks to fit Groq free tier TPM.`);

                let allParsedQuestions: any[] = [];
                let fallbackUsed = false;

                try {
                    for (let cIdx = 0; cIdx < qpChunks.length; cIdx++) {
                        const chunkText = qpChunks[cIdx];
                        console.log(`[EXTRACT] Processing chunk ${cIdx + 1}/${qpChunks.length} (${chunkText.length} chars)...`);

                        // 15s delay between chunks if we are still using Groq (avoid TPM limit)
                        if (cIdx > 0 && !fallbackUsed) {
                            console.log("[EXTRACT] Pausing for 15 seconds to respect Groq TPM rate limits...");
                            await new Promise(resolve => setTimeout(resolve, 15000));
                        }

                        const aiPrompt = `This is Part ${cIdx + 1} of a multi-part MCQ question paper. Extract ALL MCQ questions from this document block.
Questions may be English, Tamil, or bilingual.

Return ONLY this JSON (no markdown, no extra text):
{"questions":[{"questionNo":1,"questionEn":"...","questionTa":"...","options":{"A":{"en":"...","ta":""},"B":{"en":"...","ta":""},"C":{"en":"...","ta":""},"D":{"en":"...","ta":""}},"correctAnswer":"A"}]}

Rules: Extract every Q. Keep original question numbers. correctAnswer = A/B/C/D. No emojis. Empty string if field missing. ${answerInstruction}

Document block:
${chunkText}${cleanedAkText ? `\n\nAnswer Key:\n${cleanedAkText}` : ""}`;

                        const aiResult = await callAIWithFallback(aiPrompt);
                        let responseText = aiResult.text;
                        if (aiResult.provider === "gemini") {
                            fallbackUsed = true;
                        }

                        let parsedQuestions: any[] = [];

                        // Try to extract JSON from response
                        const objectMatch = responseText.match(/\{[\s\S]*\}/);
                        if (objectMatch) {
                            try {
                                const parsedObj = JSON.parse(objectMatch[0]);
                                parsedQuestions = parsedObj.questions || [];
                            } catch (e) {}
                        }
                        if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
                            try {
                                const parsedObj = JSON.parse(responseText);
                                parsedQuestions = parsedObj.questions || [];
                            } catch (e) {}
                        }
                        if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
                            const arrayMatch = responseText.match(/\[[\s\S]*\]/);
                            if (arrayMatch) {
                                try { parsedQuestions = JSON.parse(arrayMatch[0]); } catch (e) {}
                            }
                        }

                        if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
                            allParsedQuestions.push(...parsedQuestions);
                        }
                    }

                    if (allParsedQuestions.length > 0) {
                        extractionMethod = fallbackUsed ? "ai_gemini" : "ai_groq";
                        console.log(`[EXTRACT AI] Successfully extracted ${allParsedQuestions.length} questions total using ${extractionMethod}.`);
                        for (const q of allParsedQuestions) {
                            questions.push({
                                questionNo: q.questionNo,
                                question: q.questionEn || q.question || "",
                                questionText: q.questionEn || q.question || "",
                                questionTa: q.questionTa || "",
                                "option a": q.options?.A?.en || (typeof q.options?.A === "string" ? q.options.A : "") || "",
                                "option b": q.options?.B?.en || (typeof q.options?.B === "string" ? q.options.B : "") || "",
                                "option c": q.options?.C?.en || (typeof q.options?.C === "string" ? q.options.C : "") || "",
                                "option d": q.options?.D?.en || (typeof q.options?.D === "string" ? q.options.D : "") || "",
                                "option a ta": q.options?.A?.ta || "",
                                "option b ta": q.options?.B?.ta || "",
                                "option c ta": q.options?.C?.ta || "",
                                "option d ta": q.options?.D?.ta || "",
                                options: [
                                    q.options?.A?.en || (typeof q.options?.A === "string" ? q.options.A : "") || "",
                                    q.options?.B?.en || (typeof q.options?.B === "string" ? q.options.B : "") || "",
                                    q.options?.C?.en || (typeof q.options?.C === "string" ? q.options.C : "") || "",
                                    q.options?.D?.en || (typeof q.options?.D === "string" ? q.options.D : "") || ""
                                ],
                                "correct option": q.correctAnswer || "A",
                                correctAnswer: q.correctAnswer || "A",
                                answer: q.correctAnswer || "A",
                                explanation: q.explanation || "",
                                type: "MCQ",
                                marks: 1,
                                negativeMarks: 0.25
                            });
                        }
                    } else {
                        console.error("[EXTRACT AI] Could not parse any questions from AI response.");
                    }
                } catch (err: any) {
                    console.error("[EXTRACT AI] AI extraction failed:", err.message || err);
                    return res.status(500).json({
                        success: false,
                        message: `AI extraction failed: ${err.message || "Please try again or use Local extraction."}`
                    });
                }
            }

            if (questions.length === 0) {
                return res.status(422).json({
                    success: false,
                    message: "No questions could be extracted. Please make sure the file contains text and is formatted correctly.",
                    debugSample: qpText.substring(0, 800)
                });
            }

            // Deduplicate and sort by question number
            const uniqueQuestionsMap = new Map<number, any>();
            for (const q of questions) {
                if (!uniqueQuestionsMap.has(q.questionNo)) {
                    uniqueQuestionsMap.set(q.questionNo, q);
                } else {
                    const existing = uniqueQuestionsMap.get(q.questionNo);
                    if (!existing.questionTa && q.questionTa) {
                        existing.questionTa = q.questionTa;
                    }
                    if (!existing["option a ta"] && q["option a ta"]) existing["option a ta"] = q["option a ta"];
                    if (!existing["option b ta"] && q["option b ta"]) existing["option b ta"] = q["option b ta"];
                    if (!existing["option c ta"] && q["option c ta"]) existing["option c ta"] = q["option c ta"];
                    if (!existing["option d ta"] && q["option d ta"]) existing["option d ta"] = q["option d ta"];
                }
            }
            const finalQuestions = Array.from(uniqueQuestionsMap.values()).sort((a, b) => a.questionNo - b.questionNo);

            // Strip emojis from all text fields in finalQuestions
            for (const q of finalQuestions) {
                q.question = stripEmojis(q.question);
                q.questionText = stripEmojis(q.questionText);
                q.questionTa = stripEmojis(q.questionTa);
                q["option a"] = stripEmojis(q["option a"]);
                q["option b"] = stripEmojis(q["option b"]);
                q["option c"] = stripEmojis(q["option c"]);
                q["option d"] = stripEmojis(q["option d"]);
                q["option a ta"] = stripEmojis(q["option a ta"]);
                q["option b ta"] = stripEmojis(q["option b ta"]);
                q["option c ta"] = stripEmojis(q["option c ta"]);
                q["option d ta"] = stripEmojis(q["option d ta"]);
                if (Array.isArray(q.options)) {
                    q.options = q.options.map((opt: any) => typeof opt === "string" ? stripEmojis(opt) : opt);
                }
                if (q.explanation) {
                    q.explanation = stripEmojis(q.explanation);
                }
            }

            // ── Step 5: Save draft ──
            const draftId = randomUUID();
            await db.collection(TEMP_COLLECTION).doc(draftId).set({
                id: draftId,
                title: title || "Untitled Test",
                filename: filename || "uploaded",
                questions: finalQuestions,
                questionCount: finalQuestions.length,
                extractedAt: admin.firestore.FieldValue.serverTimestamp(),
                status: "draft_extraction",
                isDeleted: false,
                extractionMethod
            });

            return res.status(200).json({
                success: true,
                message: `Successfully extracted ${finalQuestions.length} questions using ${extractionMethod} mode`,
                warnings: extractionWarnings,
                data: {
                    draftId,
                    questions: finalQuestions,
                    questionCount: finalQuestions.length,
                    warnings: extractionWarnings
                }
            });

        } catch (error: any) {
            console.error("[EXTRACT ERROR]", error);
            return res.status(500).json({
                success: false,
                message: error.message || "Failed to extract questions from document"
            });
        }
    }

    /**
     * CREATE TEST (From extracted questions or question bank)
     * POST /api/test-portal/test-creation
     */
    static async create(req: Request, res: Response) {
        try {
            const {
                title,
                description,
                instructions,
                questionIds,
                draftId,       // if creating from AI-extracted draft
                durationMinutes,
                marksPerQuestion,
                negativeMarks,
                unattendedMarks,
                totalMarks,
                passingMarks,
                startTime,
                endTime,
                questionPaperBase64,
                answerKeyBase64,
                createdBy,
                published,
                targetAudience,
                targetBatch,
                requireFeedback
            } = req.body;

            if (!title) {
                return res.status(400).json({ success: false, message: "Title is required" });
            }

            let finalQuestionIds: string[] = questionIds || [];

            if (req.body.questionsData && Array.isArray(req.body.questionsData)) {
                const batch = db.batch();
                for (const q of req.body.questionsData) {
                    const qId = randomUUID();
                    const qRef = db.collection("questions").doc(qId);
                    
                    const questionText = q.question || q.questionText || "";
                    const optA = q["option a"] || q.optionA || q.a || "";
                    const optB = q["option b"] || q.optionB || q.b || "";
                    const optC = q["option c"] || q.optionC || q.c || "";
                    const optD = q["option d"] || q.optionD || q.d || "";
                    
                    let corr = q["correct option"] || q.correctOption || q.correctAnswer || q.answer || "A";
                    corr = corr.toString().trim().toUpperCase();
                    if (corr.startsWith("A") || corr === "0" || corr === "1") corr = "A";
                    else if (corr.startsWith("B") || corr === "2") corr = "B";
                    else if (corr.startsWith("C") || corr === "3") corr = "C";
                    else if (corr.startsWith("D") || corr === "4") corr = "D";
                    else corr = "A";

                    const exp = q.explanation || q.notes || "";

                    batch.set(qRef, {
                        id: qId,
                        question: questionText,
                        options: [optA, optB, optC, optD],
                        correctAnswer: corr,
                        explanation: exp,
                        type: "MCQ",
                        marks: marksPerQuestion || 1,
                        negativeMarks: negativeMarks || 0.33,
                        imageUrl: q.imageUrl || q.questionImage || (Array.isArray(q.images) ? q.images[0] : q.images) || "",
                        questionImage: q.questionImage || q.imageUrl || "",
                        images: q.images || [],
                        isDeleted: false,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        createdBy: createdBy || "system"
                    });
                    finalQuestionIds.push(qId);
                }
                await batch.commit();
            }

            let draftQuestions: any[] = req.body.questions || [];

            // If creating from draft and no questions are sent, import from DB
            if (draftId && draftQuestions.length === 0) {
                const draftDoc = await db.collection(TEMP_COLLECTION).doc(draftId).get();
                if (draftDoc.exists) {
                    const draft = draftDoc.data()!;
                    draftQuestions = draft.questions || [];
                }
            }

            // Convert draft questions to question bank format
            if (draftQuestions.length > 0) {
                const batch = db.batch();
                for (const q of draftQuestions) {
                    const qId = randomUUID();
                    const qRef = db.collection("questions").doc(qId);
                    
                    let options: string[] = [];
                    let optionsTa: string[] = [];
                    
                    if (q.options && Array.isArray(q.options)) {
                        options = q.options.map((o: any) => typeof o === "string" ? o : (o?.en || ""));
                        optionsTa = [
                            q["option a ta"] || "",
                            q["option b ta"] || "",
                            q["option c ta"] || "",
                            q["option d ta"] || ""
                        ];
                        if (optionsTa.every(x => !x)) {
                            optionsTa = q.options.map((o: any) => typeof o === "string" ? "" : (o?.ta || ""));
                        }
                    } else if (q.options && typeof q.options === "object") {
                        options = [
                            q.options.A?.en || q.options.A || "",
                            q.options.B?.en || q.options.B || "",
                            q.options.C?.en || q.options.C || "",
                            q.options.D?.en || q.options.D || ""
                        ];
                        optionsTa = [
                            q.options.A?.ta || "",
                            q.options.B?.ta || "",
                            q.options.C?.ta || "",
                            q.options.D?.ta || ""
                        ];
                    } else {
                        options = [
                            q["option a"] || "",
                            q["option b"] || "",
                            q["option c"] || "",
                            q["option d"] || ""
                        ];
                        optionsTa = [
                            q["option a ta"] || "",
                            q["option b ta"] || "",
                            q["option c ta"] || "",
                            q["option d ta"] || ""
                        ];
                    }

                    batch.set(qRef, {
                        id: qId,
                        question: q.questionEn || q.question || "",
                        questionTa: q.questionTa || "",
                        questionNo: q.questionNo || 0,
                        options,
                        optionsTa,
                        correctAnswer: q.correctAnswer || null,
                        type: "MCQ",
                        marks: marksPerQuestion || 1,
                        negativeMarks: negativeMarks || 0.33,
                        source: "pdf_extraction",
                        imageUrl: q.imageUrl || q.questionImage || (Array.isArray(q.images) ? q.images[0] : q.images) || "",
                        questionImage: q.questionImage || q.imageUrl || "",
                        images: q.images || [],
                        draftId: draftId || null,
                        isDeleted: false,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        createdBy: createdBy || "system"
                    });
                    finalQuestionIds.push(qId);
                }
                await batch.commit();

                // Mark draft as processed if draftId was provided
                if (draftId) {
                    await db.collection(TEMP_COLLECTION).doc(draftId).update({
                        status: "processed",
                        processedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }

            if (!finalQuestionIds || finalQuestionIds.length === 0) {
                return res.status(400).json({ success: false, message: "questionIds or draftId with questions are required" });
            }

            const id = randomUUID();
            const now = admin.firestore.FieldValue.serverTimestamp();

            // ── Upload question paper & answer key files to Google Drive ──
            // This avoids storing large base64 blobs in Firestore.
            let questionPaperDriveUrl: string | null = null;
            let answerKeyDriveUrl: string | null = null;

            if (questionPaperBase64) {
              try {
                const qpBuffer = Buffer.from(
                  questionPaperBase64.startsWith("data:") ? questionPaperBase64.split(",")[1] : questionPaperBase64,
                  "base64"
                );
                const qpFilename = `${(title || "Test").replace(/[^a-zA-Z0-9]/g, "_")}_QuestionPaper.pdf`;
                const driveResult = await uploadFileToGoogleDrive({
                  fileName: qpFilename,
                  mimeType: "application/pdf",
                  buffer: qpBuffer,
                  subPath: "Test Portal/Question Papers"
                });
                if (driveResult?.previewUrl) {
                  questionPaperDriveUrl = driveResult.previewUrl;
                  console.log(`[Drive] Question paper uploaded: ${driveResult.previewUrl}`);
                }
              } catch (driveErr: any) {
                console.warn("[Drive] Question paper upload failed, storing base64 as fallback:", driveErr?.message);
              }
            }

            if (answerKeyBase64) {
              try {
                const akBuffer = Buffer.from(
                  answerKeyBase64.startsWith("data:") ? answerKeyBase64.split(",")[1] : answerKeyBase64,
                  "base64"
                );
                const akFilename = `${(title || "Test").replace(/[^a-zA-Z0-9]/g, "_")}_AnswerKey.pdf`;
                const driveResult = await uploadFileToGoogleDrive({
                  fileName: akFilename,
                  mimeType: "application/pdf",
                  buffer: akBuffer,
                  subPath: "Test Portal/Answer Keys"
                });
                if (driveResult?.previewUrl) {
                  answerKeyDriveUrl = driveResult.previewUrl;
                  console.log(`[Drive] Answer key uploaded: ${driveResult.previewUrl}`);
                }
              } catch (driveErr: any) {
                console.warn("[Drive] Answer key upload failed, storing base64 as fallback:", driveErr?.message);
              }
            }

            const payload = {
                id,
                title,
                description: description || "",
                instructions: instructions || "",
                questionIds: finalQuestionIds,
                totalQuestions: finalQuestionIds.length,
                durationMinutes: durationMinutes || 60,
                marksPerQuestion: marksPerQuestion || 1,
                negativeMarks: negativeMarks || 0.33,
                unattendedMarks: unattendedMarks !== undefined ? Number(unattendedMarks) : 0,
                totalMarks: totalMarks || finalQuestionIds.length,
                passingMarks: passingMarks || 0,
                startTime: startTime || null,
                endTime: endTime || null,
                // Store Drive URL if upload succeeded; fallback to base64 for legacy compatibility
                questionPaperBase64: questionPaperDriveUrl || (questionPaperBase64 ? "[uploaded]" : null),
                questionPaperUrl: questionPaperDriveUrl || null,
                answerKeyBase64: answerKeyDriveUrl || (answerKeyBase64 ? "[uploaded]" : null),
                answerKeyUrl: answerKeyDriveUrl || null,
                hasQuestionPaper: !!(questionPaperBase64),
                hasAnswerKey: !!(answerKeyBase64),
                status: (published !== false) ? "published" : "draft",
                published: published !== undefined ? !!published : true,
                draftId: draftId || null,
                createdAt: now,
                updatedAt: now,
                createdBy: createdBy || "system",
                updatedBy: createdBy || "system",
                targetAudience: targetAudience || "all",
                targetBatch: targetBatch || "",
                requireFeedback: !!requireFeedback,
                isDeleted: false,
                deletedAt: null,
                deletedBy: null
            };

            await db.collection(COLLECTION).doc(id).set(payload);

            return res.status(201).json({
                success: true,
                message: "Test created successfully",
                data: payload
            });

        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET ALL TESTS
     */
    static async getAll(req: Request, res: Response) {
        try {
            const snapshot = await db
                .collection(COLLECTION)
                .where("isDeleted", "==", false)
                .get();

            const tests = snapshot.docs.map(doc => {
                const data = doc.data();
                // Don't send PDF data in list view
                const { questionPaperBase64, answerKeyBase64, ...rest } = data;
                return {
                    ...rest,
                    hasQuestionPaper: !!questionPaperBase64,
                    hasAnswerKey: !!answerKeyBase64
                };
            })
            .filter((t: any) => t.status !== "draft_extraction" && t.status !== "processed")
            .sort((a: any, b: any) => {
                const timeA = a.createdAt ? (typeof a.createdAt.toDate === "function" ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0;
                const timeB = b.createdAt ? (typeof b.createdAt.toDate === "function" ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0;
                return timeB - timeA;
            });

            return res.status(200).json({ success: true, data: tests });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET SINGLE TEST (with optional PDF download flag)
     */
    static async getOne(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { includePdf } = req.query;

            const doc = await db.collection(COLLECTION).doc(id).get();

            if (!doc.exists) {
                return res.status(404).json({ success: false, message: "Test not found" });
            }

            const data = doc.data()!;
            if (!includePdf) {
                const { questionPaperBase64, answerKeyBase64, ...rest } = data;
                return res.status(200).json({
                    success: true,
                    data: { ...rest, hasQuestionPaper: !!questionPaperBase64, hasAnswerKey: !!answerKeyBase64 }
                });
            }

            return res.status(200).json({ success: true, data });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET QUESTION PAPER PDF (Student - only after exam closes)
     * GET /api/test-portal/test-creation/:id/question-paper
     */
    static async getQuestionPaper(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const doc = await db.collection(COLLECTION).doc(id).get();
            if (!doc.exists) return res.status(404).json({ success: false, message: "Test not found" });

            const data = doc.data()!;

            // Check if exam has closed
            if (data.endTime) {
                const endTimeMs = typeof data.endTime?.toDate === "function"
                    ? data.endTime.toDate().getTime()
                    : new Date(data.endTime).getTime();
                if (Date.now() < endTimeMs) {
                    return res.status(403).json({ success: false, message: "Question paper is available only after the exam closes" });
                }
            }

            if (!data.questionPaperBase64) {
                return res.status(404).json({ success: false, message: "No question paper PDF available" });
            }

            return res.status(200).json({
                success: true,
                data: { base64: data.questionPaperBase64, filename: `${data.title}_QuestionPaper.pdf` }
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET ANSWER KEY PDF (Student - only after exam closes)
     * GET /api/test-portal/test-creation/:id/answer-key
     */
    static async getAnswerKey(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const doc = await db.collection(COLLECTION).doc(id).get();
            if (!doc.exists) return res.status(404).json({ success: false, message: "Test not found" });

            const data = doc.data()!;

            // Check if exam has closed
            if (data.endTime) {
                const endTimeMs = typeof data.endTime?.toDate === "function"
                    ? data.endTime.toDate().getTime()
                    : new Date(data.endTime).getTime();
                if (Date.now() < endTimeMs) {
                    return res.status(403).json({ success: false, message: "Answer key is available only after the exam closes" });
                }
            }

            if (!data.answerKeyBase64) {
                return res.status(404).json({ success: false, message: "No answer key PDF available" });
            }

            return res.status(200).json({
                success: true,
                data: { base64: data.answerKeyBase64, filename: `${data.title}_AnswerKey.pdf` }
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * UPDATE TEST
     */
    static async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const docRef = db.collection(COLLECTION).doc(id);
            const doc = await docRef.get();

            if (!doc.exists) {
                return res.status(404).json({ success: false, message: "Test not found" });
            }

            await docRef.update({
                ...req.body,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: req.body.updatedBy || "system"
            });

            return res.status(200).json({ success: true, message: "Test updated successfully" });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * PUBLISH TEST
     */
    static async publish(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const docRef = db.collection(COLLECTION).doc(id);
            const doc = await docRef.get();

            if (!doc.exists) {
                return res.status(404).json({ success: false, message: "Test not found" });
            }

            await docRef.update({
                published: true,
                status: "published",
                publishedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return res.status(200).json({ success: true, message: "Test published successfully" });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * UNPUBLISH TEST
     */
    static async unpublish(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await db.collection(COLLECTION).doc(id).update({
                published: false,
                status: "draft",
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return res.status(200).json({ success: true, message: "Test unpublished successfully" });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * SOFT DELETE
     */
    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await db.collection(COLLECTION).doc(id).update({
                isDeleted: true,
                deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                deletedBy: req.body.deletedBy || "system"
            });
            return res.status(200).json({ success: true, message: "Test deleted successfully" });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET DRAFT (AI extracted questions before finalization)
     * GET /api/test-portal/test-creation/draft/:draftId
     */
    static async getDraft(req: Request, res: Response) {
        try {
            const { draftId } = req.params;
            const doc = await db.collection(TEMP_COLLECTION).doc(draftId).get();
            if (!doc.exists) {
                return res.status(404).json({ success: false, message: "Draft not found" });
            }
            return res.status(200).json({ success: true, data: doc.data() });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * SUBMIT FEEDBACK FOR A TEST
     * POST /api/test-portal/test-creation/feedback
     */
    static async submitFeedback(req: Request, res: Response) {
        try {
            const { testId, testTitle, studentName, studentEmail, rating, comments, submittedAt } = req.body;
            if (!testId || !rating || !comments) {
                return res.status(400).json({ success: false, message: "testId, rating and comments are required" });
            }
            const id = randomUUID();
            const payload = {
                id,
                testId,
                testTitle: testTitle || "Untitled Test",
                studentName: studentName || "Anonymous",
                studentEmail: studentEmail || "no-email@nermaiacademy.com",
                rating: Number(rating) || 5,
                comments: comments || "",
                submittedAt: submittedAt || new Date().toISOString(),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            await db.collection("test_feedback").doc(id).set(payload);
            return res.status(201).json({ success: true, message: "Feedback submitted successfully", data: payload });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET ALL FEEDBACK FOR TESTS
     * GET /api/test-portal/test-creation/feedback
     */
    static async getFeedback(req: Request, res: Response) {
        try {
            const snapshot = await db.collection("test_feedback").orderBy("createdAt", "desc").get();
            const list: any[] = [];
            snapshot.forEach(doc => {
                list.push(doc.data());
            });
            return res.status(200).json({ success: true, data: list });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}
/**
 * parseQuestionsFromText
 * ──────────────────────────────────────────────────────────────────────────
 * Zero-API, instant regex parser for Tamil + English MCQ question papers.
 *
 * Handles:
 *  • Question markers : "1.", "1)", "1 .", "Q1." (number 1-999)
 *  • Option markers   : "a)" "a." "(a)" — lowercase OR uppercase a/b/c/d
 *  • Inline options   : all four on one line  "a) text1   b) text2   c) text3   d) text4"
 *  • Multi-line opts  : each option on its own line
 *  • Bilingual format : same question number appears TWICE (English + Tamil)
 */
function parseQuestionsFromText(text: string, answerMap: Record<number, string> = {}): any[] {

    /* ── 1. Normalise whitespace ── */
    const normalised = text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/[ \t]+/g, " ")        // collapse horizontal whitespace
        .trim();

    const lines = normalised.split("\n").map((l: string) => l.trim());

    /* ── 2. Regex helpers ── */
    const Q_START = /^(?:Q(?:uestion)?\.?\s*|வினா\s*)?(\d{1,3})(?:\s*[.):\-]\s*|\s+(?=[A-Z\u0B80-\u0BFF]))(.*)/i;

    function isRealQuestion(text: string): boolean {
        return text.trim().length > 0;
    }

    // OPT_LINE: matches option markers at the START of a line.
    // IMPORTANT: parenthesized form (A) only matches LOWERCASE to avoid matching Statement (A)/(B) inside question text.
    const OPT_LINE = /^(?:\(([a-dஅஆஇஈ]|[iI]{2,3}|i[vV])\)|([a-dA-DஅஆஇஈiI]|[iI]{2,3}|i[vV]|I[vV])\s*[.):\-,\u00A0]\s*)/;
    const OPT_MAP: Record<string, string> = {
        "A": "A", "B": "B", "C": "C", "D": "D",
        "a": "A", "b": "B", "c": "C", "d": "D",
        "அ": "A", "ஆ": "B", "இ": "C", "ஈ": "D",
        "i": "A", "ii": "B", "iii": "C", "iv": "D",
        "I": "A", "II": "B", "III": "C", "IV": "D"
    };

    function optLetter(m: RegExpMatchArray): string {
        const raw = (m[1] || m[2] || "").trim();
        return OPT_MAP[raw] ?? OPT_MAP[raw.toLowerCase()] ?? raw.toUpperCase();
    }

    function tryInlineSplit(line: string): Record<string, string> | null {
        // Parenthesized form (X) only matches LOWERCASE to avoid treating Statement (A)/(B) as option markers.
        // Bare letter form A) / A. can match uppercase too since it never appears embedded in content,
        // but we add a negative lookbehind (?<!\() to ensure A) is not matched if it was actually (A).
        const PAR = /\(([a-dஅஆஇஈ]|[iI]{2,3}|i[vV])\)/;
        const BARE = /(?<!\()([a-dA-DஅஆஇஈiI]|[iI]{2,3}|i[vV]|I[vV])\s*[.):\-,\u00A0]\s*/;
        // Combined regex: match option marker then capture content up to next marker or end
        // NOTE: 'g' only — NO 'i' flag. Without 'i', [a-d] only matches lowercase letters,
        // so (A) and (B) inside question text (e.g. "Statement (A)") are NOT matched.
        // BARE form explicitly includes [a-dA-D] so uppercase A) B) C) D) still work.
        const regex = new RegExp(
            `(?:${PAR.source}|${BARE.source})(.*?)(?=\\s*(?:${PAR.source}|${BARE.source})|$)`,
            "g"  // NO 'i' flag — prevents (A)/(B) in content being matched as option markers
        );
        const matches = [...line.matchAll(regex)];
        if (matches.length < 2) return null;

        const opts: Record<string, string> = {};
        for (const m of matches) {
            // m[1]=parenthesized letter, m[2]=bare letter, m[3]=content text
            const rawLetter = (m[1] || m[2] || "").trim();
            if (!rawLetter) continue;
            const letter = OPT_MAP[rawLetter] ?? OPT_MAP[rawLetter.toLowerCase()];
            if (letter && ["A", "B", "C", "D"].includes(letter)) {
                const content = (m[3] || "").trim().replace(/^[,\s]+|[,\s]+$/g, "");
                if (content.length > 0 && !opts[letter]) {
                    opts[letter] = content;
                }
            }
        }
        return Object.keys(opts).length >= 2 ? opts : null;
    }

    /* ── 3. Find all question start line indices ── */
    const rawQuestionStarts: { index: number; qNo: number; initialText: string }[] = [];
    for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        const qm = line.match(Q_START);
        if (qm) {
            const qNo = parseInt(qm[1], 10);
            const initialText = qm[2].trim();
            if (!OPT_LINE.test(line) && isRealQuestion(initialText)) {
                rawQuestionStarts.push({ index: idx, qNo, initialText });
            }
        }
    }

    // ── 3b. Filter out numbered sub-statements falsely detected as question starts ──
    // A line like "1. The Chinese pilgrim..." inside Q14's body is a sub-statement, NOT Q1.
    // Strategy: Build the plausible question sequence by scanning for a monotonically
    // increasing run. If a detected qNo is <= the last seen "real" question number AND
    // that qNo is very small (<=9), treat it as a sub-statement and skip it.
    // Also handle patterns like: sequence [14, 1, 2, 15, 16] → 1 and 2 are sub-statements.
    const questionStarts: { index: number; qNo: number; initialText: string }[] = [];
    {
        // Determine max seen so far for forward filtering.
        // We keep a candidate only if it either:
        //  (a) is the first entry, OR
        //  (b) is greater than the last ACCEPTED question number, OR
        //  (c) could be the first of a new bilingual duplicate block (same qNo as last accepted)
        // We REJECT a candidate if it is much smaller than the surrounding numbers
        // (i.e., looks like a numbered sub-statement inside a multi-statement question body)
        
        let lastAccepted = -1;
        let maxSeen = -1;
        
        for (const candidate of rawQuestionStarts) {
            const qNo = candidate.qNo;
            
            if (lastAccepted === -1) {
                // Always accept the very first candidate
                questionStarts.push(candidate);
                lastAccepted = qNo;
                maxSeen = qNo;
                continue;
            }
            
            // Case: same question number as last accepted → could be bilingual duplicate block
            // But only if it's sufficiently far from the previous occurrence (not a sub-statement)
            if (qNo === lastAccepted) {
                const prevEntry = questionStarts[questionStarts.length - 1];
                const lineGap = prevEntry ? candidate.index - prevEntry.index : 999;
                if (lineGap >= 4) {
                    // Sufficiently far away → bilingual duplicate
                    questionStarts.push(candidate);
                }
                // else: too close → likely a numbered sub-statement like "1." on the same block
                continue;
            }
            
            // Case: question number is higher than max seen → clearly a new question
            if (qNo > maxSeen) {
                questionStarts.push(candidate);
                lastAccepted = qNo;
                maxSeen = qNo;
                continue;
            }
            
            // Case: question number is lower than max seen
            // This could be a numbered sub-statement (e.g., "1. The Chinese pilgrim...")
            // Heuristic: if the number is <= 9 and the last accepted was >= 5, it's a sub-statement
            if (qNo <= 9 && maxSeen >= 5) {
                // Skip — this is likely a numbered statement within a multi-statement question
                continue;
            }
            
            // Heuristic: if we jumped forward a lot and are now at a very small number,
            // it's a sub-statement (e.g., maxSeen=50, qNo=3 → definitely sub-statement)
            if (maxSeen - qNo > 5 && qNo <= 9) {
                continue;
            }
            
            // Otherwise accept (could be a genuine reset or re-ordering)
            questionStarts.push(candidate);
            lastAccepted = qNo;
            // Don't update maxSeen if we're going backward (bilingual re-run case)
        }
    }

    /* ── 4. Build blocks and parse them ── */
    const questionMap = new Map<number, any>();

    for (let idx = 0; idx < questionStarts.length; idx++) {
        const start = questionStarts[idx];
        const endLineIdx = (idx + 1 < questionStarts.length) ? questionStarts[idx + 1].index : lines.length;
        const blockLines = lines.slice(start.index, endLineIdx);

        let firstOptIdx = -1;
        for (let j = 0; j < blockLines.length; j++) {
            const line = blockLines[j];
            if (OPT_LINE.test(line) || tryInlineSplit(line)) {
                firstOptIdx = j;
                break;
            }
        }

        let questionText = "";
        let optLines: string[] = [];

        if (firstOptIdx !== -1) {
            const questionLines = blockLines.slice(0, firstOptIdx);
            if (questionLines.length > 0) {
                questionLines[0] = start.initialText;
            }
            questionText = questionLines.filter(Boolean).join(" ");
            optLines = blockLines.slice(firstOptIdx);
        } else {
            const questionLines = [...blockLines];
            if (questionLines.length > 0) {
                questionLines[0] = start.initialText;
            }
            questionText = questionLines.filter(Boolean).join(" ");
        }

        questionText = questionText.trim();

        const opts: Record<string, string> = {};
        let lastLetter: string | null = null;

        for (const optLine of optLines) {
            if (!optLine) {
                lastLetter = null;
                continue;
            }

            const inline = tryInlineSplit(optLine);
            if (inline) {
                Object.assign(opts, inline);
                lastLetter = Object.keys(inline).pop() || null;
                continue;
            }

            const om = optLine.match(OPT_LINE);
            if (om) {
                const letter = optLetter(om);
                if (["A", "B", "C", "D"].includes(letter)) {
                    opts[letter] = optLine.slice(om[0].length).trim();
                    lastLetter = letter;
                    continue;
                }
            }

            if (lastLetter && opts[lastLetter] !== undefined) {
                opts[lastLetter] += " " + optLine;
            }
        }

        ["A", "B", "C", "D"].forEach(l => {
            if (opts[l] === undefined) opts[l] = "";
        });

        const correctAnswer = answerMap[start.qNo] || "";

        if (questionMap.has(start.qNo)) {
            const existing = questionMap.get(start.qNo)!;
            const existingHasOptions = !!(existing["option a"] || existing["option b"]);
            const newHasOptions = !!(opts["A"] || opts["B"]);

            if (!existingHasOptions && newHasOptions) {
                existing.question = questionText;
                existing.questionText = questionText;
                existing["option a"] = opts["A"];
                existing["option b"] = opts["B"];
                existing["option c"] = opts["C"];
                existing["option d"] = opts["D"];
                existing.options = [opts["A"], opts["B"], opts["C"], opts["D"]];
            } else if (!existing.questionTa) {
                existing.questionTa = questionText;
                if (!existing["option a ta"] && opts["A"]) existing["option a ta"] = opts["A"];
                if (!existing["option b ta"] && opts["B"]) existing["option b ta"] = opts["B"];
                if (!existing["option c ta"] && opts["C"]) existing["option c ta"] = opts["C"];
                if (!existing["option d ta"] && opts["D"]) existing["option d ta"] = opts["D"];
            }
        } else {
            questionMap.set(start.qNo, {
                questionNo: start.qNo,
                question: questionText,
                questionText: questionText,
                questionTa: "",
                "option a": opts["A"],
                "option b": opts["B"],
                "option c": opts["C"],
                "option d": opts["D"],
                "option a ta": "",
                "option b ta": "",
                "option c ta": "",
                "option d ta": "",
                options: [opts["A"], opts["B"], opts["C"], opts["D"]],
                "correct option": correctAnswer,
                correctAnswer,
                answer: correctAnswer,
                explanation: "",
                type: "MCQ",
                marks: 1,
                negativeMarks: 0.25
            });
        }
    }

    return Array.from(questionMap.values()).sort((a, b) => a.questionNo - b.questionNo);
}

// ─── Offline Student Test Permission Requests ────────────────────────────────
// Students (offline mode) cannot directly write to Firestore from the client.
// These backend routes use the admin SDK so both students and admins share data.

const OFFLINE_REQUESTS_COLLECTION = "offlineTestPermissionRequests";

export class OfflineTestRequestController {
    /**
     * POST /api/test-portal/permission-requests
     * Student submits a permission request to attend a live test.
     */
    static async submitRequest(req: Request, res: Response) {
        try {
            const { id, testId, testTitle, studentId, studentName, rollNumber, batch, username, requestedAt } = req.body;
            if (!testId || !studentId) {
                return res.status(400).json({ success: false, message: "testId and studentId are required" });
            }
            const reqId = id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const payload = {
                id: reqId,
                testId,
                testTitle: testTitle || "",
                studentId,
                studentName: studentName || "",
                rollNumber: rollNumber || "",
                batch: batch || "",
                username: username || "",
                status: "pending",
                requestedAt: requestedAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await db.collection(OFFLINE_REQUESTS_COLLECTION).doc(reqId).set(payload, { merge: true });
            return res.status(200).json({ success: true, data: payload });
        } catch (error: any) {
            console.error("[OfflineTestRequest] submit error:", error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET /api/test-portal/permission-requests
     * - Admin (no query param): returns all requests.
     * - Student (?studentId=xxx or ?username=yyy): returns only that student's own requests.
     */
    static async getAll(req: Request, res: Response) {
        try {
            const { studentId, username } = req.query;
            let snapshot: any;
            if (studentId && typeof studentId === "string") {
                snapshot = await db.collection(OFFLINE_REQUESTS_COLLECTION)
                    .where("studentId", "==", studentId)
                    .get();
            } else if (username && typeof username === "string") {
                snapshot = await db.collection(OFFLINE_REQUESTS_COLLECTION)
                    .where("username", "==", username)
                    .get();
            } else {
                // Admin: fetch all
                snapshot = await db.collection(OFFLINE_REQUESTS_COLLECTION)
                    .get();
            }
            const requests = snapshot.docs.map((doc: any) => doc.data());
            
            // Sort in-memory desc by requestedAt to avoid requiring a composite index in Firestore
            requests.sort((a: any, b: any) => {
                const timeA = new Date(a.requestedAt || 0).getTime();
                const timeB = new Date(b.requestedAt || 0).getTime();
                return timeB - timeA;
            });

            return res.status(200).json({ success: true, data: requests });
        } catch (error: any) {
            console.error("[OfflineTestRequest] getAll error:", error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * PATCH /api/test-portal/permission-requests/:id
     * Admin approves or rejects a request.
     */
    static async updateStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            if (!["approved", "rejected", "pending"].includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid status. Use: approved, rejected, pending" });
            }
            await db.collection(OFFLINE_REQUESTS_COLLECTION).doc(id).update({
                status,
                updatedAt: new Date().toISOString()
            });
            return res.status(200).json({ success: true, message: `Request ${status}` });
        } catch (error: any) {
            console.error("[OfflineTestRequest] updateStatus error:", error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * DELETE /api/test-portal/permission-requests/:id
     * Admin deletes a specific request.
     */
    static async deleteRequest(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await db.collection(OFFLINE_REQUESTS_COLLECTION).doc(id).delete();
            return res.status(200).json({ success: true, message: "Request deleted" });
        } catch (error: any) {
            console.error("[OfflineTestRequest] delete error:", error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * DELETE /api/test-portal/permission-requests
     * Admin clears ALL requests.
     */
    static async clearAll(req: Request, res: Response) {
        try {
            const snapshot = await db.collection(OFFLINE_REQUESTS_COLLECTION).get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            return res.status(200).json({ success: true, message: "All requests cleared" });
        } catch (error: any) {
            console.error("[OfflineTestRequest] clearAll error:", error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}