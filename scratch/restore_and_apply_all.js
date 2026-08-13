const fs = require('fs');

console.log("Restoring all patches on web_portal/App.tsx sequentially...");

const webPath = 'web_portal/App.tsx';

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: Load webReplacements from apply_patches.js and apply them
// ─────────────────────────────────────────────────────────────────────────────
const applyPatchesContent = fs.readFileSync('scratch/apply_patches.js', 'utf8');

// Use regex to capture the webReplacements array
const startMarker = 'const webReplacements = [';
const endMarker = '];\n\npatchFile(mobilePath';

const startIndex = applyPatchesContent.indexOf(startMarker);
const endIndex = applyPatchesContent.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("ERROR: Could not find webReplacements array in apply_patches.js!");
  process.exit(1);
}

// Evaluate the array safely in Node
const arrayStr = applyPatchesContent.substring(startIndex + startMarker.length, endIndex);
const webReplacements = eval('[' + arrayStr + ']');

let content = fs.readFileSync(webPath, 'utf8');
content = content.replace(/\r\n/g, '\n');

console.log(`\n=================== Applying Checkpoint 13 Web Patches (${webReplacements.length}) ===================`);
for (const r of webReplacements) {
  if (content.indexOf(r.target) === -1) {
    console.error(`ERROR: Target string not found for: "${r.description}"`);
    process.exit(1);
  }
  content = content.split(r.target).join(r.replacement);
  console.log(`- Patched: "${r.description}"`);
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: Apply JSON Test Creation & Parsing Mode Changes
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n=================== Applying JSON Test Creation Mode ===================");

// genMode state
const targetGenMode = `  const [genMode, setGenMode] = useState<"file"|"text">("file");`;
const replacementGenMode = `  const [genMode, setGenMode] = useState<"file"|"text"|"json">("file");
  const [jsonQuestionsInput, setJsonQuestionsInput] = useState("");`;

if (content.indexOf(targetGenMode) === -1) {
  console.error("ERROR: targetGenMode string not found!");
  process.exit(1);
}
content = content.split(targetGenMode).join(replacementGenMode);
console.log("- Patched genMode state.");

// Prepend parseAndLoadJsonQuestions to extractQuestionsFromText
const targetExtractDef = `  const extractQuestionsFromText = async () => {
    if (genMode ==="file"&& !pdfBase64) {`;

const replacementExtractDef = `  const parseAndLoadJsonQuestions = () => {
    if (!jsonQuestionsInput.trim()) {
      Alert.alert("Error", "Please paste the JSON questions array.");
      return;
    }
    try {
      const parsed = JSON.parse(jsonQuestionsInput);
      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be an array of questions.");
      }
      const normalized = parsed.map((q: any) => {
        const questionEn = q.questionEn || q.questionText || q.question || "";
        const questionTa = q.questionTa || "";
        let optionsObj: any = {
          A: { en: "", ta: "" },
          B: { en: "", ta: "" },
          C: { en: "", ta: "" },
          D: { en: "", ta: "" }
        };
        if (q.options && typeof q.options === "object" && !Array.isArray(q.options)) {
          ["A", "B", "C", "D"].forEach(k => {
            optionsObj[k].en = q.options[k]?.en || q.options[k] || "";
            optionsObj[k].ta = q.options[k]?.ta || "";
          });
        } else if (Array.isArray(q.options)) {
          ["A", "B", "C", "D"].forEach((k, idx) => {
            optionsObj[k].en = q.options[idx] || "";
          });
        }
        ["A", "B", "C", "D"].forEach(k => {
          const flatEn = q[\`option \${k.toLowerCase()}\`] || q[\`option\${k}\`] || "";
          const flatTa = q[\`option \${k.toLowerCase()} ta\`] || q[\`option\${k}Ta\`] || "";
          if (flatEn && !optionsObj[k].en) optionsObj[k].en = flatEn;
          if (flatTa && !optionsObj[k].ta) optionsObj[k].ta = flatTa;
        });
        let correctAnswer = q.correctAnswer || q.correctOption || q.answer || "";
        correctAnswer = correctAnswer.toString().trim().toUpperCase();
        if (!["A", "B", "C", "D"].includes(correctAnswer)) {
          correctAnswer = "A";
        }
        return {
          ...q,
          questionEn,
          questionTa,
          options: optionsObj,
          correctAnswer
        };
      });
      setExtractedQuestions(normalized);
      setExtractDraftId("json_parsed");
      Alert.alert("Success", \`Successfully parsed and loaded \${normalized.length} questions into workspace!\`);
    } catch (err: any) {
      Alert.alert("Invalid JSON", err.message || "Failed to parse JSON. Please check prompt instructions and try again.");
    }
  };

  const extractQuestionsFromText = async () => {
    if (genMode === "json") {
      parseAndLoadJsonQuestions();
      return;
    }
    if (genMode ==="file"&& !pdfBase64) {`;

if (content.indexOf(targetExtractDef) === -1) {
  console.error("ERROR: targetExtractDef string not found!");
  process.exit(1);
}
content = content.split(targetExtractDef).join(replacementExtractDef);
console.log("- Patched extraction function and routing.");

// Update createTestFromExtraction check
const targetCreateCheck = `  const createTestFromExtraction = async () => {
    if (!extractDraftId || !newPdfTest.title) {
      Alert.alert("Error","Title and extracted questions are required.");
      return;
    }`;
const replacementCreateCheck = `  const createTestFromExtraction = async () => {
    if ((genMode !== "json" && !extractDraftId) || !newPdfTest.title) {
      Alert.alert("Error","Title and extracted questions are required.");
      return;
    }`;

if (content.indexOf(targetCreateCheck) === -1) {
  console.error("ERROR: targetCreateCheck string not found!");
  process.exit(1);
}
content = content.split(targetCreateCheck).join(replacementCreateCheck);
console.log("- Patched draftId check.");

// Update createTestFromExtraction payload
const targetCreatePayload = `        title: newPdfTest.title,
        draftId: extractDraftId,
        questions: extractedQuestions, // Send edited questions array!`;
const replacementCreatePayload = `        title: newPdfTest.title,
        draftId: genMode === "json" ? null : extractDraftId,
        questions: extractedQuestions, // Send edited questions array!`;

if (content.indexOf(targetCreatePayload) === -1) {
  console.error("ERROR: targetCreatePayload string not found!");
  process.exit(1);
}
content = content.split(targetCreatePayload).join(replacementCreatePayload);
console.log("- Patched create payload for draftId.");

// Update segmented control tabs in pdf-create subTab
const targetSegmentedControl = `                  {/* Segmented Control for Selection Mode */}
                  <View style={{ flexDirection:"row", marginBottom: 15, borderRadius: 8, backgroundColor: darkMode ?"#222":"#eee", padding: 4 }}>
                    <TouchableOpacity
                      onPress={() => setGenMode("file")}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: genMode ==="file"? (darkMode ?"#333":"#fff") :"transparent",
                        alignItems:"center"
                      }}
                    >
                      <Text style={{ fontWeight:"bold", color: genMode ==="file"?"#c62828": (darkMode ?"#aaa":"#555"), fontSize: 13 }}>Word File Upload</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setGenMode("text")}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: genMode ==="text"? (darkMode ?"#333":"#fff") :"transparent",
                        alignItems:"center"
                      }}
                    >
                      <Text style={{ fontWeight:"bold", color: genMode ==="text"?"#c62828": (darkMode ?"#aaa":"#555"), fontSize: 13 }}>Copy-Paste Text</Text>
                    </TouchableOpacity>
                  </View>`;

const replacementSegmentedControl = `                  {/* Segmented Control for Selection Mode */}
                  <View style={{ flexDirection:"row", marginBottom: 15, borderRadius: 8, backgroundColor: darkMode ?"#222":"#eee", padding: 4 }}>
                    <TouchableOpacity
                      onPress={() => setGenMode("file")}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: genMode ==="file"? (darkMode ?"#333":"#fff") :"transparent",
                        alignItems:"center"
                      }}
                    >
                      <Text style={{ fontWeight:"bold", color: genMode ==="file"?"#c62828": (darkMode ?"#aaa":"#555"), fontSize: 13 }}>Word File Upload</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setGenMode("text")}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: genMode ==="text"? (darkMode ?"#333":"#fff") :"transparent",
                        alignItems:"center"
                      }}
                    >
                      <Text style={{ fontWeight:"bold", color: genMode ==="text"?"#c62828": (darkMode ?"#aaa":"#555"), fontSize: 13 }}>Copy-Paste Text</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setGenMode("json")}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: genMode ==="json"? (darkMode ?"#333":"#fff") :"transparent",
                        alignItems:"center"
                      }}
                    >
                      <Text style={{ fontWeight:"bold", color: genMode ==="json"?"#c62828": (darkMode ?"#aaa":"#555"), fontSize: 13 }}>Paste JSON Array</Text>
                    </TouchableOpacity>
                  </View>`;

if (content.indexOf(targetSegmentedControl) === -1) {
  console.error("ERROR: targetSegmentedControl string not found!");
  process.exit(1);
}
content = content.split(targetSegmentedControl).join(replacementSegmentedControl);
console.log("- Patched segmented control mode tabs.");

// Update submit button text label to support genMode === "json"
const targetButtonLabel = `                        {isExtracting
                          ?"Extracting Questions..."
                          : extractMode ==="local"
                            ?"Extract Questions (Local Regex)"
                            : extractMode ==="ai"
                              ?"Extract Questions (Groq AI)"
                              :"Extract Questions (Auto Mode)"}`;

const replacementButtonLabel = `                        {isExtracting
                          ?"Extracting Questions..."
                          : genMode === "json"
                            ?"Parse & Load JSON Questions"
                            : extractMode ==="local"
                              ?"Extract Questions (Local Regex)"
                              : extractMode ==="ai"
                                ?"Extract Questions (Groq AI)"
                                :"Extract Questions (Auto Mode)"}`;

if (content.indexOf(targetButtonLabel) === -1) {
  console.error("ERROR: targetButtonLabel string not found!");
  process.exit(1);
}
content = content.split(targetButtonLabel).join(replacementButtonLabel);
console.log("- Patched button label conditional rendering.");

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: Apply the updated Prompt block & text area inside genMode === "json"
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n=================== Applying Prompt Extraction helpers ===================");

const targetConditionalRender = `                  {genMode ==="file"? (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={[styles.label, darkMode && styles.labelDark]}>Upload Question Paper Word File (.docx):</Text>`;

const replacementConditionalRender = `                  {genMode === "json" ? (
                    <View style={{ marginBottom: 10 }}>
                      {/* AI PROMPT GENERATOR */}
                      <TouchableOpacity
                        onPress={() => setShowAiPromptHelper(!showAiPromptHelper)}
                        style={{ backgroundColor: darkMode ?"#1a2a1a":"#e8f5e9", borderRadius: 10, padding: 12, marginBottom: 12, flexDirection:"row", alignItems:"center", justifyContent:"space-between", borderWidth: 1, borderColor: darkMode ?"#2d4a2d":"#a5d6a7"}}
                      >
                        <View style={{ flexDirection:"row", alignItems:"center", gap: 8 }}>
                          <Text style={{ fontSize: 18 }}>🤖</Text>
                          <View>
                            <Text style={{ fontWeight:"bold", color: darkMode ?"#81c784":"#2e7d32", fontSize: 13 }}>AI Prompt Generator</Text>
                            <Text style={{ fontSize: 10, color: darkMode ?"#66bb6a":"#388e3c" }}>Generate with ChatGPT · Gemini · Claude · Groq · DeepSeek · Perplexity</Text>
                          </View>
                        </View>
                        <Ionicons name={showAiPromptHelper ?"chevron-up":"chevron-down"} size={16} color={darkMode ?"#81c784":"#2e7d32"} />
                      </TouchableOpacity>

                      {showAiPromptHelper && (() => {
                        const numQ = promptNumQs || "50";
                        const topic = promptTopic || "[Enter your topic above]";

                        const enTaPrompt = \`You are an expert at extracting and converting MCQ question papers into structured JSON.

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
[இங்கே உங்கள் வினாத்தாள் உரையை ஒட்டவும்]\`;

                        const prompts: Record<string, string> = { "en-ta": enTaPrompt, "en": enPrompt, "formula": formulaPrompt, "ta": taPrompt };
                        const currentPrompt = prompts[selectedPromptType] || enTaPrompt;
                        const promptTypes = [
                          { key:"en-ta", icon:"🇮🇳", label:"English + Tamil", desc:"Bilingual — TNPSC / UPSC"},
                          { key:"en", icon:"🇬🇧", label:"English Only", desc:"Standard MCQ paper"},
                          { key:"formula", icon:"🔬", label:"Maths / Science", desc:"Formula-based paper"},
                          { key:"ta", icon:"📖", label:"Tamil Only", desc:"Tamil medium paper"}
                        ];
                        return (
                          <View style={{ backgroundColor: darkMode ?"#111a11":"#f1f8e9", borderRadius: 10, padding: 14, marginBottom: 15, borderWidth: 1, borderColor: darkMode ?"#2d4a2d":"#c8e6c9"}}>
                            <Text style={{ fontSize: 11, fontWeight: "bold", color: darkMode ? "#81c784" : "#2e7d32", marginBottom: 8 }}>INSTRUCTIONS:</Text>
                            <Text style={{ fontSize: 10, color: darkMode ? "#aaa" : "#555", marginBottom: 12, lineHeight: 14 }}>
                              1. Select the question paper type below.\\n
                              2. Copy the prompt template.\\n
                              3. Paste the prompt template followed by your actual question paper text into ChatGPT/Gemini/Claude/Groq/DeepSeek/Perplexity.\\n
                              4. Copy the structured JSON response, paste it below, and parse it.
                            </Text>
                            <View style={{ flexDirection:"row", flexWrap:"wrap", gap: 8, marginBottom: 14 }}>
                              {promptTypes.map(pt => (
                                <TouchableOpacity
                                  key={pt.key}
                                  onPress={() => setSelectedPromptType(pt.key)}
                                  style={{ flex: 1, minWidth: 110, padding: 10, borderRadius: 8, borderWidth: 2, borderColor: selectedPromptType === pt.key ?"#2e7d32": (darkMode ?"#333":"#e0e0e0"), backgroundColor: selectedPromptType === pt.key ? (darkMode ?"#1b3a1b":"#e8f5e9") : (darkMode ?"#1a1a1a":"#ffffff"), alignItems:"center"}}
                                >
                                  <Text style={{ fontSize: 16 }}>{pt.icon}</Text>
                                  <Text style={{ fontWeight:"bold", fontSize: 10, color: selectedPromptType === pt.key ?"#2e7d32": (darkMode ?"#aaa":"#555"), marginTop: 2 }}>{pt.label}</Text>
                                  <Text style={{ fontSize: 9, color: darkMode ?"#777":"#888"}}>{pt.desc}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                            <View style={{ backgroundColor: darkMode ?"#0a130a":"#ffffff", borderRadius: 8, borderWidth: 1, borderColor: darkMode ?"#2a3a2a":"#dcedc8", padding: 10, marginBottom: 10, maxHeight: 220 }}>
                              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                                <Text selectable style={{ fontFamily:"monospace", fontSize: 10, color: darkMode ?"#b2dfdb":"#212121", lineHeight: 16 }}>{currentPrompt}</Text>
                              </ScrollView>
                            </View>
                            <TouchableOpacity
                              onPress={() => {
                                if (Platform.OS ==="web") {
                                  try {
                                    (navigator as any).clipboard.writeText(currentPrompt).then(() => {
                                      Alert.alert("✅ Copied!","Prompt copied! Paste it into ChatGPT / Gemini / Claude / Groq / DeepSeek / Perplexity. Get the JSON response, then paste it in the 'Paste Questions JSON Array' box below.");
                                    });
                                  } catch { Alert.alert("Tip","Long-press and select all text in the box above to copy manually."); }
                                } else {
                                  Alert.alert("Prompt Ready","Long-press the prompt text above to select and copy it.");
                                }
                              }}
                              style={{ backgroundColor:"#2e7d32", borderRadius: 8, paddingVertical: 11, alignItems:"center", flexDirection:"row", justifyContent:"center", gap: 8, marginBottom: 10 }}
                            >
                              <Ionicons name="copy-outline" size={16} color="#fff" />
                              <Text style={{ color:"#fff", fontWeight:"bold", fontSize: 13 }}>Copy Prompt to Clipboard</Text>
                            </TouchableOpacity>
                            <View style={{ backgroundColor: darkMode ?"#1b2a1b":"#e8f5e9", borderRadius: 6, padding: 8, flexDirection:"row", gap: 6, alignItems:"flex-start"}}>
                              <Text style={{ fontSize: 14 }}>💡</Text>
                              <Text style={{ fontSize: 10, color: darkMode ?"#a5d6a7":"#388e3c", flex: 1, lineHeight: 15 }}>
                                Step 1: Select paper type below → Step 2: Copy prompt → Step 3: Paste in ChatGPT/Gemini/Claude/Groq/DeepSeek/Perplexity → Step 4: Copy the JSON response → Step 5: Paste below and click "Parse & Load JSON Questions"
                              </Text>
                            </View>
                          </View>
                        );
                      })()}

                      <Text style={[styles.label, darkMode && styles.labelDark]}>Paste Questions JSON Array *:</Text>
                      <TextInput
                        style={[styles.input, darkMode && styles.inputDark, { minHeight: 220, maxHeight: 400, textAlignVertical:"top", padding: 12, fontFamily: "monospace", fontSize: 11 }]}
                        placeholder={\`[\\n  {\\n    "question": "Question text...",\\n    "option a": "Choice 1",\\n    "option b": "Choice 2",\\n    ... \\n  }\\n]\`}
                        placeholderTextColor="#999"
                        multiline
                        scrollEnabled={true}
                        value={jsonQuestionsInput}
                        onChangeText={setJsonQuestionsInput}
                      />
                    </View>
                  ) : genMode ==="file"? (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={[styles.label, darkMode && styles.labelDark]}>Upload Question Paper Word File (.docx):</Text>`;

if (content.indexOf(targetConditionalRender) === -1) {
  console.error("ERROR: targetConditionalRender string not found!");
  process.exit(1);
}
content = content.split(targetConditionalRender).join(replacementConditionalRender);
console.log("- Patched conditional render tabs.");

fs.writeFileSync(webPath, content, 'utf8');
console.log("All patches applied successfully!");
