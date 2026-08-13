const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// 1. Bulk target group choices map closing
const target1 = `                                    <Text style={{ color: isSel ? "#fff" : "#616161", fontWeight: "bold", fontSize: 10, textAlign: "center" }}>{t.label}</Text>
                                  </TouchableOpacity>
                                );
                            </View>`;

const replacement1 = `                                    <Text style={{ color: isSel ? "#fff" : "#616161", fontWeight: "bold", fontSize: 10, textAlign: "center" }}>{t.label}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>`;

// 2. Bulk target group === paid fragment closing
const target2 = `                                      });
                                    })()}
                                  </ScrollView>
                            </View>
                        )}`

const replacement2 = `                                      });
                                    })()}
                                  </ScrollView>
                                </>
                              )}
                            </View>
                        )}`;

// 3. erpSub === id-card fragment and conditional closing
const target3 = `                          </View>
                        );
                      })()
                    )}
                {erpSub === "analytics" && (() => {`;

const replacement3 = `                          </View>
                        );
                      })()
                    )}
                  </>
                )}

                {erpSub === "analytics" && (() => {`;

let count = 0;
if (content.includes(target1)) { content = content.replace(target1, replacement1); console.log("Applied Fix 1"); count++; } else { console.error("Target 1 not found"); }
if (content.includes(target2)) { content = content.replace(target2, replacement2); console.log("Applied Fix 2"); count++; } else { console.error("Target 2 not found"); }
if (content.includes(target3)) { content = content.replace(target3, replacement3); console.log("Applied Fix 3"); count++; } else { console.error("Target 3 not found"); }

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Saved ${count} changes to App.tsx`);
}
