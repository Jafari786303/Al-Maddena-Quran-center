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
const langEn = document.querySelector("#langEn");
const langUr = document.querySelector("#langUr");

const courses = [
  {
    title: "Introduction to the Holy Quran",
    topics: [
      "History of Revelation (Wahi)", "Compilation of the Quran", "Makki and Madani Surahs",
      "Importance of the Quran in Daily Life", "Tawheed (Oneness of Allah)", "Attributes of Allah",
      "Prophethood (Risalat)", "Finality of Prophet Muhammad", "Angels in Islam", "Divine Books",
      "Akhirah (Life Hereafter)", "Day of Judgment", "Worship in Islam", "Salah (Prayer) in the Quran",
      "Fasting in the Quran", "Zakat and Charity", "Hajj and Pilgrimage", "Moral Teachings of the Quran",
      "Rights of Parents", "Rights of Neighbors and Society", "Women’s Rights in Islam",
      "Human Rights in the Quran", "Economic Teachings of Islam", "Justice and Equality",
      "Peace and Tolerance", "Stories of Prophets in the Quran", "Scientific Facts in the Quran",
      "Quranic Supplications (Duas)", "Practical Quranic Guidance for Modern Life"
    ]
  },
  {
    title: "Seerath",
    topics: [
      "Introduction to Seerah", "Arabia Before Islam", "Family Background of Prophet Muhammad ﷺ",
      "Birth of the Prophet ﷺ", "Childhood and Upbringing", "Youth of the Prophet ﷺ",
      "Trade and Honesty", "Marriage with Hazrat Khadijah (RA)", "Cave Hira and Worship",
      "First Revelation", "Early Preaching of Islam", "Persecution in Makkah", "Migration to Abyssinia",
      "Isra and Miraj", "Pledges of Aqabah", "Migration to Madinah", "Construction of Masjid-e-Nabawi",
      "Brotherhood in Madinah", "Battle of Badr", "Battle of Uhud", "Battle of the Trench",
      "Treaty of Hudaybiyyah", "Conquest of Makkah", "Farewell Sermon", "Character of the Prophet ﷺ",
      "Justice of the Prophet ﷺ", "Kindness Towards Women", "Love for Children", "Passing of the Prophet ﷺ"
    ]
  },
  {
    title: "Ahkam",
    topics: [
      "Introduction to Islamic Laws", "Rules of Purification", "Rules of Wudu", "Rules of Ghusl",
      "Method of Tayammum", "Rules of Salah", "Congregational Prayer", "Rules of Friday Prayer",
      "Rules of Fasting", "Rules of Zakat", "Charity and Sadaqah", "Rules of Hajj", "Rules of Umrah",
      "Halal and Haram", "Islamic Manners of Eating and Drinking", "Rules of Islamic Dress",
      "Rules of Marriage", "Rules of Divorce", "Laws of Inheritance", "Islamic Principles of Trade",
      "Prohibition of Interest (Riba)", "Loans and Trusts", "Rights of Parents", "Rights of Neighbors",
      "Rights of Husband and Wife", "Rights of Children", "Justice in Islam", "Islamic Social System",
      "Introduction to Hudood and Punishments", "Islamic Rulings for Daily Life"
    ]
  },
  {
    title: "Akhlaq",
    topics: [
      "Introduction to Ethics", "Importance of Good Character", "Truthfulness", "Honesty and Trustworthiness",
      "Patience and Tolerance", "Gratitude", "Humility", "Respect for Parents", "Respect for Teachers",
      "Respect for Elders", "Kindness to Youngers", "Good Behavior", "Brotherhood and Unity", "Forgiveness",
      "Keeping Promises", "Justice and Fairness", "Cleanliness and Purity", "Punctuality",
      "Hard Work and Integrity", "Avoiding Jealousy", "Controlling Anger", "Avoiding Backbiting and Slander",
      "Generosity and Charity", "Hospitality", "Helping Others", "Islamic Manners of Speech",
      "Choosing Good Friends", "Character of Prophet Muhammad ﷺ", "Social Ethics", "Islamic Ethics in Daily Life"
    ]
  }
];

const courseCards = document.querySelector("#courseCards");
const registerForm = document.querySelector("#registerForm");
const loginForm = document.querySelector("#loginForm");
const authStatus = document.querySelector("#authStatus");

courseCards.innerHTML = courses.map((c) => {
  const items = c.topics.slice(0, 6).map((t) => `<li>${t}</li>`).join("");
  return `<article class="course-card"><h4>${c.title}</h4><ul>${items}</ul><p class="note">+ ${Math.max(c.topics.length - 6, 0)} more topics</p></article>`;
}).join("");

const i18n = {
  en: { title: "Tajweed Center", heading: "Structured Islamic Learning for Mobile-First Students" },
  ur: { title: "تجوید سینٹر", heading: "موبائل صارفین کے لیے منظم اسلامی تعلیم" }
};
function setLanguage(lang) {
  const t = i18n[lang] || i18n.en;
  const h1 = document.querySelector(".brand h1");
  const h2 = document.querySelector(".hero-content h2");
  if (h1) h1.textContent = t.title;
  if (h2) h2.textContent = t.heading;
  localStorage.setItem("siteLang", lang);
}
langEn?.addEventListener("click", () => setLanguage("en"));
langUr?.addEventListener("click", () => setLanguage("ur"));
setLanguage(localStorage.getItem("siteLang") || "en");

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
    age: Number(fd.get("age") || existing.age || 0),
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
