# Admin User Setup Guide

## Quick Start

### Option 1: Automatic Setup (Recommended)

1. In your browser, navigate to: `http://localhost:3000/api/setup-admin`
2. You should see a success message if the admin user was created
3. If you see an error that the admin already exists, proceed to login

### Option 2: Manual Setup via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Authentication → Users
3. Click "Create new user"
4. Use these credentials:
   - **Email**: `kunnu@qbank.edu`
   - **Password**: `Pr@dMbbs2025`
   - Check "Auto Confirm User" to skip email verification
5. Click "Create user"
6. The profile will be automatically created by the database trigger

## Login as Admin

1. Go to your app homepage
2. Click "Login as Admin" button
3. Use the credentials:
   - **Email**: `kunnu@qbank.edu`
   - **Password**: `Pr@dMbbs2025`
4. You'll be redirected to the admin dashboard

## Admin Dashboard Features

Once logged in as admin, you can:

- **Manage Subjects**: Create, edit, and delete subjects
- **Upload Questions**: Add questions in bulk via JSON or individually
- **View Students**: See all registered students and their progress
- **Analytics**: Track overall performance metrics across all students
- **Monitor Progress**: View detailed per-student and per-subject analytics

## Question Upload Format

When uploading questions as JSON, use this format:

```json
{
  "subjects": [
    {
      "name": "Mathematics",
      "description": "Basic Mathematics Concepts",
      "chapters": [
        {
          "code": "MATH_01",
          "name": "Algebra Basics",
          "questions": [
            {
              "type": "mcq",
              "text": "What is 2 + 2?",
              "options": ["3", "4", "5", "6"],
              "correct": 1,
              "explanation": "2 + 2 equals 4"
            },
            {
              "type": "subjective",
              "text": "Solve: 2x + 4 = 10",
              "explanation": "x = 3. Subtract 4 from both sides: 2x = 6, then divide by 2"
            }
          ]
        }
      ]
    }
  ]
}
```

## Password Reset

To reset the admin password:

1. Go to `/auth/admin-login`
2. Instead of trying to reset, contact your Supabase admin
3. Or use the Supabase Dashboard to update the password directly

## Security Notes

- The admin setup endpoint should be secured in production (add authentication checks)
- Use environment variables for sensitive credentials
- Enable email verification for student signups
- Regularly monitor admin activities
- The demo credentials are for development only - change them in production
