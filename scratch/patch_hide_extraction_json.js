const fs = require('fs');

console.log("Hiding extraction modes for JSON and changing Groq to Gemini...");

const webPath = 'web_portal/App.tsx';

let content = fs.readFileSync(webPath, 'utf8');
content = content.replace(/\r\n/g, '\n');

// 1. Wrap and rename the Extraction Mode block
const targetExtractionBlock = `                  <Text style={[styles.label, darkMode && styles.labelDark]}>Extraction Mode:</Text>
                  <View style={{ flexDirection:"row", marginBottom: 15, borderRadius: 8, backgroundColor: darkMode ?"#222":"#eee", padding: 4 }}>
                    <TouchableOpacity
                      onPress={() => setExtractMode("auto")}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: extractMode ==="auto"? (darkMode ?"#333":"#fff") :"transparent",
                        alignItems:"center"
                      }}
                    >
                      <Text style={{ fontWeight:"bold", color: extractMode ==="auto"?"#c62828": (darkMode ?"#aaa":"#555"), fontSize: 11 }}>Auto (Recommended)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setExtractMode("local")}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: extractMode ==="local"? (darkMode ?"#333":"#fff") :"transparent",
                        alignItems:"center"
                      }}
                    >
                      <Text style={{ fontWeight:"bold", color: extractMode ==="local"?"#c62828": (darkMode ?"#aaa":"#555"), fontSize: 11 }}>Local-Only (Free)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setExtractMode("ai")}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: extractMode ==="ai"? (darkMode ?"#333":"#fff") :"transparent",
                        alignItems:"center"
                      }}
                    >
                      <Text style={{ fontWeight:"bold", color: extractMode ==="ai"?"#c62828": (darkMode ?"#aaa":"#555"), fontSize: 11 }}>AI-Only (Groq)</Text>
                    </TouchableOpacity>
                  </View>`;

const replacementExtractionBlock = `                  {genMode !== "json" && (
                    <>
                      <Text style={[styles.label, darkMode && styles.labelDark]}>Extraction Mode:</Text>
                      <View style={{ flexDirection:"row", marginBottom: 15, borderRadius: 8, backgroundColor: darkMode ?"#222":"#eee", padding: 4 }}>
                        <TouchableOpacity
                          onPress={() => setExtractMode("auto")}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 6,
                            backgroundColor: extractMode ==="auto"? (darkMode ?"#333":"#fff") :"transparent",
                            alignItems:"center"
                          }}
                        >
                          <Text style={{ fontWeight:"bold", color: extractMode ==="auto"?"#c62828": (darkMode ?"#aaa":"#555"), fontSize: 11 }}>Auto (Recommended)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setExtractMode("local")}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 6,
                            backgroundColor: extractMode ==="local"? (darkMode ?"#333":"#fff") :"transparent",
                            alignItems:"center"
                          }}
                        >
                          <Text style={{ fontWeight:"bold", color: extractMode ==="local"?"#c62828": (darkMode ?"#aaa":"#555"), fontSize: 11 }}>Local-Only (Free)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setExtractMode("ai")}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 6,
                            backgroundColor: extractMode ==="ai"? (darkMode ?"#333":"#fff") :"transparent",
                            alignItems:"center"
                          }}
                        >
                          <Text style={{ fontWeight:"bold", color: extractMode ==="ai"?"#c62828": (darkMode ?"#aaa":"#555"), fontSize: 11 }}>AI-Only (Gemini)</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}`;

if (content.indexOf(targetExtractionBlock) === -1) {
  console.error("ERROR: targetExtractionBlock not found!");
  process.exit(1);
}
content = content.split(targetExtractionBlock).join(replacementExtractionBlock);
console.log("- Successfully wrapped extraction modes conditional and renamed Groq -> Gemini.");

// 2. Rename button label "Groq AI" to "Gemini AI"
const targetButtonText = `                            ?"Extract Questions (Groq AI)"`;
const replacementButtonText = `                            ?"Extract Questions (Gemini AI)"`;

if (content.indexOf(targetButtonText) === -1) {
  console.error("ERROR: targetButtonText not found!");
  process.exit(1);
}
content = content.split(targetButtonText).join(replacementButtonText);
console.log("- Successfully renamed button label Groq AI -> Gemini AI.");

fs.writeFileSync(webPath, content, 'utf8');
console.log("Done!");
