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
const tajweedStageLabel = $("#tajweedStageLabel");
const tajweedStageSelect = courseApplyForm?.querySelector("select[name='tajweedStage']");
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
  const tajweedStage = fd.get("tajweedStage");
  await addDoc(collection(db, "enrollments"), {
    studentId: currentUser.uid,
    studentName: currentProfile.name,
    studentEmail: currentProfile.email,
    mainCourse,
    tajweedStage: mainCourse === "quranyqath" ? tajweedStage : "",
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

function renderProfile() {
  const g = currentProfile.grades || {};
  profileCard.innerHTML = `<img src="${currentProfile.photoUrl || "https://placehold.co/120x120"}" alt="dp"/><div><h4>${currentProfile.name || "No Name"}</h4><p>${currentProfile.email || ""}</p><p>${currentProfile.phone || "No Number"}</p><p class="role-badge">${currentProfile.role}</p>${currentProfile.role === "student" ? `<p class="score-row">Scores: Tajweed ${g.tajweed || 0} | Pronunciation ${g.pronunciation || 0} | Attendance ${g.attendance || 0}</p>` : ""}<button id="logoutBtn">Logout</button></div>`;
  $("#logoutBtn").onclick = () => signOut(auth);
}

function setupRoleUI() {
  courseApplyForm.classList.add("hidden");
  teacherStudentsCard.classList.add("hidden");
  studentEnrollmentsCard.classList.add("hidden");
  showMyRequestsBtn?.classList.add("hidden");
  chatWrap.classList.add("hidden");

  if (currentProfile.role === "student") {
    openEnrollmentFormBtn?.classList.remove("hidden");
    showMyRequestsBtn?.classList.remove("hidden");
    quickApplyBtn?.classList.remove("hidden");
    quickRequestsBtn?.classList.remove("hidden");
    courseApplyForm.classList.add("hidden");
    studentEnrollmentsCard.classList.add("hidden");
    roleOverview.textContent = "Student dashboard: Apply for courses, track enrollment status, and chat with assigned teachers.";
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
        row.innerHTML = `<strong>${e.mainCourse || e.courseId || ""}</strong><p>Tajweed Stage: ${e.tajweedStage || "N/A"}</p><p>Status: ${status}</p>${action}`;
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

  if (currentProfile.role === "teacher") {
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

  if (currentProfile.role === "admin") {
    roleOverview.textContent = "Admin dashboard: Open admin panel to manage users, enrollments, and teacher assignments.";
  }
}

function renderThreadList(threads, mode) {
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
      btn.innerHTML = `<strong>${t.teacherName}</strong><span>${t.course}</span>`;
      btn.onclick = () => {
        currentChatId = [currentUser.uid, t.teacherId].sort().join("__");
        chatWrap.classList.remove("hidden");
        chatMeta.textContent = `Teacher: ${t.teacherName} | ${t.course}`;
        subscribeToChat(currentChatId);
      };
    } else {
      btn.innerHTML = `<strong>${t.studentName}</strong><span>${t.course}</span>`;
      btn.onclick = () => {
        currentChatId = [currentUser.uid, t.studentId].sort().join("__");
        chatWrap.classList.remove("hidden");
        chatMeta.textContent = `Student: ${t.studentName} | ${t.course}`;
        subscribeToChat(currentChatId);
      };
    }
    chatThreads.appendChild(btn);
  });
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
  if (!mainCourseSelect || !tajweedStageLabel || !tajweedStageSelect) return;
  const refresh = () => {
    const isQuranyqath = mainCourseSelect.value === "quranyqath";
    tajweedStageLabel.classList.toggle("hidden", !isQuranyqath);
    tajweedStageSelect.required = isQuranyqath;
    if (!isQuranyqath) tajweedStageSelect.value = "";
  };
  mainCourseSelect.addEventListener("change", refresh);
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
    row.innerHTML = `<strong>${e.studentName}</strong><p>Main Course: ${e.mainCourse || e.courseId || ""}</p><p>Tajweed Stage: ${e.tajweedStage || "N/A"}</p><label>Select Teacher</label><select data-id="${d.id}"><option value="">Unassigned</option>${options}</select><button data-save="${d.id}">Assign Teacher For Enrollment</button>`;
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
