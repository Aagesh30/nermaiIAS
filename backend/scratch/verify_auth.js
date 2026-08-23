const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function verify() {
    console.log("1. Logging in as super_admin...");
    let superAdminToken;
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            username: "admin@nermai.com",
            password: "nermaiadmin@unistrix"
        });
        superAdminToken = res.data.data.token;
        console.log("✅ Super Admin logged in! Token successfully retrieved.");
    } catch (e) {
        console.error("❌ Super Admin login failed:", e.response?.data || e.message);
        return;
    }

    console.log("\n2. Requesting /api/developer/collections with Super Admin token (should be 403)...");
    try {
        await axios.get(`${BASE_URL}/developer/collections`, {
            headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        console.error("❌ Fail: Super Admin was allowed to access developer portal!");
    } catch (e) {
        if (e.response?.status === 403) {
            console.log("✅ Success: Super Admin was correctly blocked (403 Forbidden).");
        } else {
            console.error("❌ Unexpected error:", e.response?.status, e.response?.data || e.message);
        }
    }

    console.log("\n3. Logging in as developer...");
    let developerToken;
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            username: "developer@unistrix",
            password: "Unistrix@24252630"
        });
        developerToken = res.data.data.token;
        console.log("✅ Developer logged in! Token successfully retrieved.");
    } catch (e) {
        console.error("❌ Developer login failed:", e.response?.data || e.message);
        return;
    }

    console.log("\n4. Requesting /api/developer/collections with Developer token (should be 200)...");
    try {
        const res = await axios.get(`${BASE_URL}/developer/collections`, {
            headers: { Authorization: `Bearer ${developerToken}` }
        });
        console.log("✅ Success: Developer allowed access (200 OK)!", res.data.success);
    } catch (e) {
        console.error("❌ Fail: Developer access blocked:", e.response?.status, e.response?.data || e.message);
    }
}

verify().catch(console.error);
