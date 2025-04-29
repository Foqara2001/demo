// Admin Functions
async function loadAdminPage() {
  try {
    const user = auth.currentUser;
    if (!user) return showPage('home');
    const userData = await get(child(dbRef, `users/${user.uid}`));
    if (!userData.exists() || !userData.val().isAdmin) return showPage('home');
    
    document.getElementById('admin-page').innerHTML = `
      <div class="admin-content">
        <h2>لوحة التحكم</h2>
        <div class="admin-grid">
          <div class="admin-card">
            <h3>إدارة الموارد</h3>
            <select id="resource-type" class="form-input">
              <option value="prayers">أذكار وأدعية</option>
              <option value="quran">تلاوات قرآنية</option>
              <option value="lessons">دروس ومحاضرات</option>
            </select>
            <input type="text" id="resource-title" placeholder="العنوان" class="form-input">
            <input type="text" id="resource-url" placeholder="الرابط" class="form-input">
            <button onclick="addResource()" class="primary-btn">إضافة</button>
            <div id="resource-message" class="message"></div>
          </div>
          <div class="admin-card">
            <h3>إحصائيات المستخدمين</h3>
            <div id="user-stats" class="stats-grid"></div>
          </div>
        </div>
        <div class="admin-actions">
          <button id="export-btn" onclick="exportData()" class="secondary-btn">تصدير البيانات</button>
          <input type="file" id="import-file" accept=".json" style="display:none;">
          <button id="import-btn" onclick="document.getElementById('import-file').click()" class="secondary-btn">استيراد البيانات</button>
        </div>
      </div>
    `;
    
    document.getElementById('import-file').addEventListener('change', handleImport);
    await loadUserStats();
  } catch (error) {
    console.error('Admin page error:', error);
    showAlert('حدث خطأ في تحميل لوحة التحكم', 'error');
  }
}

async function addResource() {
  const type = document.getElementById('resource-type').value;
  const title = document.getElementById('resource-title').value.trim();
  const url = document.getElementById('resource-url').value.trim();
  const messageEl = document.getElementById('resource-message');

  if (!title || !url) return showMessage('الرجاء إدخال العنوان والرابط', 'error', messageEl);
  if (!isValidUrl(url)) return showMessage('الرجاء إدخال رابط صحيح', 'error', messageEl);

  try {
    const newResourceRef = push(ref(db, `resources/${type}`));
    await set(newResourceRef, { title, url, createdAt: new Date().toISOString(), addedBy: auth.currentUser.uid });
    showMessage('تمت الإضافة بنجاح', 'success', messageEl);
    document.getElementById('resource-title').value = '';
    document.getElementById('resource-url').value = '';
    loadResources();
  } catch (error) {
    console.error('Add resource error:', error);
    showMessage('حدث خطأ أثناء الإضافة', 'error', messageEl);
  }
}

async function loadUserStats() {
  try {
    const [usersSnap, trackerSnap] = await Promise.all([
      get(ref(db, 'users')),
      get(ref(db, 'tracker'))
    ]);
    
    const users = usersSnap.val() || {};
    const tracker = trackerSnap.val() || {};
    const today = new Date().toLocaleDateString('ar-EG');
    
    const stats = {
      totalUsers: Object.keys(users).length,
      activeUsers: Object.keys(tracker).length,
      todayRegistrations: Object.values(users).filter(u => u.joinDate === today).length,
      admins: Object.values(users).filter(u => u.isAdmin).length,
      avgCompletion: calculateAvgCompletion(tracker)
    };

    document.getElementById('user-stats').innerHTML = `
      <div class="stat-card"><h4>المستخدمون</h4><p>${stats.totalUsers}</p></div>
      <div class="stat-card"><h4>النشطون</h4><p>${stats.activeUsers}</p></div>
      <div class="stat-card"><h4>المسجلون اليوم</h4><p>${stats.todayRegistrations}</p></div>
      <div class="stat-card"><h4>المشرفون</h4><p>${stats.admins}</p></div>
      <div class="stat-card"><h4>متوسط الإنجاز</h4><p>${stats.avgCompletion}%</p></div>
    `;
  } catch (error) {
    console.error('Stats error:', error);
    showAlert('حدث خطأ في تحميل الإحصائيات', 'error');
  }
}

function calculateAvgCompletion(tracker) {
  const completions = Object.values(tracker).map(userDays => {
    const completed = Object.values(userDays).filter(day => Object.values(day).every(Boolean)).length;
    return (completed / 30) * 100;
  });
  return completions.length ? Math.round(completions.reduce((a, b) => a + b, 0) / completions.length) : 0;
}

async function exportData() {
  try {
    document.getElementById('export-btn').disabled = true;
    const [users, tracker, resources] = await Promise.all([
      get(ref(db, 'users')).then(s => s.val() || {}),
      get(ref(db, 'tracker')).then(s => s.val() || {}),
      get(ref(db, 'resources')).then(s => s.val() || {})
    ]);
    
    const blob = new Blob([JSON.stringify({ users, tracker, resources }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ramadan-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
    showAlert('تم التصدير بنجاح', 'success');
  } catch (error) {
    console.error('Export error:', error);
    showAlert('حدث خطأ أثناء التصدير', 'error');
  } finally {
    document.getElementById('export-btn').disabled = false;
  }
}

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    document.getElementById('import-btn').disabled = true;
    const data = JSON.parse(await file.text());
    
    if (!data.users || !data.tracker || !data.resources) {
      throw new Error('هيكلة الملف غير صالحة');
    }
    
    await Promise.all([
      batchSetData('users', data.users),
      batchSetData('tracker', data.tracker),
      batchSetData('resources', data.resources)
    ]);
    
    showAlert('تم الاستيراد بنجاح', 'success');
    setTimeout(() => location.reload(), 1000);
  } catch (error) {
    console.error('Import error:', error);
    showAlert(`خطأ في الاستيراد: ${error.message}`, 'error');
  } finally {
    event.target.value = '';
    document.getElementById('import-btn').disabled = false;
  }
}

async function batchSetData(path, data) {
  const batchSize = 50;
  const entries = Object.entries(data);
  
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    await Promise.all(batch.map(([key, value]) => set(ref(db, `${path}/${key}`), value)));
  }
}

// Helper functions
function showMessage(text, type, element) {
  element.textContent = text;
  element.className = `message ${type}`;
  setTimeout(() => element.textContent = '', 3000);
}

function showAlert(text, type) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = text;
  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), 5000);
}

function isValidUrl(url) {
  try { return Boolean(new URL(url)); } catch { return false; }
}

// Make functions available globally
window.loadAdminPage = loadAdminPage;
window.addResource = addResource;
window.exportData = exportData;