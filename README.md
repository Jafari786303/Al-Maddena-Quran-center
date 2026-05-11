# Al-Madeena Tajweed Center

## Features Implemented
- Professional homepage with branding, about, guidance, and course cards.
- One-time registration form with role selection (`student` / `teacher`).
- Login with email/password and Google.
- Student course enrollment form with free-time and prior-course questions.
- Teacher dashboard showing assigned students.
- Modern chat UI for student-teacher messaging.
- Hidden admin panel unlock by typing `adminmhmd` anywhere on page.
- Admin can view users, view enrollment forms, and assign teacher from graphical dropdown.
- Student profile shows DP URL image, name, number, email, and grades.
- Firebase Firestore used (no Firebase Storage used).

## Important Security Note
- Firebase Authentication does **not** expose user passwords to admin or frontend.
- You can manage users in Firebase Console, but you cannot read plain passwords.

## Setup
1. Open Firebase Console > Authentication:
- Enable `Email/Password`.
- Enable `Google` provider.
- Add authorized domain if needed.

2. Open Firestore Database:
- Create database in production or test mode.
- Open Rules tab and paste content from `firestore.rules`.

3. Admin user:
- In `app.js`, `adminEmails` controls who is admin.
- Current default admin: `mhmd1212@gmail.com`.

4. Run locally:
- Serve the folder using any static server.
- Example: `npx serve /home/deathmaster/Desktop/al-madeena-tajweed-center`

## Data Model
- `users/{uid}`: profile, role, grades.
- `enrollments/{id}`: student course applications and assigned teacher.
- `chats/{sortedStudentTeacherUid}/messages/{id}`: chat messages.
