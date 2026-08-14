const { GoogleGenerativeAI } = require("@google/generative-ai");

// Test key 1: hardcoded key in controller
const key1 = "";
const key2 = "";

async function testKey(keyName, keyVal) {
    console.log(`\nTesting key: ${keyName} (${keyVal.substring(0, 10)}...)`);
    try {
        const genAI = new GoogleGenerativeAI(keyVal);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Respond with the word 'OK' if you can read this.");
        console.log(`Success! Response: "${result.response.text().trim()}"`);
        return true;
    } catch (err) {
        console.error(`Failed! Error:`, err.message || err);
        return false;
    }
}

async function main() {
    await testKey("Hardcoded Key", key1);
    await testKey("Firebase Web API Key", key2);
}

main();
