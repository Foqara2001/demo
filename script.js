// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAu_GIcdkekULGpgdi3PJU05e8LdaLC2JM",
  authDomain: "prayertracker-db2f2.firebaseapp.com",
  databaseURL: "https://prayertracker-db2f2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "prayertracker-db2f2",
  storageBucket: "prayertracker-db2f2.appspot.com",
  messagingSenderId: "152895762913",
  appId: "1:152895762913:web:61abae5e6d687b411262a0",
  measurementId: "G-1T0ZZDPLQ1"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// DOM Elements
const calendar = document.getElementById("calendar");
const trackerContainer = document.getElementById("tracker-container");
const trackerTitle = document.getElementById("tracker-title");
const trackerContent = document.getElementById("tracker-content");
const dayProgressBar = document.getElementById("day-progress-bar");

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  // Set current year in footer
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
  
  // Set Ramadan date
  setRamadanDate();
  
  // Load resources
  loadResources();
  
  // Check auth status
  checkAuthStatus();
  
  // Initialize with home page
  showPage('home');
});

// Set Ramadan date display
function setRamadanDate() {
  const ramadanDateElement = document.getElementById('ramadan-date');
  if (!ramadanDateElement) return;

  const ramadanStart = new Date();
  ramadanStart.setMonth(2); // March (0-indexed)
  ramadanStart.setDate(22); // Example start date
  
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const endDate = new Date(ramadanStart);
  endDate.setDate(ramadanStart.getDate() + 29);
  
  const dateStr = `رمضان ${ramadanStart.toLocaleDateString('ar-EG', options)} - ${endDate.toLocaleDateString('ar-EG', options)}`;
  ramadanDateElement.textContent = dateStr;
}

// Page Navigation
function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('[id$="-page"]').forEach(page => {
    if (page) page.style.display = 'none';
  });
  
  // Show requested page
  const page = document.getElementById(`${pageId}-page`);
  if (page) {
    page.style.display = 'block';
  }
  
  // Special page handling
  if (pageId === 'tracker') {
    generateCalendar();
  } else if (pageId === 'profile') {
    loadProfilePage();
  } else if (pageId === 'admin') {
    loadAdminPage();
  } else if (pageId === 'resources') {
    loadResources();
  }
}

// Calendar and Tracker Functions
function generateCalendar() {
  if (!calendar) return;
  
  calendar.innerHTML = '';
  const daysInMonth = 30;
  const currentDay = getCurrentRamadanDay();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement("div");
    dayElement.className = "day";
    dayElement.innerText = `اليوم ${day}`;
    
    // Highlight current day
    if (day === currentDay) {
      dayElement.style.border = "2px solid var(--secondary-color)";
    }
    
    dayElement.onclick = () => openTracker(day);
    calendar.appendChild(dayElement);
    updateDayStyle(dayElement, day);
  }
}

function getCurrentRamadanDay() {
  return 10; // Example day
}

function openTracker(day) {
  const user = auth.currentUser;
  if (!user) {
    alert('الرجاء تسجيل الدخول لتسجيل متابعتك');
    toggleAuthModal();
    return;
  }
  
  if (!trackerTitle || !trackerContent) return;
  
  trackerTitle.innerText = `اليوم ${day}`;
  const template = document.getElementById("template-content");
  if (template) {
    trackerContent.innerHTML = template.innerHTML;
  }
  
  // Load saved data for this day
  database.ref(`users/${user.uid}/tracker/day${day}`).once('value').then((snapshot) => {
    const dayData = snapshot.val() || {};
    
    trackerContent.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
      const task = checkbox.getAttribute("data-task");
      checkbox.checked = dayData[task] || false;
      
      checkbox.onchange = () => {
        const updates = {};
        updates[`users/${user.uid}/tracker/day${day}/${task}`] = checkbox.checked;
        database.ref().update(updates)
          .then(() => {
            const dayElement = document.querySelector(`.day:nth-child(${day})`);
            if (dayElement) updateDayStyle(dayElement, day);
            updateDayProgressBar(day);
          })
          .catch((error) => {
            console.error("Error updating task:", error);
          });
      };
    });
    
    updateDayProgressBar(day);
  }).catch((error) => {
    console.error("Error loading tracker data:", error);
  });
  
  if (trackerContainer) trackerContainer.style.display = "block";
}

function updateDayProgressBar(day) {
  const user = auth.currentUser;
  if (!user || !dayProgressBar) return;
  
  database.ref(`users/${user.uid}/tracker/day${day}`).once('value').then((snapshot) => {
    const dayData = snapshot.val() || {};
    const tasks = [
      "fajr", "dhuhr", "asr", "maghrib", "isha",
      "ghiba", "kazb", "kalam", "juz", "hizb",
      "rahm", "saim", "gedal", "eslah",
      "taraweh", "dohaw", "etkaf"
    ];
    
    const completedTasks = tasks.filter(task => dayData[task]).length;
    const progress = (completedTasks / tasks.length) * 100;
    dayProgressBar.style.width = `${progress}%`;
    
    // Update progress bar color
    if (progress < 25) {
      dayProgressBar.style.backgroundColor = "red";
    } else if (progress >= 25 && progress < 50) {
      dayProgressBar.style.backgroundColor = "orange";
    } else if (progress >= 50 && progress < 75) {
      dayProgressBar.style.backgroundColor = "yellow";
    } else if (progress >= 75 && progress < 99) {
      dayProgressBar.style.backgroundColor = "lightgreen";
    } else {
      dayProgressBar.style.backgroundColor = "darkgreen";
    }
  });
}

function updateDayStyle(dayElement, day) {
  const user = auth.currentUser;
  if (!user || !dayElement) return;
  
  database.ref(`users/${user.uid}/tracker/day${day}`).once('value').then((snapshot) => {
    const dayData = snapshot.val() || {};
    const tasks = [
      "fajr", "dhuhr", "asr", "maghrib", "isha",
      "ghiba", "kazb", "kalam", "juz", "hizb",
      "rahm", "saim", "gedal", "eslah",
      "taraweh", "dohaw", "etkaf"
    ];
    
    const completedTasks = tasks.filter(task => dayData[task]).length;
    const progress = (completedTasks / tasks.length) * 100;

    // Update background color
    if (progress < 25) {
      dayElement.style.backgroundColor = "red";
    } else if (progress >= 25 && progress < 50) {
      dayElement.style.backgroundColor = "orange";
    } else if (progress >= 50 && progress < 75) {
      dayElement.style.backgroundColor = "yellow";
    } else if (progress >= 75 && progress < 99) {
      dayElement.style.backgroundColor = "lightgreen";
    } else {
      dayElement.style.backgroundColor = "darkgreen";
    }

    // Mark as completed if all tasks are finished
    const allTasksCompleted = tasks.every(task => dayData[task]);
    if (allTasksCompleted) {
      dayElement.classList.add("completed");
    } else {
      dayElement.classList.remove("completed");
    }
  });
}

function goBack() {
  if (trackerContainer) trackerContainer.style.display = "none";
}

// Resources Functions
function loadResources() {
  // Load from Firebase
  database.ref('resources').once('value').then((snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      displayResources(data.prayers, 'prayers-resources');
      displayResources(data.quran, 'quran-resources');
      displayResources(data.lessons, 'lessons-resources');
    } else {
      // If no data in Firebase, load default resources
      loadDefaultResources();
    }
  }).catch((error) => {
    console.error("Error loading resources:", error);
    loadDefaultResources();
  });
}

function displayResources(resources, elementId) {
  const container = document.getElementById(elementId);
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!resources) return;
  
  Object.values(resources).forEach(resource => {
    if (resource && resource.url && resource.title) {
      const li = document.createElement('li');
      li.innerHTML = `<a href="${resource.url}" target="_blank">${resource.title}</a>`;
      container.appendChild(li);
    }
  });
}

function loadDefaultResources() {
  const defaultResources = {
    prayers: {
      1: { title: "الأذكار الموسمية", url: "https://d1.islamhouse.com/data/ar/ih_books/single/ar_athkar_almushafiah.pdf" },
      2: { title: "أدعية رمضان", url: "https://ar.islamway.net/collection/4746/%D8%A3%D8%AF%D8%B9%D9%8A%D8%A9-%D8%B1%D9%85%D8%B6%D8%A7%D9%86" }
    },
    quran: {
      1: { title: "القرآن الكريم بقراءات متعددة", url: "https://quran.ksu.edu.sa/" },
      2: { title: "تلاوات للقراء المشهورين", url: "https://server.mp3quran.net/" }
    },
    lessons: {
      1: { title: "دروس رمضانية", url: "https://ar.islamway.net/lessons?month=9" },
      2: { title: "سلسلة دروس رمضان", url: "https://www.youtube.com/playlist?list=PLxI8Ct9zH7e8jQ1uFQJiV1J3T1T1Z1Z1Z" }
    }
  };
  
  displayResources(defaultResources.prayers, 'prayers-resources');
  displayResources(defaultResources.quran, 'quran-resources');
  displayResources(defaultResources.lessons, 'lessons-resources');
}

// Authentication Functions
function checkAuthStatus() {
  auth.onAuthStateChanged((user) => {
    const authLink = document.getElementById('auth-link');
    const profileLink = document.getElementById('profile-link');
    const adminLink = document.getElementById('admin-link');
    
    if (user) {
      if (authLink) {
        authLink.textContent = 'تسجيل الخروج';
        authLink.onclick = logout;
      }
      if (profileLink) profileLink.style.display = 'block';
      
      // Set profile avatar
      const avatar = document.getElementById('profile-avatar');
      if (avatar) {
        avatar.textContent = user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase();
      }
      
      // Check if user is admin
      database.ref(`users/${user.uid}/isAdmin`).once('value').then((snapshot) => {
        if (adminLink) {
          adminLink.style.display = (snapshot.exists() && snapshot.val()) ? 'block' : 'none';
        }
      });
    } else {
      if (authLink) {
        authLink.textContent = 'تسجيل الدخول';
        authLink.onclick = toggleAuthModal;
      }
      if (profileLink) profileLink.style.display = 'none';
      if (adminLink) adminLink.style.display = 'none';
    }
  });
}

function toggleAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  
  if (modal.style.display === 'block') {
    modal.style.display = 'none';
  } else {
    modal.style.display = 'block';
    showLoginForm();
  }
}

function showLoginForm() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const emailField = document.getElementById('email');
  
  if (!loginForm || !registerForm) return;
  
  loginForm.style.display = 'block';
  registerForm.style.display = 'none';
  
  if (emailField) emailField.focus();
}

function showRegisterForm() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const usernameField = document.getElementById('reg-username');
  
  if (!loginForm || !registerForm) return;
  
  loginForm.style.display = 'none';
  registerForm.style.display = 'block';
  
  if (usernameField) usernameField.focus();
}

function closeModal() {
  const authModal = document.getElementById('auth-modal');
  const resetModal = document.getElementById('reset-modal');
  
  if (authModal) authModal.style.display = 'none';
  if (resetModal) resetModal.style.display = 'none';
}

function register() {
  const username = document.getElementById('reg-username')?.value.trim();
  const email = document.getElementById('reg-email')?.value.trim();
  const password = document.getElementById('reg-password')?.value;
  const confirmPassword = document.getElementById('reg-confirm-password')?.value;
  const message = document.getElementById('register-message');
  
  // Validation
  if (!username || !email || !password || !confirmPassword) {
    if (message) {
      message.textContent = 'الرجاء ملء جميع الحقول';
      message.className = 'message error';
    }
    return;
  }
  
  if (password !== confirmPassword) {
    if (message) {
      message.textContent = 'كلمة المرور غير متطابقة';
      message.className = 'message error';
    }
    return;
  }
  
  if (password.length < 6) {
    if (message) {
      message.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
      message.className = 'message error';
    }
    return;
  }
  
  // Create user with email and password
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      
      // Save additional user data to database
      return database.ref(`users/${user.uid}`).set({
        username: username,
        email: email,
        joinDate: new Date().toLocaleDateString('ar-EG'),
        isAdmin: false
      });
    })
    .then(() => {
      if (message) {
        message.textContent = 'تم إنشاء الحساب بنجاح!';
        message.className = 'message success';
      }
      
      setTimeout(() => {
        closeModal();
        checkAuthStatus();
        showPage('profile');
      }, 1000);
    })
    .catch((error) => {
      if (message) {
        const errorCode = error.code;
        let errorMessage = error.message;
        
        if (errorCode === 'auth/email-already-in-use') {
          errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
        } else if (errorCode === 'auth/invalid-email') {
          errorMessage = 'البريد الإلكتروني غير صالح';
        } else if (errorCode === 'auth/weak-password') {
          errorMessage = 'كلمة المرور ضعيفة';
        }
        
        message.textContent = errorMessage;
        message.className = 'message error';
      }
    });
}

function login() {
  // Safety check - verify elements exist
  const emailField = document.getElementById('email');
  const passwordField = document.getElementById('password');
  const message = document.getElementById('login-message'); // Add this line
  
  if (!emailField || !passwordField || !message) {
    console.error("Login form missing required fields");
    return; // Stop execution if elements don't exist
  }

  // Rest of your login code...
  const email = emailField.value.trim();
  const password = passwordField.value;
  
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      message.textContent = 'تم تسجيل الدخول بنجاح!';
      message.className = 'message success';
      
      setTimeout(() => {
        closeModal();
        checkAuthStatus();
        
        database.ref(`users/${userCredential.user.uid}/isAdmin`).once('value').then((snapshot) => {
          if (snapshot.exists() && snapshot.val()) {
            showPage('admin');
          } else {
            showPage('profile');
          }
        });
      }, 1000);
    })
    .catch((error) => {
      const errorCode = error.code;
      let errorMessage = error.message;
      
      if (errorCode === 'auth/user-not-found') {
        errorMessage = 'المستخدم غير موجود';
      } else if (errorCode === 'auth/wrong-password') {
        errorMessage = 'كلمة المرور غير صحيحة';
      } else if (errorCode === 'auth/invalid-email') {
        errorMessage = 'البريد الإلكتروني غير صالح';
      }
      
      message.textContent = errorMessage;
      message.className = 'message error';
    });
}

function logout() {
  auth.signOut()
    .then(() => {
      checkAuthStatus();
      showPage('home');
    })
    .catch((error) => {
      console.error('Error signing out:', error);
    });
}

// Profile Page Functions
function loadProfilePage() {
  const user = auth.currentUser;
  if (!user) {
    showPage('home');
    return;
  }
  
  // Get user data from database
  database.ref(`users/${user.uid}`).once('value').then((snapshot) => {
    const userData = snapshot.val();
    const usernameElement = document.getElementById('profile-username');
    const emailElement = document.getElementById('profile-email');
    const joinDateElement = document.getElementById('profile-join-date');
    const avatar = document.getElementById('profile-avatar');
    
    if (userData) {
      if (usernameElement) usernameElement.textContent = userData.username || user.email;
      if (emailElement) emailElement.textContent = user.email;
      if (joinDateElement) joinDateElement.textContent = userData.joinDate || 'غير معروف';
      if (avatar) avatar.textContent = (userData.username || user.email).charAt(0).toUpperCase();
    }
    
    // Calculate remaining days
    const remainingDaysElement = document.getElementById('remaining-days');
    if (remainingDaysElement) {
      const currentDay = getCurrentRamadanDay();
      const remainingDays = 30 - currentDay;
      remainingDaysElement.textContent = remainingDays > 0 ? remainingDays : 'انتهى رمضان';
    }
    
    // Calculate user stats
    calculateUserStats(user.uid).then((stats) => {
      const completedDaysElement = document.getElementById('completed-days');
      const completionRateElement = document.getElementById('completion-rate');
      const completedPrayersElement = document.getElementById('completed-prayers');
      const completedJuzElement = document.getElementById('completed-juz');
      
      if (completedDaysElement) completedDaysElement.textContent = stats.completedDays;
      if (completionRateElement) completionRateElement.textContent = `${stats.completionRate}%`;
      if (completedPrayersElement) completedPrayersElement.textContent = stats.completedPrayers;
      if (completedJuzElement) completedJuzElement.textContent = stats.completedJuz;
    });
  });
}

async function calculateUserStats(userId) {
  const prayerTasks = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  let completedDays = 0;
  let completedPrayers = 0;
  let completedJuz = 0;
  
  try {
    const snapshot = await database.ref(`users/${userId}/tracker`).once('value');
    const trackerData = snapshot.val() || {};
    
    for (let day = 1; day <= 30; day++) {
      const dayData = trackerData[`day${day}`] || {};
      let dayCompleted = true;
      let dayPrayersCompleted = 0;
      
      const tasks = [
        "fajr", "dhuhr", "asr", "maghrib", "isha",
        "ghiba", "kazb", "kalam", "juz", "hizb",
        "rahm", "saim", "gedal", "eslah",
        "taraweh", "dohaw", "etkaf"
      ];
      
      tasks.forEach(task => {
        const isCompleted = dayData[task] || false;
        
        if (!isCompleted) dayCompleted = false;
        
        // Count prayers
        if (prayerTasks.includes(task) && isCompleted) {
          dayPrayersCompleted++;
        }
        
        // Count juz
        if (task === 'juz' && isCompleted) {
          completedJuz++;
        }
      });
      
      if (dayCompleted) completedDays++;
      completedPrayers += dayPrayersCompleted;
    }
    
    const completionRate = Math.round((completedDays / 30) * 100);
    
    return {
      completedDays,
      completionRate,
      completedPrayers,
      completedJuz
    };
  } catch (error) {
    console.error("Error calculating user stats:", error);
    return {
      completedDays: 0,
      completionRate: 0,
      completedPrayers: 0,
      completedJuz: 0
    };
  }
}

function showResetConfirm() {
  const resetModal = document.getElementById('reset-modal');
  if (resetModal) resetModal.style.display = 'block';
}

function resetUserData() {
  const user = auth.currentUser;
  if (!user) return;
  
  // Delete all user tracker data
  database.ref(`users/${user.uid}/tracker`).remove()
    .then(() => {
      closeModal();
      alert('تم إعادة تعيين بياناتك بنجاح');
      loadProfilePage();
      generateCalendar();
    })
    .catch((error) => {
      console.error("Error resetting user data:", error);
      alert('حدث خطأ أثناء إعادة تعيين البيانات');
    });
}

// Admin Page Functions
function loadAdminPage() {
  const user = auth.currentUser;
  if (!user) {
    showPage('home');
    return;
  }
  
  // Verify admin status
  database.ref(`users/${user.uid}/isAdmin`).once('value').then((snapshot) => {
    if (!snapshot.exists() || !snapshot.val()) {
      showPage('profile');
      return;
    }
    
    // Load admin content
    const adminPage = document.getElementById('admin-page');
    if (!adminPage) return;
    
    adminPage.innerHTML = `
      <div class="about-content">
        <h2>لوحة التحكم الإدارية</h2>
        
        <div class="admin-section">
          <h3>إدارة الموارد</h3>
          <div class="admin-form">
            <select id="resource-type" class="form-input">
              <option value="prayers">أذكار وأدعية</option>
              <option value="quran">تلاوات قرآنية</option>
              <option value="lessons">دروس ومحاضرات</option>
            </select>
            <input type="text" id="resource-title" placeholder="عنوان المورد" class="form-input">
            <input type="text" id="resource-url" placeholder="رابط المورد" class="form-input">
            <button onclick="addResource()" class="primary-btn">إضافة مورد</button>
          </div>
        </div>
        
        <div class="admin-section">
          <h3>إحصائيات المستخدمين</h3>
          <div id="user-stats" class="stats-container"></div>
        </div>
        
        <div class="admin-section">
          <h3>تصدير/استيراد البيانات</h3>
          <button onclick="exportData()" class="secondary-btn">تصدير البيانات</button>
          <input type="file" id="import-file" accept=".json" style="display: none;">
          <button onclick="document.getElementById('import-file').click()" class="secondary-btn">استيراد البيانات</button>
        </div>
      </div>
    `;
    
    // Load users stats
    loadUsersStats();
    
    // Set up event listeners for admin functions
    const importFile = document.getElementById('import-file');
    if (importFile) {
      importFile.addEventListener('change', importData);
    }
  });
}

function addResource() {
  const type = document.getElementById('resource-type')?.value;
  const title = document.getElementById('resource-title')?.value.trim();
  const url = document.getElementById('resource-url')?.value.trim();
  
  if (!type || !title || !url) {
    alert('الرجاء إدخال عنوان المورد ورابطه');
    return;
  }
  
  const newResourceKey = database.ref(`resources/${type}`).push().key;
  const updates = {};
  updates[`resources/${type}/${newResourceKey}`] = { title, url };
  
  database.ref().update(updates)
    .then(() => {
      alert('تمت إضافة المورد بنجاح');
      const titleField = document.getElementById('resource-title');
      const urlField = document.getElementById('resource-url');
      if (titleField) titleField.value = '';
      if (urlField) urlField.value = '';
      loadResources(); // Refresh resources
    })
    .catch((error) => {
      console.error("Error adding resource:", error);
      alert('حدث خطأ أثناء إضافة المورد');
    });
}

function loadUsersStats() {
  const userStats = document.getElementById('user-stats');
  if (!userStats) return;
  
  database.ref('users').once('value').then((snapshot) => {
    const users = snapshot.val() || {};
    const userCount = Object.keys(users).length;
    
    userStats.innerHTML = `
      <p>عدد المستخدمين: ${userCount}</p>
    `;
  });
}

function exportData() {
  database.ref().once('value').then((snapshot) => {
    const data = snapshot.val();
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportName = 'ramadan-tracker-export.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
  });
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      database.ref().set(data)
        .then(() => {
          alert('تم استيراد البيانات بنجاح');
          location.reload();
        })
        .catch((error) => {
          console.error("Error importing data:", error);
          alert('حدث خطأ أثناء استيراد البيانات');
        });
    } catch (error) {
      console.error("Error parsing JSON:", error);
      alert('ملف غير صالح');
    }
  };
  reader.readAsText(file);
}

// Make functions available globally
window.showPage = showPage;
window.toggleAuthModal = toggleAuthModal;
window.showLoginForm = showLoginForm;
window.showRegisterForm = showRegisterForm;
window.closeModal = closeModal;
window.register = register;
window.login = login;
window.logout = logout;
window.goBack = goBack;
window.showResetConfirm = showResetConfirm;
window.resetUserData = resetUserData;
window.addResource = addResource;
window.exportData = exportData;
window.importData = importData;