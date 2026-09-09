import admin from "firebase-admin";
import { randomUUID } from "crypto";

const db = admin.firestore();
const CUSTOM_LEADS_COLLECTION = "custom_application_leads";

export interface CustomLeadSubmission {
  id?: string;
  formId?: string;
  formTitle?: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  mode?: string;
  customData?: Record<string, any>;
  status?: "new" | "contacted" | "admitted" | "rejected" | "follow_up";
  notes?: string;
  source?: string;
  createdAt?: any;
  updatedAt?: any;
}

export class CustomLeadsService {
  /**
   * Create a new Custom Application Lead (Guest submission)
   */
  static async submitLead(payload: CustomLeadSubmission) {
    if (!payload.name || !payload.phone) {
      throw new Error("Student Name and Phone Number are required");
    }

    const id = payload.id || randomUUID();
    const now = admin.firestore.FieldValue.serverTimestamp();

    const leadData = {
      id,
      formId: payload.formId || "mock_test_app",
      formTitle: payload.formTitle || "Mock Test Application Form",
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      email: (payload.email || "").trim(),
      city: (payload.city || "").trim(),
      mode: payload.mode || "Offline",
      customData: payload.customData || {},
      status: "new",
      notes: payload.notes || "",
      source: payload.source || "guest_mock_test_application",
      isDeleted: false,
      createdAt: now,
      updatedAt: now
    };

    await db.collection(CUSTOM_LEADS_COLLECTION).doc(id).set(leadData);

    return leadData;
  }

  /**
   * Get all custom application leads with filtering
   */
  static async getLeads(filters: {
    formId?: string;
    status?: string;
    mode?: string;
    search?: string;
    limit?: number;
  }) {
    let query: admin.firestore.Query = db.collection(CUSTOM_LEADS_COLLECTION)
      .where("isDeleted", "==", false);

    if (filters.formId) {
      query = query.where("formId", "==", filters.formId);
    }
    if (filters.status && filters.status !== "all") {
      query = query.where("status", "==", filters.status);
    }
    if (filters.mode && filters.mode !== "all") {
      query = query.where("mode", "==", filters.mode);
    }

    // Limit to recent 500 for fast responsiveness
    query = query.limit(filters.limit || 500);

    const snapshot = await query.get();
    let leads: any[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Client-side search & date sort
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      leads = leads.filter(l =>
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.city && l.city.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    leads.sort((a, b) => {
      const tA = a.createdAt?._seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
      const tB = b.createdAt?._seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
      return tB - tA;
    });

    return leads;
  }

  /**
   * Update lead status or notes
   */
  static async updateLead(id: string, updates: Partial<CustomLeadSubmission>) {
    const docRef = db.collection(CUSTOM_LEADS_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error("Custom lead not found");
    }

    const toUpdate: any = {
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await docRef.update(toUpdate);
    return { ...doc.data(), ...toUpdate, id };
  }

  /**
   * Delete lead (soft delete)
   */
  static async deleteLead(id: string) {
    const docRef = db.collection(CUSTOM_LEADS_COLLECTION).doc(id);
    await docRef.update({
      isDeleted: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { id, isDeleted: true };
  }
}
