const fs = require('fs');
const path = require('path');
const appPath = path.join(process.cwd(), 'web_portal', 'App.tsx');
let originalContent = fs.readFileSync(appPath, 'utf8');

const regex = /<ScrollView horizontal showsHorizontalScrollIndicator=\{false\} contentContainerStyle=\{\{ paddingRight: 20, width: "100%" \}\}>.*?<\/ScrollView>/s;

const tabCode = `                             <View style={{ width: "100%", gap: 20 }}>
                               {/* Tab Bar */}
                               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                               <View style={{ flexDirection: "row", gap: 30, borderBottomWidth: 1, borderBottomColor: darkMode ? "#333" : "#ddd", paddingBottom: 0 }}>
                                 <TouchableOpacity onPress={() => setLiveClassesTab('upcoming')} style={{ paddingBottom: 10 }}>
                                   <Text style={{ fontSize: 15, fontWeight: "bold", color: liveClassesTab === 'upcoming' ? (darkMode ? "#fff" : "#000") : (darkMode ? "#888" : "#666") }}>
                                     Upcoming Classes ({upcomingSessions.length})
                                   </Text>
                                   {liveClassesTab === 'upcoming' && <View style={{ height: 3, backgroundColor: "#f59e0b", position: "absolute", bottom: -1.5, left: 0, right: 0, borderRadius: 2 }} />}
                                 </TouchableOpacity>

                                 <TouchableOpacity onPress={() => setLiveClassesTab('live')} style={{ paddingBottom: 10 }}>
                                   <Text style={{ fontSize: 15, fontWeight: "bold", color: liveClassesTab === 'live' ? (darkMode ? "#fff" : "#000") : (darkMode ? "#888" : "#666") }}>
                                     Live Now ({onLiveSessions.length})
                                   </Text>
                                   {liveClassesTab === 'live' && <View style={{ height: 3, backgroundColor: "#00e676", position: "absolute", bottom: -1.5, left: 0, right: 0, borderRadius: 2 }} />}
                                 </TouchableOpacity>

                                 <TouchableOpacity onPress={() => setLiveClassesTab('ended')} style={{ paddingBottom: 10 }}>
                                   <Text style={{ fontSize: 15, fontWeight: "bold", color: liveClassesTab === 'ended' ? (darkMode ? "#fff" : "#000") : (darkMode ? "#888" : "#666") }}>
                                     Ended Classes ({endedSessions.length})
                                   </Text>
                                   {liveClassesTab === 'ended' && <View style={{ height: 3, backgroundColor: "#c62828", position: "absolute", bottom: -1.5, left: 0, right: 0, borderRadius: 2 }} />}
                                 </TouchableOpacity>
                               </View>
                               </ScrollView>

                               {/* Tab Content */}
                               <View style={{ width: "100%" }}>
                                 {liveClassesTab === 'upcoming' && (
                                   <View style={{ gap: 12 }}>
                                     {upcomingSessions.length === 0 ? (
                                       <Text style={{ color: darkMode ? "#777" : "#aaa", fontStyle: "italic", marginTop: 10 }}>No upcoming classes.</Text>
                                     ) : (
                                       upcomingSessions.map(s => renderLiveClassCard(s))
                                     )}
                                   </View>
                                 )}

                                 {liveClassesTab === 'live' && (
                                   <View style={{ gap: 12 }}>
                                     {onLiveSessions.length === 0 ? (
                                       <Text style={{ color: darkMode ? "#777" : "#aaa", fontStyle: "italic", marginTop: 10 }}>No live classes currently.</Text>
                                     ) : (
                                       onLiveSessions.map(s => renderLiveClassCard(s))
                                     )}
                                   </View>
                                 )}

                                 {liveClassesTab === 'ended' && (
                                   <View style={{ gap: 12 }}>
                                     {endedSessions.length === 0 ? (
                                       <Text style={{ color: darkMode ? "#777" : "#aaa", fontStyle: "italic", marginTop: 10 }}>No ended classes.</Text>
                                     ) : (
                                       <View style={{ gap: 12 }}>
                                         {Array.from(endedCoursesMap.values()).map(courseNode => {
                                           const isCourseExpanded = expandedLiveCourses[courseNode.id] !== false;
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
                                                     const isSubjectExpanded = expandedLiveSubjects[subjectNode.id] !== false;
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
                                 )}
                               </View>
                             </View>`;

let newContent = originalContent.replace(regex, tabCode);

if (newContent === originalContent) {
    console.error("No replacement made. Regex didn't match.");
    process.exit(1);
}

fs.writeFileSync(appPath, newContent);
console.log('Successfully replaced column layout with tabs!');
