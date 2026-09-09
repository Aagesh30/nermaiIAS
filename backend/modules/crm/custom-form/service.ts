import admin from "firebase-admin";

const db = admin.firestore();
const FORMS_COLLECTION = "custom_application_forms";
const DEFAULT_FORM_ID = "mock_test_app";

export interface CustomFieldConfig {
  id: string;
  label: string;
  type: "text" | "number" | "dropdown" | "date" | "textarea" | "checkbox";
  placeholder?: string;
  required: boolean;
  options?: string[]; // For dropdowns
  order: number;
}

export interface CustomFormConfig {
  id: string;
  title: string;
  subtitle: string;
  bannerText?: string;
  isActive: boolean;
  defaultFields: {
    name: { label: string; required: boolean; enabled: boolean };
    phone: { label: string; required: boolean; enabled: boolean };
    email: { label: string; required: boolean; enabled: boolean };
    city: { label: string; required: boolean; enabled: boolean };
    mode: { label: string; required: boolean; enabled: boolean; options: string[] };
  };
  customFields: CustomFieldConfig[];
  updatedAt?: any;
  createdAt?: any;
}

const DEFAULT_CONFIG: CustomFormConfig = {
  id: DEFAULT_FORM_ID,
  title: "Mock Test Application Form",
  subtitle: "Fill in your details below to register for the upcoming Mock Test.",
  bannerText: "Exclusive Mock Test Registration for Aspirants",
  isActive: true,
  defaultFields: {
    name: { label: "Full Name", required: true, enabled: true },
    phone: { label: "Phone Number", required: true, enabled: true },
    email: { label: "Email", required: false, enabled: true },
    city: { label: "City", required: false, enabled: true },
    mode: { label: "Preferred Mode", required: true, enabled: true, options: ["Offline", "Online", "Recorded"] }
  },
  customFields: []
};

// In-memory cache for ultra-fast response
let cachedFormConfig: CustomFormConfig | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export class CustomFormService {
  /**
   * Get active form configuration (Cached for fast public access)
   */
  static async getActiveForm(): Promise<CustomFormConfig> {
    const now = Date.now();
    if (cachedFormConfig && (now - lastCacheTime) < CACHE_TTL_MS) {
      return cachedFormConfig;
    }

    const doc = await db.collection(FORMS_COLLECTION).doc(DEFAULT_FORM_ID).get();
    if (!doc.exists) {
      // Seed default configuration if not exists
      await db.collection(FORMS_COLLECTION).doc(DEFAULT_FORM_ID).set({
        ...DEFAULT_CONFIG,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      cachedFormConfig = DEFAULT_CONFIG;
      lastCacheTime = now;
      return DEFAULT_CONFIG;
    }

    cachedFormConfig = { id: doc.id, ...(doc.data() as any) };
    lastCacheTime = now;
    return cachedFormConfig!;
  }

  /**
   * Get form config by ID (for admin)
   */
  static async getFormById(formId: string = DEFAULT_FORM_ID): Promise<CustomFormConfig> {
    const doc = await db.collection(FORMS_COLLECTION).doc(formId).get();
    if (!doc.exists) {
      return DEFAULT_CONFIG;
    }
    return { id: doc.id, ...(doc.data() as any) };
  }

  /**
   * Update form configuration (Super Admin)
   */
  static async saveForm(config: Partial<CustomFormConfig>): Promise<CustomFormConfig> {
    const formId = config.id || DEFAULT_FORM_ID;
    const toSave: any = {
      ...config,
      id: formId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection(FORMS_COLLECTION).doc(formId).set(toSave, { merge: true });

    // Invalidate cache
    cachedFormConfig = null;
    lastCacheTime = 0;

    return await this.getFormById(formId);
  }
}
