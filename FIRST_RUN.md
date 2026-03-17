# QBank - First Run Setup Guide

Welcome to QBank! This guide will help you set up the admin account and get started.

## Quick Start (3 Steps)

### Step 1: Database Setup ✓
Your Supabase database has already been configured with all required tables and indexes. Nothing to do here!

### Step 2: Create Admin Account
Visit this URL in your browser to create the admin account:

```
http://localhost:3000/setup
```

Or directly:
```
http://localhost:3000/api/create-admin
```

**Default Admin Credentials:**
- Email: `kunnu@qbank.edu`
- Password: `Pr@dMbbs2025`
- Username: `kunnu`

The page will guide you through the creation process.

### Step 3: Login to Admin Panel
Once the admin account is created, visit:

```
http://localhost:3000/auth/admin-login
```

Enter the credentials from Step 2 to access the admin dashboard.

---

## What You Can Do as Admin

### 1. Manage Subjects
- **URL:** `/admin/subjects`
- Create new subjects
- Edit existing subjects
- Delete subjects

### 2. Upload Questions
- **URL:** `/admin/upload`
- Upload MCQ questions
- Upload subjective questions
- Bulk upload via JSON file

**Sample JSON Format:**
```json
{
  "chapter_id": "chapter-uuid",
  "questions": [
    {
      "question_type": "mcq",
      "question_text": "What is 2+2?",
      "options": ["3", "4", "5", "6"],
      "correct_option": 1,
      "explanation": "2+2 equals 4"
    },
    {
      "question_type": "subjective",
      "question_text": "Explain Newton's First Law",
      "explanation": "An object in motion stays in motion..."
    }
  ]
}
```

### 3. Monitor Students
- **URL:** `/admin/students`
- View all registered students
- Check their progress
- Monitor attempts and accuracy

### 4. View Analytics
- **URL:** `/admin/analytics`
- Subject-wise performance
- Daily attempt trends
- Student accuracy distribution
- Overall platform statistics

---

## Student Access

Students can:
1. Create their own account at `/auth/signup`
2. Login at `/auth/login`
3. Browse subjects and chapters
4. Practice questions
5. Track their progress
6. Bookmark important questions
7. View their analytics

---

## Troubleshooting

### "Invalid email or password" error
- Make sure the admin account was created successfully
- Visit `/setup` again to check status
- If admin exists, try logging in with the exact credentials
- Email: `kunnu@qbank.edu` (not admin@qbank.edu)

### "You do not have admin access" error
- The account exists but is not marked as admin
- Contact support or delete the user and create again

### Database connection issues
- Check your Supabase URL and keys in `.env.local`
- Ensure Supabase is running and your account is active
- Check Row Level Security (RLS) policies are enabled

### Profile not created
- If the trigger didn't create a profile automatically
- The system will manually create it
- Wait a few seconds and refresh

---

## Next Steps

1. **Create Subjects:** Go to `/admin/subjects` and create at least one subject
2. **Create Chapters:** Add chapters to your subjects
3. **Upload Questions:** Go to `/admin/upload` and add questions
4. **Invite Students:** Share `/auth/login` with your students to sign up
5. **Monitor Progress:** Check `/admin/analytics` to see student performance

---

## Support

If you encounter any issues:
1. Check the browser console for error messages (F12)
2. Review the Supabase dashboard logs
3. Ensure all environment variables are set correctly
4. Check that RLS policies are enabled on all tables

Enjoy using QBank!
