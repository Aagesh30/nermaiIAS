# NERMAI IAS ACADEMY - Complete Application Workflow Documentation

This document outlines the detailed system flow, user roles, data models, and features across the Admin, Student, Teacher, and Guest portals in the Nermai IAS Academy application.

---

## 🔑 1. User Roles & Permission Levels

The platform differentiates features and access rights based on the user's logged-in role:

| Role | Target Audience | Primary Dashboards / Access |
| :--- | :--- | :--- |
| **Guest / Public** | Unregistered users & prospective students | Guest Home, Free Resources, Free Test Portal, Per-Course Admission Forms |
| **Student** | Registered, active academy students | Student ERP (Profile, ID Card, Fee Details, Marks, Attendance, Analytics), Student LMS (Daily Content, Live Sessions, Zoom, Recorded Lectures, Practice/Mock Tests) |
| **Teacher** | Faculty members | LMS Course/Topic Management, Attendance entry, Live Class scheduling, Daily Content publishing |
| **Admin / Super Admin** | Directors, CRM Desk, ERP Managers | Full ERP Panel, CRM (Lead & Admission pipelines, Campaigns, Guest Posters), LMS Administration, Test Portal management (AI Question Extraction, Test Publishing, Evaluation) |

---

## 🔄 2. Complete Guest & Admission Workflow

The lifecycle starts when a prospective student visits the academy's portal as a **Guest**.

```
[Guest Visitor] 
      │
      ├─► Browses Free Resources & attempts Free Mock Tests (Requires Google Auth signup)
      │
      └─► Clicks "Apply Now" (Applies to a specific course)
                │
                ▼
      [Admission / Inquiry Submission] (stored in `admissions` collection)
                │
                ▼
     [CRM Lead Management (Admin Dashboard)]
                │
         (Counseling/Call)
                │
                ▼
   [Convert Lead to Student (ERP Registration)] 
```

### A. Guest Portal Actions
1. **Explore Home & Posters**: The visitor views dynamic advertising banners uploaded by the Admin through the CRM Guest Posters panel.
2. **Apply for a Course (Forms)**: The Guest selects one of the 9 offered courses:
   - *Courses*: UPSC Civil Services, TNPSC Group 1/2/4, UDC/LDC/VAO, SSC/PC/SI, Banking/RRB, Puducherry Govt Exams, or Others.
   - *Data Collected*: Full Name, Phone, Email, City, Mode of Study (Offline, Online, Recorded).
   - *Target Endpoint*: `POST /api/crm/admission` (creates a pending entry in the `admissions` collection).

### B. CRM Desk Processing (Admin Panel)
- **Lead Intake**: Admissions appear under **CRM** ➔ **Admissions**.
- **Contacting & Conversion**: The admin calls the candidate, selects their Batch and Mode of study, and clicks **Convert to Student**. This transitions the candidate details directly into the ERP student registration form.

---

## 🎓 3. Student Registration & ERP Setup (Admin Side)

When creating a new student record manually, or converting a lead, the Admin fills out the student profile.

### A. Creating a Student Profile
The registration requires fields split across multiple steps:
1. **Step 1: Account Credentials**
   - Username and Login Password (generated or specified).
2. **Step 2: Course & Batch Allocation**
   - Course Selection, Batch Allocation, and Mode of Class (Offline, Online, Recorded).
   - Total Course Fee & initial Payment Details (Receipt, transaction ID, mode of payment).
3. **Step 3: Personal Details**
   - First Name, Last Name, Email, Phone, Dob, Roll Number, and Admission Number.
   
*Firestore Target*: Saves a document to the `students` collection.

### B. ID Card & Hall Ticket Generation
- Once registered, the system automatically allocates a unique Roll Number.
- The Admin can upload the student's Passport Photo.
- **ID Card**: Viewable by the student in the ERP.
- **Hall Ticket**: Created automatically for examinations, featuring the student's details, exam center instructions, and a signature line.

---

## 🏫 4. Student Portal Workflow (ERP & LMS)

Once logged in, a student sees a tailored, premium dashboard categorized into two main sections: **ERP** and **LMS**.

```
                           [Student Dashboard]
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
               [ ERP ]                             [ LMS ]
       ┌──────────┼──────────┐                ┌───────┼───────┐
       ▼          ▼          ▼                ▼       ▼       ▼
    [Profile]  [Fees]   [Analytics]     [Resources] [Live] [Recorded]
```

### A. Student ERP Dashboard
- **My Profile**: View personal profile details, submit "Profile Update Requests" to Admin if info needs correction.
- **ID Card & Hall Ticket**: Instant preview and "Download as PDF" wrapper.
- **Fees**: Displays total fees, fees paid, and outstanding balances. Includes payment histories.
- **Attendance**: Displays real-time attendance logs (Offline barcode/QR scan logs, or online live class presence).
- **Marks**: Results of offline tests graded by the instructors.
- **Analytics**: Performance charts highlighting test trends, comparison matrices, and strengths/weaknesses.

### B. Student LMS Dashboard
- **Daily Content**: Daily study targets, news analysis articles, or syllabus documents published by the instructors.
- **Live Classes**: Ongoing online sessions. Integrates a custom Zoom video player or YouTube live player to protect content and track watch-history.
- **Recorded Lectures**: A library of previous live lectures sorted by Subject ➔ Topic ➔ Subtopic.
- **Resources**: Folders containing PDFs, textbooks, and worksheets.
- **My Courses**: Fast track to the student's assigned course outlines.

---

## 🏛️ 5. Teacher Portal Workflow

Teachers log in to handle day-to-day academic operations:
- **Publish Content**: Post new daily content summaries, resources, and syllabi.
- **Schedule Live Classes**: Set up interactive video classrooms by linking Zoom accounts or YouTube streams.
- **Upload Recorded Video**: Organizes lectures under specific Courses, Subjects, Topics, and Subtopics.
- **Manage Attendance**: Manually mark or scan QR/Barcodes for offline batch students.

---

## 📑 6. Online Test Portal Workflow (AI-Assisted)

This subsystem handles full exam creation, student attempts, and computerized grading.

```
 [Upload PDF / Docx] ➔ [AI Question Extraction] ➔ [Review & Tweak Draft] ➔ [Publish Test]
                                                                                │
                                                                                ▼
 [Release Keys & Marks] 🗂️ [Evaluate Answers] 💻 [Student Takes Exam] 
```

### A. Test Creation & AI Extraction
1. **Upload**: Admin uploads a Question Paper PDF/Word document and optional Answer Key PDF/CSV.
2. **AI Extraction Prompt**: The backend parses text and forwards it to Llama-3.3-70b (free primary on Groq) or Gemini-1.5-Flash (fallback).
3. **Draft Generation**: The AI extracts questions into a clean JSON structure, separating English/Tamil translations and identifying correct options.
4. **Draft Review**: Admin checks the extracted draft in the portal UI, tweaks questions, adds custom marks, and clicks **Publish**.

### B. Exam Attempt Lifecycle
1. **Targeting**: Test is published to specific batched audiences (e.g., TNPSC Offline Batch).
2. **Mock Test UI**: Students open the exam interface, which launches a full-screen, anti-cheat viewport.
3. **Offline Permission Requests**: Students who missed the test timeline or require offline override can request permissions, which Admins approve from their dashboard.
4. **Submission & Grading**: The system automatically grades multiple-choice questions, saves results to the student’s marks database, and generates performance metrics.
5. **Answer Key & PDF Release**: After the exam window closes, students can download the detailed answer key and explanatory PDFs.

---

## 📣 7. CRM Marketing & Campaign Management

The Admin dashboard hosts tools to drive enrollment and update the active user base:
- **Campaigns**: Send target push notifications and pop-up dashboard banners to "Free Users", "Paid Students", or "All Users".
- **Guest Posters**: Upload marketing posters to Google Drive. The posters automatically refresh the Guest Dashboard's top banner carousel.
- **Leads & Feedback**: Tracks feedback from alumni, queries from visitors, and custom application details to ensure CRM staff can execute follow-up campaigns.
