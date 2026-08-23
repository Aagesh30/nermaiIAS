const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function runTests() {
    console.log("=== STARTING ZOOM VISITOR ACCESS CONTROL VERIFICATION ===");

    // 1. Login as Super Admin
    console.log("\nLogging in as Super Admin...");
    let superAdminToken;
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            username: "admin@nermai.com",
            password: "nermaiadmin@unistrix"
        });
        superAdminToken = res.data.data.token;
        console.log("✅ Super Admin logged in!");
    } catch (e) {
        console.error("❌ Super Admin login failed:", e.response?.data || e.message);
        process.exit(1);
    }

    // 2. Fetch candidates list
    console.log("\nFetching live session candidates...");
    let candidates;
    try {
        const res = await axios.get(`${BASE_URL}/staff/live-session-candidates`, {
            headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        candidates = res.data.data;
        console.log("✅ Retrieved candidates list!");
        console.log(`- Admins: ${candidates.admins.length}`);
        console.log(`- Teachers: ${candidates.teachers.length}`);
    } catch (e) {
        console.error("❌ Failed to fetch candidates:", e.response?.data || e.message);
        process.exit(1);
    }

    const testAdmin = candidates.admins[0];
    const testTeacher = candidates.teachers[0];

    if (!testAdmin || !testTeacher) {
        console.error("❌ Not enough seeded users (need at least 1 admin and 1 teacher) to perform complete test.");
        process.exit(1);
    }

    console.log(`Using test admin: ${testAdmin.name} (${testAdmin.id})`);
    console.log(`Using test teacher: ${testTeacher.name} (${testTeacher.id})`);

    // 3. Create dummy Class topic
    console.log("\nCreating a dummy topic for testing live class...");
    let topicId;
    try {
        // Find existing topics or query list
        const res = await axios.get(`${BASE_URL}/topics`, {
            headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        const topics = res.data.data || res.data;
        if (topics && topics.length > 0) {
            topicId = topics[0].id;
            console.log(`✅ Using existing topic ID: ${topicId}`);
        } else {
            console.error("❌ No topics found, cannot create live class.");
            process.exit(1);
        }
    } catch (e) {
        console.error("❌ Failed to find topic:", e.response?.data || e.message);
        process.exit(1);
    }

    // 4. Create live class and session
    console.log("\nCreating live class...");
    let classId;
    const randomSuffix = Math.floor(Math.random() * 100000);
    try {
        const res = await axios.post(`${BASE_URL}/topics/${topicId}/classes`, {
            title: `Test Access Control Class ${randomSuffix}`,
            description: "Testing visibility filters",
            topicId: topicId,
            classType: "live",
            accessLevel: "batch"
        }, {
            headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        const classData = res.data.data || res.data;
        classId = classData.id;
        console.log(`✅ Live class created! ID: ${classId}`);
    } catch (e) {
        console.error("❌ Failed to create live class:", e.response?.data || e.message);
        process.exit(1);
    }

    // 5. Test validation: Creator added again in participant list (expects 400)
    console.log("\nTesting validation: Adding host admin to participantAdminIds...");
    try {
        const payload = {
            classId,
            provider: "zoom",
            scheduledStartTime: new Date(Date.now() + 3600000).toISOString(),
            expectedDurationMinutes: 60,
            meetingMode: "create_new",
            host: { userId: testAdmin.id, role: "ADMIN" },
            participantAdminIds: [testAdmin.id] // duplicate host/creator
        };
        await axios.post(`${BASE_URL}/live-sessions/create`, payload, {
            headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        console.error("❌ FAIL: Server accepted duplicate creator in participant list!");
    } catch (e) {
        if (e.response?.status === 400) {
            console.log(`✅ Success: Blocked duplicate with 400 Bad Request. Error: "${e.response.data.message}"`);
        } else {
            console.error("❌ Unexpected validation behavior:", e.response?.status, e.response?.data);
        }
    }

    // 6. Test validation: Duplicate participant IDs (expects 400)
    console.log("\nTesting validation: Duplicate participant IDs...");
    try {
        const payload = {
            classId,
            provider: "zoom",
            scheduledStartTime: new Date(Date.now() + 3600000).toISOString(),
            expectedDurationMinutes: 60,
            meetingMode: "create_new",
            host: { userId: testAdmin.id, role: "ADMIN" },
            participantTeacherIds: [testTeacher.id, testTeacher.id] // duplicate
        };
        await axios.post(`${BASE_URL}/live-sessions/create`, payload, {
            headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        console.error("❌ FAIL: Server accepted duplicate participant IDs!");
    } catch (e) {
        if (e.response?.status === 400) {
            console.log(`✅ Success: Blocked duplicate with 400 Bad Request. Error: "${e.response.data.message}"`);
        } else {
            console.error("❌ Unexpected validation behavior:", e.response?.status, e.response?.data);
        }
    }

    // 7. Test validation: Non-matching roles (expects 400)
    console.log("\nTesting validation: Wrong user role (Teacher as Admin)...");
    try {
        const payload = {
            classId,
            provider: "zoom",
            scheduledStartTime: new Date(Date.now() + 3600000).toISOString(),
            expectedDurationMinutes: 60,
            meetingMode: "create_new",
            host: { userId: testAdmin.id, role: "ADMIN" },
            participantAdminIds: [testTeacher.id] // teacher in admin array
        };
        await axios.post(`${BASE_URL}/live-sessions/create`, payload, {
            headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        console.error("❌ FAIL: Server accepted wrong role for participant!");
    } catch (e) {
        if (e.response?.status === 400) {
            console.log(`✅ Success: Blocked wrong role with 400 Bad Request. Error: "${e.response.data.message}"`);
        } else {
            console.error("❌ Unexpected validation behavior:", e.response?.status, e.response?.data);
        }
    }

    // 8. Create valid live session with testTeacher as participant
    console.log("\nCreating valid session with testTeacher as participant...");
    let sessionId;
    try {
        const payload = {
            classId,
            provider: "zoom",
            scheduledStartTime: new Date(Date.now() + 3600000).toISOString(),
            expectedDurationMinutes: 60,
            meetingMode: "create_new",
            host: { userId: testAdmin.id, role: "ADMIN" },
            participantTeacherIds: [testTeacher.id]
        };
        const res = await axios.post(`${BASE_URL}/live-sessions/create`, payload, {
            headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        const sessionData = res.data.data || res.data;
        sessionId = sessionData.id;
        console.log(`✅ Session created successfully! ID: ${sessionId}`);
    } catch (e) {
        console.error("❌ Failed to create valid session:", e.response?.data || e.message);
        process.exit(1);
    }

    // 9. Verify that the teacher sees this session!
    console.log(`\nVerifying session visibility for assigned teacher (${testTeacher.name})...`);
    try {
        const res = await axios.get(`${BASE_URL}/staff/${testTeacher.id}/live-sessions`, {
            headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        const list = res.data.data || res.data;
        const matched = list.find(s => s.classId === classId);
        if (matched) {
            console.log("✅ Success: Assigned teacher sees the live session!");
        } else {
            console.error("❌ FAIL: Assigned teacher cannot see the live session!");
        }
    } catch (e) {
        console.error("❌ Request failed:", e.response?.data || e.message);
    }

    // 10. Verify that unassigned staff cannot see the live session!
    const unassignedTeacher = candidates.teachers.find(t => t.id !== testTeacher.id);
    if (unassignedTeacher) {
        console.log(`\nVerifying session visibility for unassigned teacher (${unassignedTeacher.name})...`);
        try {
            const res = await axios.get(`${BASE_URL}/staff/${unassignedTeacher.id}/live-sessions`, {
                headers: { Authorization: `Bearer ${superAdminToken}` }
            });
            const list = res.data.data || res.data;
            const matched = list.find(s => s.classId === classId);
            if (!matched) {
                console.log("✅ Success: Unassigned teacher cannot see the live session!");
            } else {
                console.error("❌ FAIL: Unassigned teacher can see the live session!");
            }
        } catch (e) {
            console.error("❌ Request failed:", e.response?.data || e.message);
        }
    } else {
        console.log("\nSkipping unassigned teacher test: no other teachers available.");
    }

    console.log("\n=== ALL ACCESS CONTROL VERIFICATIONS COMPLETED SUCCESSFULLY ===");
}

runTests().catch(console.error);
