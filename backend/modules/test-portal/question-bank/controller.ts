import { Request, Response } from "express";
import admin from "firebase-admin";
import { randomUUID } from "crypto";

const db = admin.firestore();

const COLLECTION = "questions";

/*
Question Structure

{
    id,
    question,
    options,
    answer,
    explanation,
    language,
    type,
    sourcePdf,
    createdAt,
    updatedAt,
    createdBy,
    updatedBy,
    isDeleted,
    deletedAt,
    deletedBy
}
*/

export class QuestionBankController {

    /**
     * GET ALL QUESTIONS
     */
    static async getAll(req: Request, res: Response) {
        try {

            const snapshot = await db
                .collection(COLLECTION)
                .where("isDeleted", "==", false)
                .orderBy("createdAt", "desc")
                .limit(300)
                .get();

            const questions = snapshot.docs.map(doc => doc.data());

            return res.status(200).json({
                success: true,
                message: "Questions fetched successfully",
                data: questions
            });

        } catch (error: any) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }
    }

    /**
     * GET SINGLE QUESTION
     */
    static async getOne(req: Request, res: Response) {

        try {

            const { id } = req.params;

            const doc = await db.collection(COLLECTION).doc(id).get();

            if (!doc.exists) {

                return res.status(404).json({
                    success: false,
                    message: "Question not found"
                });

            }

            return res.status(200).json({
                success: true,
                data: doc.data()
            });

        } catch (error: any) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }

    /**
     * CREATE QUESTION
     */
    static async create(req: Request, res: Response) {

        try {

            const {
                question,
                options,
                answer,
                explanation,
                language,
                type,
                sourcePdf,
                createdBy,
                imageUrl,
                questionImage,
                images
            } = req.body;

            if (!question)
                return res.status(400).json({
                    success: false,
                    message: "Question is required"
                });

            if (!options || !Array.isArray(options))
                return res.status(400).json({
                    success: false,
                    message: "Options array required"
                });

            if (!answer)
                return res.status(400).json({
                    success: false,
                    message: "Answer required"
                });

            const id = randomUUID();

            const payload = {

                id,

                question,

                options,

                answer,

                explanation: explanation || "",

                language: language || "en",

                type: type || "MCQ",

                sourcePdf: sourcePdf || "",

                imageUrl: imageUrl || "",

                questionImage: questionImage || "",

                images: images || [],

                createdAt: admin.firestore.FieldValue.serverTimestamp(),

                updatedAt: admin.firestore.FieldValue.serverTimestamp(),

                createdBy: createdBy || "system",

                updatedBy: createdBy || "system",

                isDeleted: false,

                deletedAt: null,

                deletedBy: null

            };

            await db.collection(COLLECTION).doc(id).set(payload);

            return res.status(201).json({
                success: true,
                message: "Question created successfully",
                data: payload
            });

        } catch (error: any) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }

    /**
     * UPDATE QUESTION
     */
    static async update(req: Request, res: Response) {

        try {

            const { id } = req.params;

            const docRef = db.collection(COLLECTION).doc(id);

            const doc = await docRef.get();

            if (!doc.exists) {

                return res.status(404).json({
                    success: false,
                    message: "Question not found"
                });

            }

            const updateData = {

                ...req.body,

                updatedAt: admin.firestore.FieldValue.serverTimestamp(),

                updatedBy: req.body.updatedBy || "system"

            };

            await docRef.update(updateData);

            return res.status(200).json({
                success: true,
                message: "Question updated successfully"
            });

        } catch (error: any) {

            return res.status(500).json({
                success: false,
                message: error.message
            });

        }

    }

    /**
     * SOFT DELETE
     */
    static async delete(req: Request, res: Response) {

        try {

            const { id } = req.params;

            const docRef = db.collection(COLLECTION).doc(id);

            const doc = await docRef.get();

            if (!doc.exists) {

                return res.status(404).json({
                    success: false,
                    message: "Question not found"
                });

            }

            await docRef.update({

                isDeleted: true,

                deletedAt: admin.firestore.FieldValue.serverTimestamp(),

                deletedBy: req.body.deletedBy || "system"

            });

            return res.status(200).json({

                success: true,

                message: "Question deleted successfully"

            });

        } catch (error: any) {

            return res.status(500).json({

                success: false,

                message: error.message

            });

        }

    }

    /**
     * SEARCH QUESTIONS
     */
    static async search(req: Request, res: Response) {

        try {

            const keyword = String(req.query.keyword || "").toLowerCase();

            const snapshot = await db
                .collection(COLLECTION)
                .where("isDeleted", "==", false)
                .get();

            const data = snapshot.docs
                .map(doc => doc.data())
                .filter((q: any) =>
                    q.question.toLowerCase().includes(keyword)
                );

            return res.status(200).json({

                success: true,

                data

            });

        } catch (error: any) {

            return res.status(500).json({

                success: false,

                message: error.message

            });

        }

    }

}