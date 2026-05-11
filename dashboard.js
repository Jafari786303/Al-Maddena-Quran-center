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
const adminEmails = ["mhmd1212@gmail.com"];

let currentUser = null;
let currentProfile = null;
let currentChatId = null;
let chatUnsub = null;

const $ = (s) => document.querySelector(s);
const profileCard = $("#profileCard");
const courseApplyForm = $("#courseApplyForm");
const teacherStudentsCard = $("#teacherStudentsCard");
const teacherStudents = $("#teacherStudents");
const chatWrap = $("#chatWrap");
const chatMessages = $("#chatMessages");
const chatForm = $("#chatForm");
const chatMeta = $("#chatMeta");
const adminPanel = $("#adminPanel");
const adminUsers = $("#adminUsers");
const adminEnrollments = $("#adminEnrollments");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "./index.html";
    return;
  }
  currentUser = user;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { uid: user.uid, email: user.email || "", name: user.displayName || "", role: "student", grades: { tajweed: 0, pronunciation: 0, attendance: 0 }, createdAt: serverTimestamp() });
  }

  const shouldBeAdmin = adminEmails.includes(user.email || "");
  const data = (await getDoc(ref)).data();
  if (shouldBeAdmin && data.role !== "admin") {
    await updateDoc(ref, { role: "admin" });
  }
  currentProfile = (await getDoc(ref)).data();
  renderProfile();
  setupRoleUI();
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
    tajweedStage: mainCourse === "quranyath" ? tajweedStage : "",
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
  profileCard.innerHTML = `<img src="${currentProfile.photoUrl || "https://placehold.co/120x120"}" alt="dp"/><div><h4>${currentProfile.name || "No Name"}</h4><p>${currentProfile.email || ""} | ${currentProfile.phone || "No Number"}</p><p>Role: ${currentProfile.role}</p>${currentProfile.role === "student" ? `<p>Scores: Tajweed ${g.tajweed || 0}, Pronunciation ${g.pronunciation || 0}, Attendance ${g.attendance || 0}</p>` : ""}<button id="logoutBtn">Logout</button></div>`;
  $("#logoutBtn").onclick = () => signOut(auth);
}

function setupRoleUI() {
  courseApplyForm.classList.add("hidden");
  teacherStudentsCard.classList.add("hidden");
  chatWrap.classList.add("hidden");

  if (currentProfile.role === "student") {
    courseApplyForm.classList.remove("hidden");
    const q = query(collection(db, "enrollments"), where("studentId", "==", currentUser.uid));
    onSnapshot(q, (snap) => {
      if (!snap.docs.length) return;
      const e = snap.docs[0].data();
      if (e.assignedTeacherId) {
        currentChatId = [currentUser.uid, e.assignedTeacherId].sort().join("__");
        chatWrap.classList.remove("hidden");
        chatMeta.textContent = `Teacher: ${e.assignedTeacherName}`;
        subscribeToChat(currentChatId);
      }
    });
  }

  if (currentProfile.role === "teacher") {
    teacherStudentsCard.classList.remove("hidden");
    chatWrap.classList.remove("hidden");
    const q = query(collection(db, "enrollments"), where("assignedTeacherId", "==", currentUser.uid));
    onSnapshot(q, (snap) => {
      teacherStudents.innerHTML = "";
      snap.forEach((d) => {
        const e = d.data();
        const div = document.createElement("div");
        div.className = "user-list-item";
        div.innerHTML = `<strong>${e.studentName}</strong><p>${e.studentEmail}</p><button data-sid="${e.studentId}" data-name="${e.studentName}">Open Chat</button>`;
        teacherStudents.appendChild(div);
      });
      teacherStudents.querySelectorAll("button").forEach((b) => {
        b.onclick = () => {
          currentChatId = [b.dataset.sid, currentUser.uid].sort().join("__");
          chatMeta.textContent = `Student: ${b.dataset.name}`;
          subscribeToChat(currentChatId);
        };
      });
    });
  }
}

function setupUnlockAdminPanel() {
  let keyBuffer = "";
  window.addEventListener("keydown", async (e) => {
    keyBuffer = (keyBuffer + e.key).toLowerCase().slice(-30);
    if (!keyBuffer.includes("adminmhmd")) return;
    if (currentProfile.role !== "admin") return;
    adminPanel.classList.remove("hidden");
    await loadAdminPanel();
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
    div.innerHTML = `<strong>${u.name || "No Name"}</strong><p>${u.email || ""}</p><p>Role: ${u.role || ""}</p>`;
    adminUsers.appendChild(div);
  });

  adminEnrollments.innerHTML = "";
  enrollSnap.forEach((d) => {
    const e = d.data();
    const row = document.createElement("div");
    row.className = "user-list-item";
    const options = teachers.map((t) => `<option value="${t.uid}" ${t.uid === e.assignedTeacherId ? "selected" : ""}>${t.name} (${t.email})</option>`).join("");
    row.innerHTML = `<strong>${e.studentName}</strong><p>Main Course: ${e.mainCourse || e.courseId || ""}</p><p>Tajweed Stage: ${e.tajweedStage || "N/A"}</p><select data-id="${d.id}"><option value="">Unassigned</option>${options}</select><button data-save="${d.id}">Assign Teacher</button>`;
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
