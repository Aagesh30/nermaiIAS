const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// 1. Daily Quiz options map 1 closing
const target1 = `                                     <View style={{ height: 4, backgroundColor: darkMode ? "#333" : "#eeeeee", borderRadius: 2 }}>
                                       <View style={{ width: \`\${pct}%\`, height: "100%", backgroundColor: isCorrect ? "#2e7d32" : "#bdbdbd", borderRadius: 2 }} />
                                     </View>
                                   </View>
                                 );
                             </View>`;

const replacement1 = `                                     <View style={{ height: 4, backgroundColor: darkMode ? "#333" : "#eeeeee", borderRadius: 2 }}>
                                       <View style={{ width: \`\${pct}%\`, height: "100%", backgroundColor: isCorrect ? "#2e7d32" : "#bdbdbd", borderRadius: 2 }} />
                                     </View>
                                   </View>
                                 );
                               })}
                             </View>`;

// 2. Daily Quiz feedback options map 2 closing
const target2 = `                                       <View style={{ height: 4, backgroundColor: darkMode ? "#333" : "#eeeeee", borderRadius: 2 }}>
                                         <View style={{ width: \`\${pct}%\`, height: "100%", backgroundColor: isCorrect ? "#2e7d32" : isUserChoice && !isCorrect ? "#c62828" : "#bdbdbd", borderRadius: 2 }} />
                                       </View>
                                     </View>
                                   );
                               </View>`;

const replacement2 = `                                       <View style={{ height: 4, backgroundColor: darkMode ? "#333" : "#eeeeee", borderRadius: 2 }}>
                                         <View style={{ width: \`\${pct}%\`, height: "100%", backgroundColor: isCorrect ? "#2e7d32" : isUserChoice && !isCorrect ? "#c62828" : "#bdbdbd", borderRadius: 2 }} />
                                       </View>
                                     </View>
                                   );
                                 })}
                               </View>`;

// 3. Daily Quiz active options map 3 closing
const target3 = `                                         <Text style={{ fontSize: 13, color: selected ? "#c62828" : darkMode ? "#e0e0e0" : "#212121", flex: 1, fontWeight: selected ? "bold" : "normal" }}>{opt}</Text>
                                       </TouchableOpacity>
                                     );
                                 </View>`;

const replacement3 = `                                         <Text style={{ fontSize: 13, color: selected ? "#c62828" : darkMode ? "#e0e0e0" : "#212121", flex: 1, fontWeight: selected ? "bold" : "normal" }}>{opt}</Text>
                                       </TouchableOpacity>
                                     );
                                   })}
                                 </View>`;

let count = 0;
if (content.includes(target1)) { content = content.replace(target1, replacement1); console.log("Applied Fix 1"); count++; } else { console.error("Target 1 not found"); }
if (content.includes(target2)) { content = content.replace(target2, replacement2); console.log("Applied Fix 2"); count++; } else { console.error("Target 2 not found"); }
if (content.includes(target3)) { content = content.replace(target3, replacement3); console.log("Applied Fix 3"); count++; } else { console.error("Target 3 not found"); }

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Saved ${count} changes to App.tsx`);
}
