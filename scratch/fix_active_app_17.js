const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// 1. Close student fee summary block
const target1 = `                                  )}
                                </View>
                              );
                            })()}
                          </View>
                      {/* Admin Fee Summary Panel */}`;

const replacement1 = `                                  )}
                                </View>
                              );
                            })()}
                          </View>
                        </>
                      )}

                      {/* Admin Fee Summary Panel */}`;

// 2. Close admin fee summary panel block
const target2 = `                                })}
                            </ScrollView>
                          </View>
                      {(user.role !== "student" || displayFees.length > 0) && (`;

const replacement2 = `                                })}
                            </ScrollView>
                          </View>
                        </>
                      )}

                      {(user.role !== "student" || displayFees.length > 0) && (`;

let count = 0;
if (content.includes(target1)) { content = content.replace(target1, replacement1); console.log("Applied Fix 1"); count++; } else { console.error("Target 1 not found"); }
if (content.includes(target2)) { content = content.replace(target2, replacement2); console.log("Applied Fix 2"); count++; } else { console.error("Target 2 not found"); }

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Saved ${count} changes to App.tsx`);
}
