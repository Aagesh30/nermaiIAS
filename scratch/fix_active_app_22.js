const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// 1. LMS Map 1
const target1 = `                                  </View>
                                );
                            </View>`;

const replacement1 = `                                  </View>
                                );
                              })}
                            </View>`;

// 2. LMS Map 2
const target2 = `                                    </View>
                                  );
                              </View>`;

const replacement2 = `                                    </View>
                                  );
                                })}
                              </View>`;

// 3. LMS Map 3
const target3 = `                                      </TouchableOpacity>
                                    );
                                </View>`;

const replacement3 = `                                      </TouchableOpacity>
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
