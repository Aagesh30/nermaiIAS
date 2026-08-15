const test = async () => {
  // Login as admin
  const adminLogin = await fetch('https://nermaiiasacademy-519c8.web.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@nermai.com', password: 'nermaiadmin@unistrix' })
  });
  const adminData = await adminLogin.json();
  if (!adminData.data?.token) { console.log('Admin login failed:', adminData); return; }
  const token = adminData.data.token;
  const adminHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  console.log('--- ADMIN SIDE LMS ENDPOINTS AUDIT ---');

  // 1. Get Courses
  const getCourses = await fetch('https://nermaiiasacademy-519c8.web.app/api/courses', { headers: adminHeaders });
  console.log('GET /courses:', getCourses.status);

  // 2. Get Subjects
  const getSubjects = await fetch('https://nermaiiasacademy-519c8.web.app/api/subjects', { headers: adminHeaders });
  console.log('GET /subjects:', getSubjects.status);

  // 3. Get Topics
  const getTopics = await fetch('https://nermaiiasacademy-519c8.web.app/api/topics', { headers: adminHeaders });
  console.log('GET /topics:', getTopics.status);

  // 4. Get Classes
  const getClasses = await fetch('https://nermaiiasacademy-519c8.web.app/api/classes', { headers: adminHeaders });
  console.log('GET /classes:', getClasses.status);

  // 5. Get LMS Resources
  const getResources = await fetch('https://nermaiiasacademy-519c8.web.app/api/resources', { headers: adminHeaders });
  console.log('GET /resources:', getResources.status);

  // 6. Get Live Sessions
  const getLiveSessions = await fetch('https://nermaiiasacademy-519c8.web.app/api/live-sessions', { headers: adminHeaders });
  console.log('GET /live-sessions:', getLiveSessions.status);

  // 7. Get Daily Content
  const getDailyContent = await fetch('https://nermaiiasacademy-519c8.web.app/api/lms/daily-content', { headers: adminHeaders });
  console.log('GET /lms/daily-content:', getDailyContent.status);

  // 8. Get Provider Accounts
  const getProviders = await fetch('https://nermaiiasacademy-519c8.web.app/api/providers/accounts', { headers: adminHeaders });
  console.log('GET /providers/accounts:', getProviders.status);

  // 9. Get LMS Announcements
  const getAnnouncements = await fetch('https://nermaiiasacademy-519c8.web.app/api/announcements', { headers: adminHeaders });
  console.log('GET /announcements:', getAnnouncements.status);

  // 10. Get Access Rules Templates
  const getAccessRules = await fetch('https://nermaiiasacademy-519c8.web.app/api/access-rules/admin/templates', { headers: adminHeaders });
  console.log('GET /access-rules/admin/templates:', getAccessRules.status);

  // 11. Get Knowledge Base Settings
  const getKb = await fetch('https://nermaiiasacademy-519c8.web.app/api/knowledge-base/settings', { headers: adminHeaders });
  console.log('GET /knowledge-base/settings:', getKb.status);

  // 12. Get Daily Quiz list
  const getDailyQuizzes = await fetch('https://nermaiiasacademy-519c8.web.app/api/lms/daily-quiz/all?studentId=super_admin_root', { headers: adminHeaders });
  console.log('GET /lms/daily-quiz/all:', getDailyQuizzes.status);
};
test().catch(console.error);
