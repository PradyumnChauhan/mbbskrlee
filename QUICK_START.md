# QBank - Quick Start Guide

## 🚀 Get Started in 3 Minutes

### Step 1: Run the Application
```bash
npm install
npm run dev
```
Application runs at: `http://localhost:3000`

### Step 2: Create Admin Account
Open your browser and visit:
```
http://localhost:3000/setup
```

Click **"Create Admin User"** button. The system will:
- ✅ Create admin account automatically
- ✅ Show you the credentials
- ✅ Confirm success

**Admin Credentials:**
- Email: `kunnu@qbank.edu`
- Password: `Pr@dMbbs2025`

### Step 3: Login as Admin
Visit: `http://localhost:3000/auth/admin-login`

Use the credentials from Step 2.

---

## 📌 Key URLs

### Admin
| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/admin` | View stats and recent activity |
| Subjects | `/admin/subjects` | Manage subjects |
| Upload | `/admin/upload` | Add questions |
| Students | `/admin/students` | Monitor students |
| Analytics | `/admin/analytics` | View performance data |

### Student
| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/student` | View progress and analytics |
| Subjects | `/student/subjects` | Browse subjects |
| Practice | `/student/chapter/[id]` | Answer questions |
| Bookmarks | `/student/bookmarks` | View saved questions |

### Auth
| Page | URL | Purpose |
|------|-----|---------|
| Setup | `/setup` | Create admin account |
| Admin Login | `/auth/admin-login` | Admin sign in |
| Student Login | `/auth/login` | Student sign in |
| Student Signup | `/auth/signup` | Create student account |

---

## 👨‍💼 Admin Quick Tasks

### Create a Subject
1. Go to `/admin/subjects`
2. Click "Create Subject"
3. Enter name and description
4. Save

### Create Chapters
1. Go to `/admin/subjects`
2. Click on a subject
3. Click "Add Chapter"
4. Enter chapter name and description
5. Save

### Upload Questions
1. Go to `/admin/upload`
2. Select a chapter
3. Upload questions as:
   - **Single Question**: Enter text directly
   - **Bulk Upload**: Upload JSON file

#### JSON Format Example
```json
{
  "questions": [
    {
      "question_type": "mcq",
      "question_text": "What is 2+2?",
      "options": ["3", "4", "5", "6"],
      "correct_option": 1,
      "explanation": "The answer is 4"
    },
    {
      "question_type": "subjective",
      "question_text": "Explain photosynthesis",
      "explanation": "Photosynthesis is the process..."
    }
  ]
}
```

### View Student Progress
1. Go to `/admin/students`
2. Click on a student
3. View their:
   - Total attempts
   - Correct answers
   - Accuracy percentage
   - Subject-wise stats

### Check Analytics
1. Go to `/admin/analytics`
2. View:
   - Subject performance chart
   - Daily attempt trends
   - Student distribution
   - Overall success rate

---

## 👨‍🎓 Student Quick Tasks

### Sign Up
1. Go to `/auth/signup`
2. Enter name, email, password
3. Click "Sign Up"
4. Redirected to dashboard

### Login
1. Go to `/auth/login`
2. Enter email and password
3. Click "Login"
4. Redirected to dashboard

### Practice Questions
1. Go to `/student/subjects`
2. Click on a subject
3. Click on a chapter
4. Answer questions
5. View explanations

### Bookmark Questions
- Click the bookmark icon on any question
- View bookmarks at `/student/bookmarks`
- Remove bookmark with one click

### Check Progress
1. Go to `/student` (Dashboard)
2. View:
   - Total attempts
   - Correct answers
   - Overall accuracy
   - Performance per subject
   - Charts showing progress

---

## 🔧 Troubleshooting

### Admin Login Fails
**Problem:** Invalid credentials error

**Solution:**
1. Visit `/setup` again
2. Check if admin account was created
3. If exists, try exact credentials from setup page
4. Clear browser cache and retry

### Profile Not Created After Signup
**Problem:** Student account exists but profile doesn't

**Solution:**
- System automatically creates profile
- Wait 1-2 seconds
- Refresh page
- If still issue, logout and login again

### Questions Not Showing
**Problem:** Uploaded questions don't appear

**Solution:**
1. Check chapter was selected before upload
2. Verify JSON format is correct
3. Check browser console for errors (F12)
4. Refresh the page

### Charts Not Loading
**Problem:** Analytics charts are blank

**Solution:**
1. Ensure student has attempted questions
2. Clear browser cache
3. Check browser console (F12) for errors
4. Verify JavaScript is enabled

### Can't Upload JSON
**Problem:** JSON upload fails

**Solution:**
1. Validate JSON format (use jsonlint.com)
2. Ensure file is .json
3. Check field names match exactly
4. Verify file size is reasonable

---

## 📊 Admin Dashboard Overview

**Stats Cards:**
- **Subjects**: Total created subjects
- **Questions**: Total uploaded questions  
- **Students**: Total registered students
- **Attempts**: Total practice attempts
- **Success Rate**: Overall accuracy percentage

**Recent Activity:**
- Shows latest 5 student attempts
- Color-coded status (correct/incorrect)
- Timestamp for each attempt

**Quick Actions:**
- Manage Subjects
- Upload Questions
- View Students
- Analytics Dashboard

---

## 💡 Tips & Tricks

### For Admins
1. **Organization**: Create one subject per course
2. **Chapters**: Divide subjects into chapters by topic
3. **Questions**: Mix MCQ and subjective for variety
4. **Monitoring**: Check analytics daily to see trends
5. **Updates**: Update questions based on student performance

### For Students
1. **Practice Regularly**: Do questions daily for better retention
2. **Review Explanations**: Read explanations to understand concepts
3. **Bookmark Important**: Save difficult questions for revision
4. **Track Progress**: Monitor accuracy to identify weak areas
5. **Ask for Help**: Contact admin if questions have errors

---

## 🆘 Getting Help

### Check These Files
- `README.md` - Full documentation
- `FIRST_RUN.md` - Detailed setup guide
- `IMPLEMENTATION_SUMMARY.md` - Technical overview

### Common Issues
See **Troubleshooting** section above.

### Browser Console
Press `F12` → Console tab to see error messages.

### Supabase Dashboard
Check Supabase project for database errors and logs.

---

## 🎯 Next Steps

1. ✅ Create admin account
2. ✅ Create first subject
3. ✅ Create chapters
4. ✅ Upload sample questions
5. ✅ Create test student account
6. ✅ Practice a question as student
7. ✅ Check analytics as admin
8. ✅ Invite real students to the platform

---

**You're all set! Happy learning! 🎓**
