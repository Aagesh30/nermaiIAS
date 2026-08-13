const fs = require('fs');

console.log("Modifying prompts to extract from copy-pasted papers with correct backtick escapes...");

const webPath = 'web_portal/App.tsx';

let content = fs.readFileSync(webPath, 'utf8');
content = content.replace(/\r\n/g, '\n');

// Target the prompt declarations inside showAiPromptHelper
const targetBlock = `                    const enTaPrompt = \`You are an expert at creating MCQ question papers for Indian competitive examinations (UPSC, TNPSC, APPSC, etc.).

Generate a JSON array of \${numQ} multiple choice questions on the topic: \${topic}

Each question MUST follow this EXACT JSON format (no extra fields, no markdown):
[
  {
    "question": "The question text in English",
    "questionTa": "கேள்வி உரை தமிழில்",
    "option a": "English option A",
    "option b": "English option B",
    "option c": "English option C",
    "option d": "English option D",
    "optionTa_a": "தமிழில் விருப்பம் A",
    "optionTa_b": "தமிழில் விருப்பம் B",
    "optionTa_c": "தமிழில் விருப்பம் C",
    "optionTa_d": "தமிழில் விருப்பம் D",
    "correct option": "B",
    "explanation": "Brief explanation in English of why the answer is correct"
  }
]

STRICT RULES:
- "correct option" must be exactly "A", "B", "C", or "D" (single uppercase letter ONLY)
- All 4 options must be distinct, plausible, and not obviously wrong
- Tamil translations must be accurate and natural
- Explanation must clearly justify the correct answer
- Return ONLY the raw JSON array — no markdown, no code blocks, no extra text before or after\`;

                    const enPrompt = \`You are an expert at creating MCQ question papers for Indian competitive examinations.

Generate a JSON array of \${numQ} multiple choice questions on the topic: \${topic}

Each question MUST follow this EXACT JSON format:
[
  {
    "question": "The question text in English",
    "option a": "Option A",
    "option b": "Option B",
    "option c": "Option C",
    "option d": "Option D",
    "correct option": "A",
    "explanation": "Brief explanation of why A is the correct answer"
  }
]

STRICT RULES:
- "correct option" must be exactly "A", "B", "C", or "D" (single uppercase letter ONLY)
- All 4 options must be distinct and plausible
- Return ONLY the raw JSON array — no markdown, no code blocks, no extra text\`;

                    const formulaPrompt = \`You are an expert at creating formula-based MCQ question papers for Mathematics and Science (Physics, Chemistry, Biology).

Generate a JSON array of \${numQ} calculation/formula-based MCQ questions on the topic: \${topic}

Each question MUST follow this EXACT JSON format:
[
  {
    "question": "The question text (include numerical values where needed)",
    "formula": "Relevant formula or equation (e.g. KE = 1/2 mv^2, F = ma, PV = nRT)",
    "option a": "Answer option A (include units where applicable)",
    "option b": "Answer option B",
    "option c": "Answer option C",
    "option d": "Answer option D",
    "correct option": "B",
    "explanation": "Step-by-step solution showing the full calculation and working"
  }
]

STRICT RULES:
- "correct option" must be exactly "A", "B", "C", or "D" (single uppercase letter ONLY)
- formula field: use plain text. For powers use ^ (e.g. m/s^2, x^2). Greek: α β γ Δ Ω π θ λ μ σ ρ
- Include units in options (e.g. "4 m/s²", "200 J", "3.14 N")
- If no formula applies, set formula to ""
- Explanation must show complete step-by-step working
- Return ONLY the raw JSON array — no markdown, no code blocks, no extra text\`;

                    const taPrompt = \`நீங்கள் இந்திய போட்டித் தேர்வுகளுக்கான (TNPSC, UPSC) தமிழ் வினாத்தாள் உருவாக்குவதில் நிபுணர்.

பின்வரும் தலைப்பில் \${numQ} பலவுள் ஒன்று வினாக்களை JSON வடிவில் தயார் செய்யுங்கள்: \${topic}

ஒவ்வொரு வினாவும் இந்த சரியான JSON வடிவத்தை பின்பற்ற வேண்டும்:
[
  {
    "question": "தமிழில் வினா உரை",
    "option a": "விருப்பம் அ",
    "option b": "விருப்பம் ஆ",
    "option c": "விருப்பம் இ",
    "option d": "விருப்பம் ஈ",
    "correct option": "A",
    "explanation": "சரியான விடையின் விளக்கம் தமிழில்"
  }
]

கட்டாய விதிகள்:
- "correct option" சரியாக "A", "B", "C", அல்லது "D" மட்டுமே இருக்க வேண்டும்
- அனைத்து விருப்பங்களும் வேறுபட்டதாக இருக்க வேண்டும்
- JSON array மட்டுமே திரும்ப அனுப்பவும் — markdown இல்லாமல்\`;`;

const replacementBlock = `                    const enTaPrompt = \`You are an expert at extracting and converting MCQ question papers into structured JSON.

Convert the pasted question paper text below into a JSON array of multiple choice questions. You must extract and preserve the exact questions and options from the text.

Each question MUST follow this EXACT JSON format (no extra fields, no markdown):
[
  {
    "question": "The question text in English",
    "questionTa": "கேள்வி உரை தமிழில்",
    "option a": "English option A",
    "option b": "English option B",
    "option c": "English option C",
    "option d": "English option D",
    "optionTa_a": "தமிழில் விருப்பம் A",
    "optionTa_b": "தமிழில் விருப்பம் B",
    "optionTa_c": "தமிழில் விருப்பம் C",
    "optionTa_d": "தமிழில் விருப்பம் D",
    "correct option": "B",
    "explanation": "Brief explanation in English of why the answer is correct"
  }
]

STRICT RULES:
- Do NOT generate new questions. Extract the exact questions and options from the pasted text below.
- "correct option" must be exactly "A", "B", "C", or "D" (single uppercase letter ONLY). If not specified in the text, determine the correct choice.
- All options must be copied exactly as they are written.
- Tamil translations of questions and options must match the Tamil version in the paper.
- Return ONLY the raw JSON array — no markdown (do not wrap in \\\`\\\`\\\`json blocks), no extra explanation or conversational text before or after.

---
PASTED QUESTION PAPER TEXT:
[Paste your question paper text here]\`;

                    const enPrompt = \`You are an expert at extracting and converting MCQ question papers into structured JSON.

Convert the pasted question paper text below into a JSON array of multiple choice questions. Extract the questions exactly as written in the text.

Each question MUST follow this EXACT JSON format:
[
  {
    "question": "The question text in English",
    "option a": "Option A",
    "option b": "Option B",
    "option c": "Option C",
    "option d": "Option D",
    "correct option": "A",
    "explanation": "Brief explanation of why A is the correct answer"
  }
]

STRICT RULES:
- Do NOT generate new questions. Extract the exact questions and options from the pasted text below.
- "correct option" must be exactly "A", "B", "C", or "D" (single uppercase letter ONLY).
- Return ONLY the raw JSON array — no markdown (do not wrap in \\\`\\\`\\\`json blocks), no extra text.

---
PASTED QUESTION PAPER TEXT:
[Paste your question paper text here]\`;

                    const formulaPrompt = \`You are an expert at extracting formula-based MCQ question papers (Mathematics/Science) into structured JSON.

Convert the pasted formula-based question paper text below into a JSON array of MCQ questions.

Each question MUST follow this EXACT JSON format:
[
  {
    "question": "The question text (include numerical values exactly as in the paper)",
    "formula": "Relevant formula or equation used (e.g. KE = 1/2 mv^2, F = ma, PV = nRT)",
    "option a": "Answer option A (include units exactly)",
    "option b": "Answer option B",
    "option c": "Answer option C",
    "option d": "Answer option D",
    "correct option": "B",
    "explanation": "Step-by-step solution showing the calculation and working"
  }
]

STRICT RULES:
- Do NOT generate new questions. Extract the exact questions and options from the pasted text below.
- "correct option" must be exactly "A", "B", "C", or "D".
- formula field: Extract the mathematical formula/equation used to solve the question. Use plain text. For powers use ^ (e.g. m/s^2, x^2). Greek symbols: α β γ Δ Ω π θ λ μ σ ρ.
- If no specific formula applies, set formula to "".
- Return ONLY the raw JSON array — no markdown (do not wrap in \\\`\\\`\\\`json blocks), no extra text.

---
PASTED QUESTION PAPER TEXT:
[Paste your question paper text here]\`;

                    const taPrompt = \`விடைத்தாள் மற்றும் வினாக்களை JSON ஆக மாற்றுவதில் நீங்கள் ஒரு நிபுணர்.

கீழே ஒட்டப்பட்ட தமிழ் வினாத்தாள் உரையை MCQ JSON வரிசையாக (array) மாற்றவும். வினாக்கள் மற்றும் விருப்பங்களை அப்படியே துல்லியமாக பிரித்தெடுக்கவும்.

ஒவ்வொரு வினாவும் இந்த சரியான JSON வடிவத்தை பின்பற்ற வேண்டும்:
[
  {
    "question": "தமிழில் வினா உரை",
    "option a": "விருப்பம் அ",
    "option b": "விருப்பம் ஆ",
    "option c": "விருப்பம் இ",
    "option d": "விருப்பம் ஈ",
    "correct option": "A",
    "explanation": "சரியான விடையின் விளக்கம் தமிழில்"
  }
]

கட்டாய விதிகள்:
- புதிய வினாக்களை உருவாக்க வேண்டாம். கீழே ஒட்டப்பட்ட உரையிலிருந்து வினாக்களை அப்படியே பிரித்தெடுக்கவும்.
- "correct option" சரியாக "A", "B", "C", அல்லது "D" மட்டுமே இருக்க வேண்டும்.
- JSON array மட்டுமே திரும்ப அனுப்பவும் — மார்க்டவுன் (no \\\`\\\`\\\`json blocks) அல்லது கூடுதல் உரை இல்லாமல்.

---
ஒட்டப்பட்ட தமிழ் வினாத்தாள் உரை:
[இங்கே உங்கள் வினாத்தாள் உரையை ஒட்டவும்]\`;`;

if (content.indexOf(targetBlock) === -1) {
  console.error("ERROR: targetBlock string not found!");
  process.exit(1);
}
content = content.split(targetBlock).join(replacementBlock);
console.log("- Patched prompt blocks.");

// Remove promptTopic & promptNumQs inputs from JSON tab UI render to avoid confusion
const targetInputs = `                      <View style={{ backgroundColor: darkMode ?"#111a11":"#f1f8e9", borderRadius: 10, padding: 14, marginBottom: 15, borderWidth: 1, borderColor: darkMode ?"#2d4a2d":"#c8e6c9"}}>
                            <TextInput
                              style={[styles.input, darkMode && styles.inputDark, { marginBottom: 8 }]}
                              placeholder="Topic (e.g. Indian Polity, Thermodynamics, ஊரக வளர்ச்சி)"
                              placeholderTextColor="#999"
                              value={promptTopic}
                              onChangeText={setPromptTopic}
                            />
                            <TextInput
                              style={[styles.input, darkMode && styles.inputDark, { marginBottom: 12 }]}
                              placeholder="Number of questions (e.g. 50)"
                              placeholderTextColor="#999"
                              keyboardType="numeric"
                              value={promptNumQs}
                              onChangeText={setPromptNumQs}
                            />`;

const replacementInputs = `                      <View style={{ backgroundColor: darkMode ?"#111a11":"#f1f8e9", borderRadius: 10, padding: 14, marginBottom: 15, borderWidth: 1, borderColor: darkMode ?"#2d4a2d":"#c8e6c9"}}>
                            <Text style={{ fontSize: 11, fontWeight: "bold", color: darkMode ? "#81c784" : "#2e7d32", marginBottom: 8 }}>INSTRUCTIONS:</Text>
                            <Text style={{ fontSize: 10, color: darkMode ? "#aaa" : "#555", marginBottom: 12, lineHeight: 14 }}>
                              1. Select the question paper type below.\n
                              2. Copy the prompt template.\n
                              3. Paste the prompt template followed by your actual question paper text into ChatGPT/Gemini/Claude/Groq/DeepSeek/Perplexity.\n
                              4. Copy the structured JSON response, paste it below, and parse it.
                            </Text>`;

if (content.indexOf(targetInputs) === -1) {
  console.error("ERROR: targetInputs string not found!");
  process.exit(1);
}
content = content.split(targetInputs).join(replacementInputs);
console.log("- Patched prompt helper inputs.");

fs.writeFileSync(webPath, content, 'utf8');
console.log("All patches applied successfully!");
