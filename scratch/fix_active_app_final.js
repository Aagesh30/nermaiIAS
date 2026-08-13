const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// 1. Line 9806 map closing
const target1 = `                          <Text style={{ fontSize: 11, color: "#757575" }}>
                            {Math.round(entry.percentage)}%
                          </Text>
                        </View>
                      </View>
                    );
                </View>`;

const replacement1 = `                          <Text style={{ fontSize: 11, color: "#757575" }}>
                            {Math.round(entry.percentage)}%
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>`;

// 2. Line 9906 map closing
const target2 = `                              {cell.day}
                            </Text>
                          </TouchableOpacity>
                        );
                    </View>`;

const replacement2 = `                              {cell.day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>`;

// 3. Line 10012 onChangeText totalFees
const target3 = `                    value={feeEditStudent.totalFees !== undefined ? String(feeEditStudent.totalFees) : ""}
                    onChangeText={v => setFeeEditStudent({ ...feeEditStudent, totalFees: v
                    keyboardType="numeric"`;

const replacement3 = `                    value={feeEditStudent.totalFees !== undefined ? String(feeEditStudent.totalFees) : ""}
                    onChangeText={v => setFeeEditStudent({ ...feeEditStudent, totalFees: v })}
                    keyboardType="numeric"`;

// 4. Line 10024 onChangeText feesPaid
const target4 = `                    value={feeEditStudent.feesPaid !== undefined ? String(feeEditStudent.feesPaid) : ""}
                    onChangeText={v => setFeeEditStudent({ ...feeEditStudent, feesPaid: v
                    keyboardType="numeric"`;

const replacement4 = `                    value={feeEditStudent.feesPaid !== undefined ? String(feeEditStudent.feesPaid) : ""}
                    onChangeText={v => setFeeEditStudent({ ...feeEditStudent, feesPaid: v })}
                    keyboardType="numeric"`;

let count = 0;
if (content.includes(target1)) { content = content.replace(target1, replacement1); console.log("Applied Fix 1"); count++; } else { console.error("Target 1 not found"); }
if (content.includes(target2)) { content = content.replace(target2, replacement2); console.log("Applied Fix 2"); count++; } else { console.error("Target 2 not found"); }
if (content.includes(target3)) { content = content.replace(target3, replacement3); console.log("Applied Fix 3"); count++; } else { console.error("Target 3 not found"); }
if (content.includes(target4)) { content = content.replace(target4, replacement4); console.log("Applied Fix 4"); count++; } else { console.error("Target 4 not found"); }

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Saved ${count} changes to App.tsx`);
}
