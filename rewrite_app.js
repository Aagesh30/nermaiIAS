const fs = require('fs');
const path = require('path');
const appPath = path.join(process.cwd(), 'web_portal', 'App.tsx');
let originalContent = fs.readFileSync(appPath, 'utf8');
let content = originalContent.replace(/\r\n/g, '\n');

const startMarker = `                    ) : (
                      <View style={{ gap: 12 }}>
                        {lmsLiveSessions.map((session: any) => {`;
const startIdx = content.indexOf(startMarker);

if (startIdx === -1) {
  console.error("Start marker not found!");
  process.exit(1);
}

const endMarker = `                          );
                        })}
                      </View>
                    )}
                  </View>
                )}

                {/* ── LMS Recorded Classes Tab`;
const endIdx = content.indexOf(endMarker, startIdx);

if (endIdx === -1) {
  console.error("End marker not found!");
  process.exit(1);
}

const innerContent = content.substring(startIdx + startMarker.length, endIdx + `                          );`.length);

const renderLiveClassCardCode = `
                        {(() => {
                           const upcomingSessions: any[] = [];
                           const onLiveSessions: any[] = [];
                           const endedSessions: any[] = [];

                           lmsLiveSessions.forEach((session: any) => {
                             const sessionStatus = session.status || 'scheduled';
                             const scheduledTimeObj = session.scheduledStartTime
                               ? new Date(session.scheduledStartTime._seconds ? session.scheduledStartTime._seconds * 1000 : session.scheduledStartTime)
                               : null;
                             const startTimeMs = scheduledTimeObj ? scheduledTimeObj.getTime() : 0;
                             const durationMins = session.expectedDurationMinutes || session.liveSession?.expectedDurationMinutes || 60;
                             const endTimeMs = startTimeMs + durationMins * 60 * 1000;
                             const isExpired = startTimeMs > 0 && Date.now() > endTimeMs;

                             const isEnded = sessionStatus === 'ENDED' || sessionStatus === 'CANCELLED' || sessionStatus === 'EXPIRED' || sessionStatus === 'ARCHIVED';
                             if (isExpired && isEnded) {
                               return; 
                             }
                             const isLive = !isEnded && (sessionStatus === 'live' || sessionStatus === 'active' || sessionStatus === 'in_progress' || sessionStatus === 'LIVE' || sessionStatus === 'JOINING' || sessionStatus === 'HOST_CONNECTED' || sessionStatus === 'ATTENDANCE_RUNNING');

                             if (isEnded) endedSessions.push(session);
                             else if (isLive) onLiveSessions.push(session);
                             else upcomingSessions.push(session);
                           });

                           const renderLiveClassCard = (session: any, topicTitle?: string) => {` + innerContent + `
                           };

                           const endedCoursesMap = new Map();
                           const endedUnassigned: any[] = [];
                           
                           endedSessions.forEach((cls: any) => {
                             const courseId = typeof cls.courseId === 'object' ? (cls.courseId?.id || cls.courseId?._id) : cls.courseId;
                             const subjectId = typeof cls.subjectId === 'object' ? (cls.subjectId?.id || cls.subjectId?._id) : cls.subjectId;
                             const topicId = typeof cls.topicId === 'object' ? (cls.topicId?.id || cls.topicId?._id) : cls.topicId;
                         
                             if (!courseId) {
                               endedUnassigned.push(cls);
                               return;
                             }
                         
                             if (!endedCoursesMap.has(courseId)) {
                               const c = lmsCourses.find((x:any) => x.id === courseId || x._id === courseId);
                               endedCoursesMap.set(courseId, {
                                 id: courseId,
                                 title: c?.title || c?.name || 'Unknown Course',
                                 subjects: new Map()
                               });
                             }
                         
                             const courseNode = endedCoursesMap.get(courseId);
                         
                             let finalSubjectId = subjectId || 'unassigned_subject';
                             if (!courseNode.subjects.has(finalSubjectId)) {
                               const s = lmsSubjects.find((x:any) => x.id === finalSubjectId || x._id === finalSubjectId);
                               courseNode.subjects.set(finalSubjectId, {
                                 id: finalSubjectId,
                                 title: finalSubjectId === 'unassigned_subject' ? 'Unassigned Subject' : (s?.title || s?.name || 'Unknown Subject'),
                                 topics: new Map()
                               });
                             }
                         
                             const subjectNode = courseNode.subjects.get(finalSubjectId);
                         
                             let finalTopicId = topicId || 'unassigned_topic';
                             if (!subjectNode.topics.has(finalTopicId)) {
                               const t = lmsTopics.find((x:any) => x.id === finalTopicId || x._id === finalTopicId);
                               subjectNode.topics.set(finalTopicId, {
                                 id: finalTopicId,
                                 title: finalTopicId === 'unassigned_topic' ? 'Unassigned Topic' : (t?.title || t?.name || 'Unknown Topic'),
                                 classes: []
                               });
                             }
                         
                             subjectNode.topics.get(finalTopicId).classes.push(cls);
                           });

                           return (
                             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20, width: "100%" }}>
                               <View style={{ flexDirection: isMobile ? "column" : "row", gap: 20, alignItems: "flex-start", width: isMobile ? "100%" : "auto" }}>
                                 {/* Column 1: Upcoming */}
                                 <View style={{ gap: 12, width: isMobile ? "100%" : 350, maxWidth: isMobile ? "100%" : 350 }}>
                                   <Text style={{ fontSize: 15, fontWeight: "bold", color: darkMode ? "#fff" : "#212121", borderBottomWidth: 3, borderBottomColor: "#f59e0b", paddingBottom: 6, marginBottom: 4 }}>Upcoming Classes ({upcomingSessions.length})</Text>
                                   {upcomingSessions.length === 0 ? (
                                     <Text style={{ color: darkMode ? "#777" : "#aaa", fontStyle: "italic", marginTop: 10 }}>No upcoming classes.</Text>
                                   ) : (
                                     upcomingSessions.map(s => renderLiveClassCard(s))
                                   )}
                                 </View>

                                 {/* Column 2: On Live */}
                                 <View style={{ gap: 12, width: isMobile ? "100%" : 350, maxWidth: isMobile ? "100%" : 350 }}>
                                   <Text style={{ fontSize: 15, fontWeight: "bold", color: darkMode ? "#fff" : "#212121", borderBottomWidth: 3, borderBottomColor: "#00e676", paddingBottom: 6, marginBottom: 4 }}>Live Now ({onLiveSessions.length})</Text>
                                   {onLiveSessions.length === 0 ? (
                                     <Text style={{ color: darkMode ? "#777" : "#aaa", fontStyle: "italic", marginTop: 10 }}>No live classes currently.</Text>
                                   ) : (
                                     onLiveSessions.map(s => renderLiveClassCard(s))
                                   )}
                                 </View>

                                 {/* Column 3: Ended */}
                                 <View style={{ gap: 12, width: isMobile ? "100%" : 400, maxWidth: isMobile ? "100%" : 450 }}>
                                   <Text style={{ fontSize: 15, fontWeight: "bold", color: darkMode ? "#fff" : "#212121", borderBottomWidth: 3, borderBottomColor: "#c62828", paddingBottom: 6, marginBottom: 4 }}>Ended Classes ({endedSessions.length})</Text>
                                   
                                   {endedSessions.length === 0 ? (
                                     <Text style={{ color: darkMode ? "#777" : "#aaa", fontStyle: "italic", marginTop: 10 }}>No ended classes.</Text>
                                   ) : (
                                     <View style={{ gap: 12 }}>
                                       {Array.from(endedCoursesMap.values()).map(courseNode => {
                                         const isCourseExpanded = expandedLiveCourses[courseNode.id] !== false; // Default true
                                         return (
                                           <View key={courseNode.id} style={{ gap: 12 }}>
                                             <TouchableOpacity 
                                               onPress={() => setExpandedLiveCourses(prev => ({ ...prev, [courseNode.id]: !isCourseExpanded }))}
                                               style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: darkMode ? "#1a1a1a" : "#eee", padding: 12, borderRadius: 8 }}
                                             >
                                               <Text style={{ fontSize: 14, fontWeight: "bold", color: darkMode ? "#fff" : "#333" }}>📚 {courseNode.title}</Text>
                                               <Ionicons name={isCourseExpanded ? "chevron-up" : "chevron-down"} size={20} color={darkMode ? "#ccc" : "#666"} />
                                             </TouchableOpacity>

                                             {isCourseExpanded && (
                                               <View style={{ paddingLeft: 12, gap: 12, borderLeftWidth: 2, borderLeftColor: darkMode ? "#333" : "#ddd", marginLeft: 6 }}>
                                                 {Array.from(courseNode.subjects.values()).map((subjectNode: any) => {
                                                   const isSubjectExpanded = expandedLiveSubjects[subjectNode.id] !== false; // Default true
                                                   return (
                                                     <View key={subjectNode.id} style={{ gap: 12 }}>
                                                       <TouchableOpacity 
                                                         onPress={() => setExpandedLiveSubjects(prev => ({ ...prev, [subjectNode.id]: !isSubjectExpanded }))}
                                                         style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: darkMode ? "#222" : "#f5f5f5", padding: 10, borderRadius: 8 }}
                                                       >
                                                         <Text style={{ fontSize: 13, fontWeight: "bold", color: darkMode ? "#ddd" : "#444" }}>📘 {subjectNode.title}</Text>
                                                         <Ionicons name={isSubjectExpanded ? "chevron-up" : "chevron-down"} size={18} color={darkMode ? "#ccc" : "#666"} />
                                                       </TouchableOpacity>

                                                       {isSubjectExpanded && (
                                                         <View style={{ paddingLeft: 12, paddingTop: 10 }}>
                                                           <View style={{ gap: 12 }}>
                                                             {Array.from(subjectNode.topics.values()).flatMap((topicNode: any) => 
                                                               topicNode.classes.map((cls: any) => (
                                                                 <View key={cls.id || cls._id} style={{ padding: 8, backgroundColor: darkMode ? "#1c1c1c" : "#fff", borderRadius: 8, borderWidth: 1, borderColor: darkMode ? "#333" : "#ddd" }}>
                                                                   <Text style={{ fontSize: 11, color: "#c62828", fontWeight: "bold", marginBottom: 4 }}>{topicNode.title}</Text>
                                                                   {renderLiveClassCard(cls, topicNode.title)}
                                                                 </View>
                                                               ))
                                                             )}
                                                           </View>
                                                         </View>
                                                       )}
                                                     </View>
                                                   );
                                                 })}
                                               </View>
                                             )}
                                           </View>
                                         );
                                       })}

                                       {endedUnassigned.length > 0 && (
                                         <View style={{ gap: 12 }}>
                                           <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: darkMode ? "#1a1a1a" : "#eee", padding: 12, borderRadius: 8 }}>
                                             <Text style={{ fontSize: 14, fontWeight: "bold", color: darkMode ? "#fff" : "#333" }}>❓ Unassigned Classes</Text>
                                           </View>
                                           <View style={{ gap: 12 }}>
                                             {endedUnassigned.map((cls: any) => renderLiveClassCard(cls))}
                                           </View>
                                         </View>
                                       )}
                                     </View>
                                   )}
                                 </View>

                               </View>
                             </ScrollView>
                           );
                        })()}
`;

const newContent = content.substring(0, startIdx) + `                    ) : (
                      <View style={{ gap: 12 }}>` + renderLiveClassCardCode + `
                      </View>
                    )}
                  </View>
                )}

                {/* ── LMS Recorded Classes Tab` + content.substring(endIdx + endMarker.length - `                {/* ── LMS Recorded Classes Tab`.length);

// Restore line endings back to how they were if needed, though \n should be fine.
fs.writeFileSync(appPath, newContent);
console.log('App.tsx successfully updated.');
