import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
const provider = new GoogleAuthProvider();

const courses = [
  { id: "tajweed_beginner", title: "Tajweed Beginner", desc: "Foundations, makharij, and essential rules." },
  { id: "tajweed_intermediate", title: "Tajweed Intermediate", desc: "Refined recitation and correction practice." },
  { id: "tajweed_expert", title: "Tajweed Expert", desc: "Advanced fluency, precision, and mastery." },
  { id: "teacher_course", title: "Teacher Course", desc: "Pedagogy and teaching preparation for Tajweed." }
];

const adminEmails = ["mhmd1212@gmail.com"];
let currentUser = null;
let currentProfile = null;
let currentChatId = null;
let chatUnsub = null;
let adminChatId = null;
let adminChatUnsub = null;

const $ = (s) => document.querySelector(s);
const courseCards = $("#courseCards");
const registerForm = $("#registerForm");
const loginForm = $("#loginForm");
const authStatus = $("#authStatus");
const userArea = $("#userArea");
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
const adminChatMeta = $("#adminChatMeta");
const adminChatMessages = $("#adminChatMessages");
const adminChatForm = $("#adminChatForm");

renderCourses();
setupUnlockAdminPanel();

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(registerForm);
  try {
    const cred = await createUserWithEmailAndPassword(auth, fd.get("email"), fd.get("password"));
    await ensureUserProfile(cred.user, {
      name: fd.get("name"),
      phone: fd.get("phone"),
      address: fd.get("address"),
      heardFrom: fd.get("heardFrom"),
      role: fd.get("role"),
      photoUrl: fd.get("photoUrl")
    });
    authStatus.textContent = "Registration complete.";
  } catch (err) {
    authStatus.textContent = err.message;
  }
});

$("#registerGoogle").addEventListener("click", async () => {
  try {
    const cred = await signInWithPopup(auth, provider);
    const role = registerForm.role.value || "student";
    await ensureUserProfile(cred.user, {
      name: cred.user.displayName || "",
      phone: registerForm.phone.value || "",
      address: registerForm.address.value || "",
      heardFrom: registerForm.heardFrom.value || "Google",
      role,
      photoUrl: cred.user.photoURL || registerForm.photoUrl.value || ""
    });
    authStatus.textContent = "Google login complete.";
  } catch (err) {
    authStatus.textContent = err.message;
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(loginForm);
  try {
    await signInWithEmailAndPassword(auth, fd.get("email"), fd.get("password"));
    authStatus.textContent = "Login successful.";
  } catch (err) {
    authStatus.textContent = err.message;
  }
});

$("#loginGoogle").addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
    authStatus.textContent = "Google login successful.";
  } catch (err) {
    authStatus.textContent = err.message;
  }
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    userArea.classList.add("hidden");
    currentProfile = null;
    return;
  }
  const profileRef = doc(db, "users", user.uid);
  const snap = await getDoc(profileRef);
  if (!snap.exists()) {
    await ensureUserProfile(user, {
      name: user.displayName || "",
      phone: "",
      address: "",
      heardFrom: "",
      role: "student",
      photoUrl: user.photoURL || ""
    });
  }
  currentProfile = (await getDoc(profileRef)).data();
  renderProfile();
  userArea.classList.remove("hidden");
  setupRoleUI();
});

courseApplyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(courseApplyForm);
  const enrollment = {
    studentId: currentUser.uid,
    studentName: currentProfile.name,
    studentEmail: currentProfile.email,
    courseId: fd.get("courseId"),
    freeTimes: fd.get("freeTimes"),
    previousExperience: fd.get("previousExperience"),
    assignedTeacherId: "",
    assignedTeacherName: "",
    createdAt: serverTimestamp()
  };
  await addDoc(collection(db, "enrollments"), enrollment);
  alert("Enrollment submitted. Admin will assign your teacher.");
  courseApplyForm.reset();
});

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentChatId) return;
  const fd = new FormData(chatForm);
  const text = String(fd.get("message")).trim();
  if (!text) return;
  await addDoc(collection(db, "chats", currentChatId, "messages"), {
    fromUid: currentUser.uid,
    fromName: currentProfile.name,
    message: text,
    createdAt: serverTimestamp()
  });
  chatForm.reset();
});

adminChatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!adminChatId || !currentUser) return;
  const fd = new FormData(adminChatForm);
  const text = String(fd.get("message")).trim();
  if (!text) return;
  await addDoc(collection(db, "chats", adminChatId, "messages"), {
    fromUid: currentUser.uid,
    fromName: currentProfile.name,
    message: text,
    createdAt: serverTimestamp()
  });
  adminChatForm.reset();
});

async function ensureUserProfile(user, input) {
  const ref = doc(db, "users", user.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return;
  const role = adminEmails.includes(user.email || "") ? "admin" : input.role;
  await setDoc(ref, {
    uid: user.uid,
    email: user.email || input.email || "",
    name: input.name || "",
    phone: input.phone || "",
    address: input.address || "",
    heardFrom: input.heardFrom || "",
    role,
    photoUrl: input.photoUrl || "",
    grades: role === "student" ? { tajweed: 0, pronunciation: 0, attendance: 0 } : {},
    createdAt: serverTimestamp()
  });
}

function renderCourses() {
  courseCards.innerHTML = courses.map((c) => `<article class="course-card"><h4>${c.title}</h4><p>${c.desc}</p></article>`).join("");
  const select = courseApplyForm.courseId;
  select.innerHTML = courses.map((c) => `<option value="${c.id}">${c.title}</option>`).join("");
}

function renderProfile() {
  const g = currentProfile.grades || {};
  profileCard.innerHTML = `
    <img src="${currentProfile.photoUrl || "https://placehold.co/120x120"}" alt="dp" />
    <div>
      <h4>${currentProfile.name || "No Name"}</h4>
      <p>${currentProfile.email} | ${currentProfile.phone || "No Number"}</p>
      <p>Role: ${currentProfile.role}</p>
      ${currentProfile.role === "student" ? `<p>Scores: Tajweed ${g.tajweed || 0}, Pronunciation ${g.pronunciation || 0}, Attendance ${g.attendance || 0}</p>` : ""}
      <button id="logoutBtn">Logout</button>
    </div>
  `;
  $("#logoutBtn").onclick = () => signOut(auth);
}

async function setupRoleUI() {
  courseApplyForm.classList.add("hidden");
  teacherStudentsCard.classList.add("hidden");
  chatWrap.classList.add("hidden");
  if (currentProfile.role === "student") {
    courseApplyForm.classList.remove("hidden");
    const q = query(collection(db, "enrollments"), where("studentId", "==", currentUser.uid));
    onSnapshot(q, async (snap) => {
      if (!snap.docs.length) return;
      const top = snap.docs[0].data();
      if (top.assignedTeacherId) {
        currentChatId = [currentUser.uid, top.assignedTeacherId].sort().join("__");
        chatWrap.classList.remove("hidden");
        chatMeta.textContent = `Teacher: ${top.assignedTeacherName}`;
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
        div.innerHTML = `<strong>${e.studentName}</strong><p>${e.studentEmail}</p><button data-student="${e.studentId}" data-name="${e.studentName}">Open Chat</button>`;
        teacherStudents.appendChild(div);
      });
      teacherStudents.querySelectorAll("button").forEach((btn) => {
        btn.onclick = () => {
          const sid = btn.dataset.student;
          currentChatId = [sid, currentUser.uid].sort().join("__");
          chatMeta.textContent = `Student: ${btn.dataset.name}`;
          subscribeToChat(currentChatId);
        };
      });
    });
  }
}

function setupUnlockAdminPanel() {
  let keyBuffer = "";
  window.addEventListener("keydown", async (e) => {
    keyBuffer = `${keyBuffer}${e.key}`.slice(-20).toLowerCase();
    if (!keyBuffer.includes("adminmhmd")) return;
    if (!currentUser) return;
    const me = await getDoc(doc(db, "users", currentUser.uid));
    const role = me.data()?.role;
    if (role !== "admin") return;
    adminPanel.classList.remove("hidden");
    loadAdminPanel();
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
    const chatBtn = u.role === "student" ? `<button data-admin-chat="${u.uid}" data-student-name="${u.name || "Student"}">Chat With Student</button>` : "";
    div.innerHTML = `<strong>${u.name || "No Name"}</strong><p>${u.email}</p><p>Role: ${u.role}</p>${chatBtn}`;
    adminUsers.appendChild(div);
  });
  adminUsers.querySelectorAll("button[data-admin-chat]").forEach((btn) => {
    btn.onclick = () => {
      const sid = btn.dataset.adminChat;
      adminChatId = [sid, currentUser.uid].sort().join("__");
      adminChatMeta.textContent = `Chat with ${btn.dataset.studentName}`;
      subscribeAdminChat(adminChatId);
    };
  });

  adminEnrollments.innerHTML = "";
  enrollSnap.forEach((d) => {
    const e = d.data();
    const row = document.createElement("div");
    row.className = "user-list-item";
    const options = teachers.map((t) => `<option value="${t.uid}" ${t.uid === e.assignedTeacherId ? "selected" : ""}>${t.name} (${t.email})</option>`).join("");
    row.innerHTML = `
      <strong>${e.studentName}</strong>
      <p>Course: ${e.courseId}</p>
      <p>Free times: ${e.freeTimes}</p>
      <select data-eid="${d.id}"><option value="">Unassigned</option>${options}</select>
      <button data-save="${d.id}" data-student="${e.studentId}">Assign Teacher</button>
    `;
    adminEnrollments.appendChild(row);
  });

  adminEnrollments.querySelectorAll("button[data-save]").forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.save;
      const select = adminEnrollments.querySelector(`select[data-eid="${id}"]`);
      const tid = select.value;
      const teacher = teachers.find((t) => t.uid === tid);
      await updateDoc(doc(db, "enrollments", id), {
        assignedTeacherId: tid,
        assignedTeacherName: teacher ? teacher.name : ""
      });
      alert("Teacher assigned.");
      loadAdminPanel();
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

function subscribeAdminChat(chatId) {
  if (adminChatUnsub) adminChatUnsub();
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
  adminChatUnsub = onSnapshot(q, (snap) => {
    adminChatMessages.innerHTML = "";
    snap.forEach((d) => {
      const m = d.data();
      const div = document.createElement("div");
      div.className = `msg ${m.fromUid === currentUser.uid ? "me" : "other"}`;
      div.textContent = `${m.fromName}: ${m.message}`;
      adminChatMessages.appendChild(div);
    });
    adminChatMessages.scrollTop = adminChatMessages.scrollHeight;
  });
}
