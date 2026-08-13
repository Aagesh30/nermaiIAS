const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// 1. credentials loop map closing
const target1 = `                          </View>
                        </TouchableOpacity>
                      );
                  </ScrollView>`;

const replacement1 = `                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>`;

// 2. authTab === "login" closing
const target2 = `                    </View>
                  </View>

                  {/* Guest Login shortcut */}
                  <TouchableOpacity`;

const replacement2 = `                    </View>
                  </View>
                </>
              )}

                  {/* Guest Login shortcut */}
                  <TouchableOpacity`;

// 3. authTab === "guest" closing
const target3 = `                    <Text style={{ color: "#757575", fontSize: 13, textDecorationLine: "underline" }}>
                      Back to Sign In
                    </Text>
                  </TouchableOpacity>
            </View>
          </ScrollView>`;

const replacement3 = `                    <Text style={{ color: "#757575", fontSize: 13, textDecorationLine: "underline" }}>
                      Back to Sign In
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>`;

let count = 0;
if (content.includes(target1)) { content = content.replace(target1, replacement1); console.log("Applied Fix 1"); count++; } else { console.error("Target 1 not found"); }
if (content.includes(target2)) { content = content.replace(target2, replacement2); console.log("Applied Fix 2"); count++; } else { console.error("Target 2 not found"); }
if (content.includes(target3)) { content = content.replace(target3, replacement3); console.log("Applied Fix 3"); count++; } else { console.error("Target 3 not found"); }

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Saved ${count} changes to App.tsx`);
}
