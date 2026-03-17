# QBank Setup Guide

Follow these steps to get your QBank instance up and running.

## Step 1: Supabase Project Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Create a new project
4. Note your **Project URL** and **Anon Key** from project settings

### 1.2 Get Your Credentials
1. In Supabase Dashboard, go to **Settings** > **API**
2. Copy the **Project URL**
3. Copy the **Anon (public)** key
4. You'll need these for the next step

## Step 2: Application Setup

### 2.1 Environment Variables
1. In the project root, create a `.env.local` file
2. Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2.2 Install Dependencies
```bash
npm install
# or if using pnpm
pnpm install
```

### 2.3 Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

## Step 3: Initial Account Creation

### 3.1 Create Your First Admin Account
1. Go to `http://localhost:3000`
2. Click "Sign up" on the login page
3. Fill in your details:
   - Full Name: Your name
   - Email: Your email
   - Password: Strong password (6+ characters)
4. Click "Sign up"
5. You'll see a confirmation screen - check your email for verification

### 3.2 Make Your Account an Admin
The signup process automatically creates a student account. To make it admin:

1. Go to Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run this query:

```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
```

Replace `your-email@example.com` with your email.

4. Log out and log back in
5. You should now have access to `/admin`

## Step 4: Adding Content

### 4.1 Create Your First Subject
1. Log in to your admin account
2. Go to **Admin Dashboard** > **Manage Subjects**
3. Click **"New Subject"**
4. Fill in:
   - Subject Name: e.g., "Mathematics"
   - Description: Brief description
5. Click **"Create Subject"**

### 4.2 Add Chapters
1. Go to **Admin Dashboard** > **Upload Questions**
2. Select your subject from the dropdown
3. Click **"New"** button next to chapter selector
4. Create chapter with:
   - Chapter Code: e.g., "CH01"
   - Chapter Name: e.g., "Algebra Basics"
5. Click **"Create Chapter"**

### 4.3 Add Questions

#### Option A: Single Question Upload
1. In **Upload Questions**, select the chapter
2. Go to **"Single Question"** tab
3. Fill in:
   - Question Type: MCQ or Subjective
   - Question Text: Your question
   - Options (for MCQ): Enter 4 options
   - Select correct option
   - Explanation (optional)
4. Click **"Add Question"**

#### Option B: Bulk Upload (JSON)
1. Switch to **"Bulk Upload (JSON)"** tab
2. Create JSON array of questions:

```json
[
  {
    "text": "What is 2+2?",
    "type": "mcq",
    "options": ["3", "4", "5", "6"],
    "correctOption": 1,
    "explanation": "2+2 equals 4"
  },
  {
    "text": "Describe photosynthesis",
    "type": "subjective",
    "explanation": "Process where plants convert light to energy..."
  }
]
```

3. Paste into the text area
4. Click **"Upload Questions"**

### 4.5 Load Sample Data
To quickly test with sample data:

1. Go to Supabase **SQL Editor**
2. Create new query
3. Copy and paste contents of `scripts/seed-data.sql`
4. Execute

This creates sample subjects and questions.

## Step 5: Invite Students

### 5.1 Share Access Link
1. Share your app URL with students (e.g., `http://localhost:3000` for local testing)
2. Students click "Sign up"
3. Create their accounts with email and password
4. They get access to student dashboard automatically

### 5.2 Monitor Student Progress
1. As admin, go to **Admin Dashboard** > **Students**
2. View list of all registered students
3. See their:
   - Total attempts
   - Correct answers
   - Accuracy percentage
   - Bookmarks saved
   - Join date

## Step 6: Configure Email (Optional)

For production deployment, configure email verification:

1. In Supabase Dashboard, go to **Auth** > **Providers**
2. Configure SMTP settings for email notifications
3. Update **Auth** > **Email Templates** as needed

Without this, users won't receive verification emails but can still use the app.

## Step 7: Deployment (Optional)

### Deploy to Vercel

1. Push your code to GitHub
2. Visit [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

Your app is now live on `yourdomain.vercel.app`

### Update Supabase Auth URLs
1. In Supabase, go to **Auth** > **URL Configuration**
2. Add your Vercel URL to "Redirect URLs"
3. Example: `https://yourdomain.vercel.app/auth/callback`

## Troubleshooting

### "Cannot GET /admin"
- Make sure you're logged in
- Verify your profile has `role = 'admin'`

### "RLS policy violation"
- Check if user is authenticated
- Verify profile exists for the user

### "Questions not showing"
- Ensure chapter_id is correct
- Check questions table in Supabase

### Email verification not received
- Check spam folder
- Verify email is configured in Supabase
- Use app without verification for testing

### Database quota exceeded
- Monitor free tier limits
- Consider upgrading Supabase plan

## Best Practices

1. **Backup Regularly**: Export your data from Supabase periodically
2. **Monitor Usage**: Check Supabase usage metrics
3. **Security**: Use strong passwords, enable 2FA for admin accounts
4. **Testing**: Test with sample data before going live
5. **Feedback**: Gather student feedback for improvements

## Getting Help

- Check the README.md for detailed feature documentation
- Review Supabase docs: https://supabase.com/docs
- Check Next.js docs: https://nextjs.org/docs
- Report issues on the project repository

---

You're all set! Start by creating subjects and adding questions, then invite your students to practice.
