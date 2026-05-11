import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
const adminEmails = ["mhmdhaffi42@gmail.com"];

const courses = [
  { title: "Quranyath", desc: "Includes Tajweed submenu and levels." },
  { title: "Ahkam", desc: "Islamic rulings and applied understanding." },
  { title: "Akhlaq", desc: "Character building and Islamic manners." },
  { title: "Seerath", desc: "Life of Prophet Muhammad (PBUH)." }
];

const courseCards = document.querySelector("#courseCards");
const registerForm = document.querySelector("#registerForm");
const loginForm = document.querySelector("#loginForm");
const authStatus = document.querySelector("#authStatus");

courseCards.innerHTML = courses.map((c) => '<article class="course-card"><h4>' + c.title + '</h4><p>' + c.desc + '</p></article>').join('');

let authActionInProgress = false;
onAuthStateChanged(auth, async (user) => {
  if (!user || authActionInProgress) return;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    window.location.href = "./dashboard.html";
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(registerForm);
  try {
    authActionInProgress = true;
    const cred = await createUserWithEmailAndPassword(auth, fd.get("email"), fd.get("password"));
    await ensureProfile(cred.user, fd);
    alert("Registration successful. Redirecting to dashboard.");
    window.location.href = "./dashboard.html";
  } catch (err) { authStatus.textContent = err.message; }
  finally { authActionInProgress = false; }
});

document.querySelector("#registerGoogle").addEventListener("click", async () => {
  try {
    authActionInProgress = true;
    const cred = await signInWithPopup(auth, provider);
    await ensureProfile(cred.user, new FormData(registerForm));
    alert("Google authentication successful. Redirecting to dashboard.");
    window.location.href = "./dashboard.html";
  } catch (err) { authStatus.textContent = err.message; }
  finally { authActionInProgress = false; }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(loginForm);
  try {
    authActionInProgress = true;
    await signInWithEmailAndPassword(auth, fd.get("email"), fd.get("password"));
    alert("Login successful.");
    window.location.href = "./dashboard.html";
  } catch (err) { authStatus.textContent = err.message; }
  finally { authActionInProgress = false; }
});

document.querySelector("#loginGoogle").addEventListener("click", async () => {
  try {
    authActionInProgress = true;
    await signInWithPopup(auth, provider);
    alert("Google login successful.");
    window.location.href = "./dashboard.html";
  } catch (err) { authStatus.textContent = err.message; }
  finally { authActionInProgress = false; }
});

async function ensureProfile(user, fd) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : {};
  const selectedRole = fd.get("role") || existing.role || "student";
  const role = adminEmails.includes(user.email || "") ? "admin" : selectedRole;
  await setDoc(ref, {
    uid: user.uid,
    email: user.email || fd.get("email") || existing.email || "",
    name: fd.get("name") || user.displayName || existing.name || "",
    phone: fd.get("phone") || existing.phone || "",
    address: fd.get("address") || existing.address || "",
    heardFrom: fd.get("heardFrom") || existing.heardFrom || "",
    role,
    photoUrl: fd.get("photoUrl") || user.photoURL || existing.photoUrl || "",
    grades: role === "student"
      ? (existing.grades || { tajweed: 0, pronunciation: 0, attendance: 0 })
      : {},
    createdAt: existing.createdAt || serverTimestamp()
  }, { merge: true });
}
