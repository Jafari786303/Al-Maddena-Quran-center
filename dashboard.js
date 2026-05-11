import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, getDocs, query, where, orderBy, onSnapshot, serverTimestamp, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBCKAMOEs2Yy_7cmF3W-z91HpnLA7C2Ye4",
  authDomain: "al-madeena-tajweed-center.firebaseapp.com",
  projectId: "al-madeena-tajweed-center",
  storageBucket: "al-madeena-tajweed-center.firebasestorage.app",
  messagingSenderId: "1979430896",
  appId: "1:1979430896:web:5daa210767635f46ed4f35",
  measurementId: "G-FJ8CE4GB40"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const adminEmails = ["mhmdhaffi42@gmail.com"];

let currentUser = null;
let currentProfile = null;
let currentChatId = null;
let chatUnsub = null;
let threadsCache = [];

const $ = (s) => document.querySelector(s);
const profileCard = $("#profileCard");
const sidebarToggle = $("#sidebarToggle");
const leftSidebar = $("#leftSidebar");
const openEnrollmentFormBtn = $("#openEnrollmentFormBtn");
const showMyRequestsBtn = $("#showMyRequestsBtn");
const quickApplyBtn = $("#quickApplyBtn");
const quickRequestsBtn = $("#quickRequestsBtn");
const quickChatsBtn = $("#quickChatsBtn");
const roleOverview = $("#roleOverview");
const courseApplyForm = $("#courseApplyForm");
const mainCourseSelect = courseApplyForm?.querySelector("select[name='mainCourse']");
const subCategorySelect = courseApplyForm?.querySelector("select[name='subCategory']");
const addCustomHeadingBtn = $("#addCustomHeadingBtn");
const customHeadingInput = courseApplyForm?.querySelector("input[name='customHeading']");
const tajweedStageLabel = $("#tajweedStageLabel");
const tajweedStageSelect = courseApplyForm?.querySelector("select[name='tajweedStage']");
const durationMonthsSelect = courseApplyForm?.querySelector("select[name='durationMonths']");
const durationDaysSelect = courseApplyForm?.querySelector("select[name='durationDays']");
const courseContentPreview = $("#courseContentPreview");
const teacherStudentsCard = $("#teacherStudentsCard");
const teacherStudents = $("#teacherStudents");
const studentEnrollmentsCard = $("#studentEnrollmentsCard");
const studentEnrollments = $("#studentEnrollments");
const chatWrap = $("#chatWrap");
const chatMessages = $("#chatMessages");
const chatForm = $("#chatForm");
const chatMeta = $("#chatMeta");
const chatThreads = $("#chatThreads");
const adminPanel = $("#adminPanel");
const adminUsers = $("#adminUsers");
const adminEnrollments = $("#adminEnrollments");
const adminQuickOpen = $("#adminQuickOpen");
const langEn = $("#langEn");
const langUr = $("#langUr");

const COURSE_TREE = {
  intro_holy_quran: {
    label: "Introduction to the Holy Quran",
    subs: [
      "Tajweed",
      "History of Revelation (Wahi)", "Compilation of the Quran", "Makki and Madani Surahs",
      "Importance of the Quran in Daily Life", "Tawheed (Oneness of Allah)", "Attributes of Allah",
      "Prophethood (Risalat)", "Finality of Prophet Muhammad", "Angels in Islam", "Divine Books",
      "Akhirah (Life Hereafter)", "Day of Judgment", "Worship in Islam", "Salah (Prayer) in the Quran",
      "Fasting in the Quran", "Zakat and Charity", "Hajj and Pilgrimage", "Moral Teachings of the Quran",
      "Rights of Parents", "Rights of Neighbors and Society", "Women’s Rights in Islam", "Human Rights in the Quran",
      "Economic Teachings of Islam", "Justice and Equality", "Peace and Tolerance", "Stories of Prophets in the Quran",
      "Scientific Facts in the Quran", "Quranic Supplications (Duas)", "Practical Quranic Guidance for Modern Life"
    ]
  },
  seerath: {
    label: "Seerath",
    subs: [
      "Introduction to Seerah", "Arabia Before Islam", "Family Background of Prophet Muhammad ﷺ",
      "Birth of the Prophet ﷺ", "Childhood and Upbringing", "Youth of the Prophet ﷺ", "Trade and Honesty",
      "Marriage with Hazrat Khadijah (RA)", "Cave Hira and Worship", "First Revelation", "Early Preaching of Islam",
      "Persecution in Makkah", "Migration to Abyssinia", "Isra and Miraj", "Pledges of Aqabah", "Migration to Madinah",
      "Construction of Masjid-e-Nabawi", "Brotherhood in Madinah", "Battle of Badr", "Battle of Uhud", "Battle of the Trench",
      "Treaty of Hudaybiyyah", "Conquest of Makkah", "Farewell Sermon", "Character of the Prophet ﷺ",
      "Justice of the Prophet ﷺ", "Kindness Towards Women", "Love for Children", "Passing of the Prophet ﷺ"
    ]
  },
  ahkam: {
    label: "Ahkam",
    subs: [
      "Introduction to Islamic Laws", "Rules of Purification", "Rules of Wudu", "Rules of Ghusl", "Method of Tayammum",
      "Rules of Salah", "Congregational Prayer", "Rules of Friday Prayer", "Rules of Fasting", "Rules of Zakat",
      "Charity and Sadaqah", "Rules of Hajj", "Rules of Umrah", "Halal and Haram", "Islamic Manners of Eating and Drinking",
      "Rules of Islamic Dress", "Rules of Marriage", "Rules of Divorce", "Laws of Inheritance", "Islamic Principles of Trade",
      "Prohibition of Interest (Riba)", "Loans and Trusts", "Rights of Parents", "Rights of Neighbors", "Rights of Husband and Wife",
      "Rights of Children", "Justice in Islam", "Islamic Social System", "Introduction to Hudood and Punishments", "Islamic Rulings for Daily Life"
    ]
  },
  akhlaq: {
    label: "Akhlaq",
    subs: [
      "Introduction to Ethics", "Importance of Good Character", "Truthfulness", "Honesty and Trustworthiness",
      "Patience and Tolerance", "Gratitude", "Humility", "Respect for Parents", "Respect for Teachers", "Respect for Elders",
      "Kindness to Youngers", "Good Behavior", "Brotherhood and Unity", "Forgiveness", "Keeping Promises", "Justice and Fairness",
      "Cleanliness and Purity", "Punctuality", "Hard Work and Integrity", "Avoiding Jealousy", "Controlling Anger",
      "Avoiding Backbiting and Slander", "Generosity and Charity", "Hospitality", "Helping Others", "Islamic Manners of Speech",
      "Choosing Good Friends", "Character of Prophet Muhammad ﷺ", "Social Ethics", "Islamic Ethics in Daily Life"
    ]
  }
};
const PDF_LINKS = {
  "Tajweed": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "History of Revelation (Wahi)": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Compilation of the Quran": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Makki and Madani Surahs": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Tawheed (Oneness of Allah)": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Akhirah (Life Hereafter)": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Introduction to Seerah": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Early Preaching of Islam": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Migration to Madinah": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Battle of Badr": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Conquest of Makkah": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Character of the Prophet ﷺ": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Rules of Purification": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Rules of Salah": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Rules of Fasting": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Rules of Zakat": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Rules of Marriage": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Islamic Rulings for Daily Life": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Truthfulness": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Patience and Tolerance": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Respect for Parents": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Forgiveness": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Controlling Anger": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  "Islamic Ethics in Daily Life": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "./index.html";
    return;
  }
  currentUser = user;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email || "",
      name: user.displayName || "",
      role: "student",
      photoUrl: user.photoURL || "",
      grades: { tajweed: 0, pronunciation: 0, attendance: 0 },
      createdAt: serverTimestamp()
    }, { merge: true });
  }

  const normalizedEmail = String(user.email || "").trim().toLowerCase();
  const shouldBeAdmin = adminEmails.map((e) => e.toLowerCase()).includes(normalizedEmail);
  const data = (await getDoc(ref)).data();
  if (shouldBeAdmin && data.role !== "admin") {
    await updateDoc(ref, { role: "admin" });
  }
  currentProfile = (await getDoc(ref)).data();
  if (String(currentProfile?.role || "").toLowerCase() === "admin") {
    adminQuickOpen?.classList.remove("hidden");
  }
  renderProfile();
  setupRoleUI();
  setupCourseFormUX();
  setupUnlockAdminPanel();
});

courseApplyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(courseApplyForm);
  const mainCourse = fd.get("mainCourse");
  const subCategory = fd.get("subCategory");
  const tajweedStage = fd.get("tajweedStage");
  await addDoc(collection(db, "enrollments"), {
    studentId: currentUser.uid,
    studentName: currentProfile.name,
    studentEmail: currentProfile.email,
    mainCourse,
    subCategory,
    tajweedStage: subCategory === "Tajweed" ? tajweedStage : "",
    durationMonths: Number(fd.get("durationMonths") || 0),
    durationDays: Number(fd.get("durationDays") || 0),
    freeTimes: fd.get("freeTimes"),
    previousExperience: fd.get("previousExperience"),
    assignedTeacherId: "",
    assignedTeacherName: "",
    createdAt: serverTimestamp()
  });
  alert("Enrollment submitted.");
  courseApplyForm.reset();
});

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentChatId) return;
  const fd = new FormData(chatForm);
  const text = String(fd.get("message")).trim();
  if (!text) return;
  await addDoc(collection(db, "chats", currentChatId, "messages"), { fromUid: currentUser.uid, fromName: currentProfile.name, message: text, createdAt: serverTimestamp() });
  chatForm.reset();
});

const i18n = {
  en: { dashboard: "Dashboard", quick: "Quick Actions", overview: "Overview", chats: "Open Chats", apply: "Apply for New Course", req: "Show My Requests" },
  ur: { dashboard: "ڈیش بورڈ", quick: "فوری اعمال", overview: "جائزہ", chats: "چیٹس کھولیں", apply: "نئے کورس کے لئے اپلائی کریں", req: "میری درخواستیں دکھائیں" }
};
function setLanguage(lang) {
  const t = i18n[lang] || i18n.en;
  const h3 = document.querySelector("#userArea h3");
  const quickTitle = document.querySelector("#quickLinks .quick-card h4");
  const overTitle = document.querySelectorAll("#quickLinks .quick-card h4")[1];
  if (h3) h3.textContent = t.dashboard;
  if (quickTitle) quickTitle.textContent = t.quick;
  if (overTitle) overTitle.textContent = t.overview;
  if (quickChatsBtn) quickChatsBtn.textContent = t.chats;
  if (openEnrollmentFormBtn) openEnrollmentFormBtn.textContent = t.apply;
  if (showMyRequestsBtn) showMyRequestsBtn.textContent = t.req;
  if (quickApplyBtn) quickApplyBtn.textContent = t.apply;
  if (quickRequestsBtn) quickRequestsBtn.textContent = t.req;
  document.body.dir = lang === "ur" ? "rtl" : "ltr";
  localStorage.setItem("siteLang", lang);
}
langEn?.addEventListener("click", () => setLanguage("en"));
langUr?.addEventListener("click", () => setLanguage("ur"));
setLanguage(localStorage.getItem("siteLang") || "en");

function renderProfile() {
  const g = currentProfile.grades || {};
  profileCard.innerHTML = `<img src="${currentProfile.photoUrl || "https://placehold.co/120x120"}" alt="dp"/><div><h4>${currentProfile.name || "No Name"}</h4><p>${currentProfile.email || ""}</p><p>Age: ${currentProfile.age || "-"}</p><p>${currentProfile.phone || "No Number"}</p><p class="role-badge">${currentProfile.role}</p>${currentProfile.role === "student" ? `<p class="score-row">Scores: Tajweed ${g.tajweed || 0} | Pronunciation ${g.pronunciation || 0} | Attendance ${g.attendance || 0}</p>` : ""}<button id="logoutBtn">Logout</button></div>`;
  $("#logoutBtn").onclick = () => signOut(auth);
}

function setupRoleUI() {
  const role = String(currentProfile.role || "").toLowerCase();
  courseApplyForm.classList.add("hidden");
  teacherStudentsCard.classList.add("hidden");
  studentEnrollmentsCard.classList.add("hidden");
  showMyRequestsBtn?.classList.add("hidden");
  chatWrap.classList.add("hidden");

  if (role === "student" || role === "admin") {
    openEnrollmentFormBtn?.classList.remove("hidden");
    showMyRequestsBtn?.classList.remove("hidden");
    quickApplyBtn?.classList.remove("hidden");
    quickRequestsBtn?.classList.remove("hidden");
    courseApplyForm.classList.add("hidden");
    studentEnrollmentsCard.classList.add("hidden");
    roleOverview.textContent = role === "admin"
      ? "Admin + Student mode: Apply for courses, track requests, and chat with assigned teachers."
      : "Student dashboard: Apply for courses, track enrollment status, and chat with assigned teachers.";
    const q = query(collection(db, "enrollments"), where("studentId", "==", currentUser.uid));
    onSnapshot(q, (snap) => {
      const threadMap = new Map();
      if (!snap.docs.length) {
        studentEnrollments.innerHTML = "<p class='note'>No enrollment submitted yet.</p>";
        chatThreads.innerHTML = "<p class='note'>No chats yet.</p>";
        return;
      }

      studentEnrollments.innerHTML = "";
      snap.forEach((docSnap) => {
        const e = docSnap.data();
        const status = e.assignedTeacherId ? `Assigned to ${e.assignedTeacherName || "Teacher"}` : "Pending admin assignment";
        const canChat = !!e.assignedTeacherId;
        const action = canChat ? `<button data-chat-student="${e.assignedTeacherId}" data-teacher-name="${e.assignedTeacherName || "Assigned Teacher"}">Open Chat</button>` : "";
        const row = document.createElement("div");
        row.className = "user-list-item";
        row.innerHTML = `<strong>${e.mainCourse || e.courseId || ""}</strong><p>Subcategory: ${e.subCategory || "N/A"}</p><p>Tajweed Stage: ${e.tajweedStage || "N/A"}</p><p>Duration: ${e.durationMonths || 0} months ${e.durationDays || 0} days</p><p>Status: ${status}</p>${action}`;
        studentEnrollments.appendChild(row);
        if (canChat) {
          const key = `${e.assignedTeacherId}__${e.mainCourse || e.courseId || "course"}`;
          if (!threadMap.has(key)) {
            threadMap.set(key, {
              teacherId: e.assignedTeacherId,
              teacherName: e.assignedTeacherName || "Assigned Teacher",
              course: e.mainCourse || e.courseId || "Course"
            });
          }
        }
      });

      studentEnrollments.querySelectorAll("button[data-chat-student]").forEach((btn) => {
        btn.onclick = () => {
          const teacherId = btn.dataset.chatStudent;
          const teacherName = btn.dataset.teacherName;
          currentChatId = [currentUser.uid, teacherId].sort().join("__");
          chatWrap.classList.remove("hidden");
          chatMeta.textContent = `Teacher: ${teacherName}`;
          subscribeToChat(currentChatId);
        };
      });
      renderThreadList([...threadMap.values()], "student");
    });
  }

  if (role === "teacher") {
    teacherStudentsCard.classList.remove("hidden");
    chatWrap.classList.remove("hidden");
    roleOverview.textContent = "Teacher dashboard: Review assigned students and manage one-to-one chats.";
    const q = query(collection(db, "enrollments"), where("assignedTeacherId", "==", currentUser.uid));
    onSnapshot(q, (snap) => {
      const threads = [];
      teacherStudents.innerHTML = "";
      snap.forEach((d) => {
        const e = d.data();
        const div = document.createElement("div");
        div.className = "user-list-item";
        div.innerHTML = `<strong>${e.studentName}</strong><p>${e.studentEmail}</p><button data-sid="${e.studentId}" data-name="${e.studentName}">Open Chat</button>`;
        teacherStudents.appendChild(div);
        threads.push({
          studentId: e.studentId,
          studentName: e.studentName,
          course: e.mainCourse || e.courseId || "Course"
        });
      });
      teacherStudents.querySelectorAll("button").forEach((b) => {
        b.onclick = () => {
          currentChatId = [b.dataset.sid, currentUser.uid].sort().join("__");
          chatMeta.textContent = `Student: ${b.dataset.name}`;
          subscribeToChat(currentChatId);
        };
      });
      renderThreadList(threads, "teacher");
    });
  }

  if (role === "admin") {
    roleOverview.textContent = "Admin dashboard: Open admin panel to manage users, enrollments, and teacher assignments.";
  }
}

function renderThreadList(threads, mode) {
  threadsCache = threads;
  if (!chatThreads) return;
  if (!threads.length) {
    chatThreads.innerHTML = "<p class='note'>No chats yet.</p>";
    return;
  }
  chatThreads.innerHTML = "";
  threads.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "thread-item";
    if (mode === "student") {
      btn.innerHTML = `<strong>${t.teacherName}</strong><span>${t.course}</span><span class="unread-dot hidden" data-unread-for="${t.teacherId}"></span>`;
      btn.onclick = () => {
        currentChatId = [currentUser.uid, t.teacherId].sort().join("__");
        chatWrap.classList.remove("hidden");
        chatMeta.textContent = `Teacher: ${t.teacherName} | ${t.course}`;
        subscribeToChat(currentChatId);
        markThreadRead(currentChatId);
      };
    } else {
      btn.innerHTML = `<strong>${t.studentName}</strong><span>${t.course}</span><span class="unread-dot hidden" data-unread-for="${t.studentId}"></span>`;
      btn.onclick = () => {
        currentChatId = [currentUser.uid, t.studentId].sort().join("__");
        chatWrap.classList.remove("hidden");
        chatMeta.textContent = `Student: ${t.studentName} | ${t.course}`;
        subscribeToChat(currentChatId);
        markThreadRead(currentChatId);
      };
    }
    chatThreads.appendChild(btn);
  });
  refreshUnreadCounts(mode);
}

async function markThreadRead(chatId) {
  if (!currentUser) return;
  const path = `chatRead.${chatId}`;
  await updateDoc(doc(db, "users", currentUser.uid), { [path]: Date.now() });
  const dot = chatThreads?.querySelector(`.unread-dot[data-chat-id="${chatId}"]`);
  if (dot) dot.classList.add("hidden");
}

async function refreshUnreadCounts(mode) {
  const profileSnap = await getDoc(doc(db, "users", currentUser.uid));
  const chatRead = profileSnap.data()?.chatRead || {};
  for (const t of threadsCache) {
    const otherId = mode === "student" ? t.teacherId : t.studentId;
    const chatId = [currentUser.uid, otherId].sort().join("__");
    const lastRead = Number(chatRead[chatId] || 0);
    let unread = 0;
    try {
      const all = await getDocs(collection(db, "chats", chatId, "messages"));
      all.forEach((m) => {
        const data = m.data();
        const ts = data.createdAt?.toMillis ? data.createdAt.toMillis() : 0;
        if (data.fromUid !== currentUser.uid && ts > lastRead) unread += 1;
      });
    } catch {
      unread = 0;
    }
    const dot = [...chatThreads.querySelectorAll(".unread-dot")].find((d) => d.dataset.unreadFor === otherId);
    if (!dot) continue;
    dot.dataset.chatId = chatId;
    if (unread > 0) {
      dot.textContent = unread > 99 ? "99+" : String(unread);
      dot.classList.remove("hidden");
    } else {
      dot.textContent = "";
      dot.classList.add("hidden");
    }
  }
}

openEnrollmentFormBtn?.addEventListener("click", () => {
  courseApplyForm.classList.remove("hidden");
  courseApplyForm.scrollIntoView({ behavior: "smooth", block: "start" });
});
quickApplyBtn?.addEventListener("click", () => openEnrollmentFormBtn?.click());

showMyRequestsBtn?.addEventListener("click", () => {
  studentEnrollmentsCard.classList.toggle("hidden");
  if (!studentEnrollmentsCard.classList.contains("hidden")) {
    studentEnrollmentsCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
quickRequestsBtn?.addEventListener("click", () => showMyRequestsBtn?.click());
quickChatsBtn?.addEventListener("click", () => {
  leftSidebar?.classList.add("open");
  chatThreads?.scrollIntoView({ behavior: "smooth", block: "start" });
});

sidebarToggle?.addEventListener("click", () => {
  leftSidebar?.classList.toggle("open");
});

function setupCourseFormUX() {
  if (!mainCourseSelect || !subCategorySelect || !tajweedStageLabel || !tajweedStageSelect || !durationMonthsSelect || !durationDaysSelect) return;
  durationMonthsSelect.innerHTML = Array.from({ length: 25 }, (_, i) => `<option value="${i}">${i} month${i === 1 ? "" : "s"}</option>`).join("");
  durationDaysSelect.innerHTML = Array.from({ length: 31 }, (_, i) => `<option value="${i}">${i} day${i === 1 ? "" : "s"}</option>`).join("");

  const fillSubCategories = () => {
    const main = mainCourseSelect.value;
    const custom = JSON.parse(localStorage.getItem(`custom_subs_${main}`) || "[]");
    const subs = [...(COURSE_TREE[main]?.subs || []), ...custom];
    subCategorySelect.innerHTML = subs.map((s) => `<option value="${s}">${s}</option>`).join("");
  };

  const refreshPdfPreview = () => {
    const main = mainCourseSelect.value;
    const sub = subCategorySelect.value;
    const url = PDF_LINKS[sub] || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
    const mainLabel = COURSE_TREE[main]?.label || main;
    courseContentPreview.innerHTML = `<strong>${mainLabel}</strong><p>Subcategory: ${sub || "-"}</p><a href="${url}" target="_blank" rel="noopener">Open Hosted PDF Content</a>`;
  };

  const refresh = () => {
    fillSubCategories();
    const isTajweed = subCategorySelect.value === "Tajweed";
    tajweedStageLabel.classList.toggle("hidden", !isTajweed);
    tajweedStageSelect.required = isTajweed;
    if (!isTajweed) tajweedStageSelect.value = "";
    refreshPdfPreview();
  };
  mainCourseSelect.addEventListener("change", refresh);
  subCategorySelect.addEventListener("change", () => {
    const isTajweed = subCategorySelect.value === "Tajweed";
    tajweedStageLabel.classList.toggle("hidden", !isTajweed);
    tajweedStageSelect.required = isTajweed;
    if (!isTajweed) tajweedStageSelect.value = "";
    refreshPdfPreview();
  });
  addCustomHeadingBtn?.addEventListener("click", () => {
    const main = mainCourseSelect.value;
    const heading = String(customHeadingInput?.value || "").trim();
    if (!heading) return;
    const key = `custom_subs_${main}`;
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    if (!list.includes(heading)) {
      list.push(heading);
      localStorage.setItem(key, JSON.stringify(list));
    }
    if (customHeadingInput) customHeadingInput.value = "";
    fillSubCategories();
    subCategorySelect.value = heading;
    refreshPdfPreview();
  });
  refresh();
}

function setupUnlockAdminPanel() {
  let keyBuffer = "";
  const tryOpenAdmin = async () => {
    const role = String(currentProfile?.role || "").toLowerCase();
    if (role !== "admin") {
      alert("Admin panel access denied. This account is not admin.");
      return;
    }
    adminPanel.classList.remove("hidden");
    await loadAdminPanel();
  };

  window.addEventListener("keydown", async (e) => {
    keyBuffer = (keyBuffer + e.key).toLowerCase().slice(-30);
    if (!keyBuffer.includes("adminmhmd")) return;
    await tryOpenAdmin();
  });

  window.addEventListener("paste", async (e) => {
    const txt = String(e.clipboardData?.getData("text") || "").toLowerCase();
    if (txt.includes("adminmhmd")) await tryOpenAdmin();
  });

  if (window.location.hash.toLowerCase() === "#adminmhmd") {
    tryOpenAdmin();
  }

  window.openAdminPanel = async () => {
    const code = prompt("Enter admin code");
    if (String(code || "").toLowerCase() === "adminmhmd") {
      await tryOpenAdmin();
    }
  };

  adminQuickOpen?.addEventListener("click", async () => {
    await tryOpenAdmin();
  });

  adminPanel.addEventListener("click", (e) => {
    if (e.target === adminPanel) adminPanel.classList.add("hidden");
  });
}

async function loadAdminPanel() {
  const [usersSnap, teachersSnap, enrollSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(query(collection(db, "users"), where("role", "==", "teacher"))),
    getDocs(collection(db, "enrollments"))
  ]);
  const teachers = teachersSnap.docs.map((d) => d.data());
  adminUsers.innerHTML = "";
  usersSnap.forEach((d) => {
    const u = d.data();
    const div = document.createElement("div");
    div.className = "user-list-item";
    div.innerHTML = `<strong>${u.name || "No Name"}</strong><p>Email: ${u.email || ""}</p><p>Role: ${u.role || ""}</p><p>Account ID: ${u.uid || d.id}</p>`;
    adminUsers.appendChild(div);
  });

  adminEnrollments.innerHTML = "";
  enrollSnap.forEach((d) => {
    const e = d.data();
    if (e.assignedTeacherId) return;
    const row = document.createElement("div");
    row.className = "user-list-item";
    const options = teachers.map((t) => `<option value="${t.uid}" ${t.uid === e.assignedTeacherId ? "selected" : ""}>${t.name} (${t.email})</option>`).join("");
    row.innerHTML = `<strong>${e.studentName}</strong><p>Main Course: ${e.mainCourse || e.courseId || ""}</p><p>Subcategory: ${e.subCategory || "N/A"}</p><p>Tajweed Stage: ${e.tajweedStage || "N/A"}</p><p>Duration: ${e.durationMonths || 0} months ${e.durationDays || 0} days</p><label>Select Teacher</label><select data-id="${d.id}"><option value="">Unassigned</option>${options}</select><button data-save="${d.id}">Assign Teacher For Enrollment</button>`;
    adminEnrollments.appendChild(row);
  });

  adminEnrollments.querySelectorAll("button[data-save]").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.save;
      const select = adminEnrollments.querySelector(`select[data-id="${id}"]`);
      const tid = select.value;
      const teacher = teachers.find((t) => t.uid === tid);
      await updateDoc(doc(db, "enrollments", id), { assignedTeacherId: tid, assignedTeacherName: teacher ? teacher.name : "" });
      alert("Teacher assigned.");
      await loadAdminPanel();
    };
  });
}

function subscribeToChat(chatId) {
  if (chatUnsub) chatUnsub();
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
  chatUnsub = onSnapshot(q, (snap) => {
    chatMessages.innerHTML = "";
    snap.forEach((d) => {
      const m = d.data();
      const div = document.createElement("div");
      div.className = `msg ${m.fromUid === currentUser.uid ? "me" : "other"}`;
      div.textContent = `${m.fromName}: ${m.message}`;
      chatMessages.appendChild(div);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}
