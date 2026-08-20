import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Request, Response } from "express";

import { db } from "../infrastructure/firebase";
import { AnnouncementController } from "../modules/announcement/controller";

async function run() {
  console.log("=== NOTICE EXPIRY FILTER INTEGRATION TEST ===");

  const activeNoticeId = "test-notice-active-id";
  const expiredNoticeId = "test-notice-expired-id";

  try {
    const now = Date.now();
    const activeExpiry = new Date(now + 2 * 60 * 60 * 1000).toISOString(); // expires in 2 hours
    const expiredExpiry = new Date(now - 10 * 60 * 1000).toISOString(); // expired 10 minutes ago

    console.log("Setting up mock announcements...");
    await db.collection("announcements").doc(activeNoticeId).set({
      id: activeNoticeId,
      title: "Active Notice",
      content: "This notice is active.",
      priority: "normal",
      targetDashboard: "all",
      expiresAt: activeExpiry,
      timerOption: "24h",
      isDeleted: false,
      createdAt: new Date().toISOString()
    });

    await db.collection("announcements").doc(expiredNoticeId).set({
      id: expiredNoticeId,
      title: "Expired Notice",
      content: "This notice should be filtered out for students.",
      priority: "normal",
      targetDashboard: "all",
      expiresAt: expiredExpiry,
      timerOption: "24h",
      isDeleted: false,
      createdAt: new Date().toISOString()
    });

    // 1. Mock Request for Student
    console.log("\nTesting getAll as a STUDENT...");
    let returnedData: any[] = [];
    const mockReqStudent = {
      query: { role: "student" }
    } as unknown as Request;

    const mockResStudent = {
      status: (code: number) => {
        return {
          json: (body: any) => {
            returnedData = body.data || [];
          }
        };
      }
    } as unknown as Response;

    await AnnouncementController.getAll(mockReqStudent, mockResStudent);

    const hasActive = returnedData.some(a => a.id === activeNoticeId);
    const hasExpired = returnedData.some(a => a.id === expiredNoticeId);

    console.log("Student notices returned:", returnedData.map(a => a.title));
    if (!hasActive) {
      throw new Error("FAIL: Active notice not returned to student!");
    }
    if (hasExpired) {
      throw new Error("FAIL: Expired notice was returned to student!");
    }
    console.log("✅ Student filter passed (expired notice hidden).");

    // 2. Mock Request for Admin
    console.log("\nTesting getAll as an ADMIN...");
    let returnedAdminData: any[] = [];
    const mockReqAdmin = {
      query: { role: "admin" }
    } as unknown as Request;

    const mockResAdmin = {
      status: (code: number) => {
        return {
          json: (body: any) => {
            returnedAdminData = body.data || [];
          }
        };
      }
    } as unknown as Response;

    await AnnouncementController.getAll(mockReqAdmin, mockResAdmin);

    const adminHasActive = returnedAdminData.some(a => a.id === activeNoticeId);
    const adminHasExpired = returnedAdminData.some(a => a.id === expiredNoticeId);

    console.log("Admin notices returned:", returnedAdminData.map(a => a.title));
    if (!adminHasActive || !adminHasExpired) {
      throw new Error("FAIL: Admin should see both active and expired notices!");
    }
    console.log("✅ Admin filter passed (expired notice visible to admin).");

    console.log("\n🎉 ALL NOTICE TIMER TESTS PASSED SUCCESSFULLY!");

  } catch (error) {
    console.error("❌ TEST FAILED:", error);
  } finally {
    console.log("\nCleaning up test documents...");
    await db.collection("announcements").doc(activeNoticeId).delete();
    await db.collection("announcements").doc(expiredNoticeId).delete();
    console.log("Cleanup completed.");
  }
}

run().catch(console.error);
