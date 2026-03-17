# QBank - Question Bank Application

A comprehensive web-based question bank platform built with Next.js, Supabase, and shadcn/ui. QBank enables educators to create and manage question repositories while students can practice and track their progress.

## Features

### Student Features
- **Beautiful Dashboard**: Modern, interactive dashboard with gradient pink theme
- **Subject-wise Analytics**: Bar and pie charts showing performance by subject
- **Detailed Progress Tracking**: View accuracy, attempts, and correct answers per subject
- **Browse Subjects & Chapters**: Navigate through organized study materials
- **Practice Mode**: Solve MCQ and subjective questions with explanations
- **Progress Tracking**: Monitor attempts, correct answers, and accuracy
- **Bookmarks**: Save questions for later review
- **Interactive UI**: Smooth animations and hover effects throughout the app

### Admin Features
- **Dedicated Admin Login**: Separate login page with secure authentication
- **Subject Management**: Create and organize subjects
- **Chapter Management**: Add chapters within subjects
- **Question Management**: Upload questions individually or in bulk (JSON)
- **Student Monitoring**: View all registered students and their progress
- **Analytics Dashboard**: Comprehensive insights into student performance
- **Reporting**: Subject-wise and daily attempt statistics
- **Dark Admin Interface**: Professional dark mode for the admin panel

## Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **UI Components**: shadcn/ui with Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with JWT
- **Charts**: Recharts for visualizations
- **Icons**: Lucide React

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or pnpm package manager
- Supabase account (free tier available)

### 1. Environment Setup

Create a `.env.local` file in the project root with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings.

### 2. Admin User Setup (Easy Mode)

**IMPORTANT**: Create the admin account using our setup wizard.

Visit: **`http://localhost:3000/setup`**

This interactive page will:
- Guide you through creating the admin account
- Show creation status in real-time
- Provide login credentials
- Direct you to the admin dashboard

**Default Admin Credentials:**
- Email: `kunnu@qbank.edu`
- Password: `Pr@dMbbs2025`

After creation, login at: **`http://localhost:3000/auth/admin-login`**

See [FIRST_RUN.md](./FIRST_RUN.md) for complete setup guide and troubleshooting.

### 3. Database Setup

The database schema is automatically created when you execute the migration. The schema includes:

- **profiles**: User profiles linked to auth.users
- **subjects**: Subject containers for questions
- **chapters**: Chapters within subjects
- **questions**: Question storage with JSONB for flexible data
- **student_progress**: Tracks student attempts and answers
- **bookmarks**: Saves frequently reviewed questions
- **chapter_progress**: View for analytics

### 3. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 4. Seed Sample Data (Optional)

To populate the database with sample subjects, chapters, and questions, run the seed script in your Supabase SQL editor:

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy contents of `scripts/seed-data.sql`
4. Execute

This will create sample content for Math, Physics, and Chemistry subjects.

### 5. Run Development Server

```bash
npm run dev
# or
pnpm dev
```

The app will be available at `http://localhost:3000`

## Usage

### For Admins
1. **First Admin Account**: Create an account via signup page (you'll need to manually set admin role in Supabase)
2. **Set Role**: In Supabase, update the user's profile to have `role = 'admin'`
3. **Access Admin**: Navigate to `/admin` after logging in
4. **Create Content**: 
   - Go to "Manage Subjects" and create subjects
   - Add chapters to subjects
   - Upload questions individually or in bulk

### For Students
1. **Create Account**: Sign up via the signup page
2. **View Dashboard**: See overall progress metrics
3. **Browse Subjects**: Visit the Subjects page to see available study materials
4. **Practice**: Click on a subject, then a chapter to start practicing
5. **Track Progress**: Monitor accuracy and attempts
6. **Bookmark Questions**: Save questions you want to review later

## Question Format

### MCQ Questions
```json
{
  "text": "What is the capital of France?",
  "type": "mcq",
  "options": ["London", "Paris", "Berlin", "Madrid"],
  "correctOption": 1,
  "explanation": "Paris is the capital of France."
}
```

### Subjective Questions
```json
{
  "text": "Write an essay on climate change.",
  "type": "subjective",
  "explanation": "Optional explanation or answer guide"
}
```

### Bulk Upload Format
Upload as JSON array in the admin panel:

```json
[
  {
    "text": "Question 1?",
    "type": "mcq",
    "options": ["A", "B", "C", "D"],
    "correctOption": 0,
    "explanation": "Answer is A because..."
  },
  {
    "text": "Question 2?",
    "type": "subjective",
    "explanation": "Expected answer..."
  }
]
```

## Database Schema

### Key Tables

**profiles**
- Linked to auth.users via foreign key
- Stores username, role (admin/student), full_name

**subjects**
- name, description, created_by user
- One-to-many with chapters

**chapters**
- subject_id, chapter_code, chapter_name, description
- Unique constraint on (subject_id, chapter_code)

**questions**
- chapter_id, question_type, question_data (JSONB)
- Stores both MCQ and subjective questions

**student_progress**
- Tracks each student's attempt on each question
- Stores answer data and attempt status
- Unique constraint on (student_id, question_id)

**bookmarks**
- student_id, question_id relationships
- Allows students to mark questions for review

## Security

- **Row Level Security (RLS)**: All tables have RLS policies
- **Student Data Privacy**: Students can only access their own progress and bookmarks
- **Admin Controls**: Only admin users can create/modify subjects and questions
- **Secure Authentication**: JWT tokens via Supabase Auth
- **HTTPS-only Cookies**: Session management with secure cookies

## Deployment

### Deploy to Vercel
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy - Vercel will automatically build and deploy

The app is production-ready and scales with Supabase's free tier for small deployments.

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers supported

## Performance Optimization

- Server-side data fetching where possible
- Progressive loading of questions
- Optimized database indexes on frequently queried columns
- Lazy loading of images and components

## Support & Troubleshooting

### Common Issues

**"RLS Policy Rejection"**: Ensure user is authenticated and profile exists
**"Questions not loading"**: Check chapter_id is correct and questions exist in database
**"Redirect loop on login"**: Verify Supabase environment variables are correct

## License

This project is provided as-is for educational use.

## Future Enhancements

Potential features for future versions:
- Real-time collaboration for admins
- AI-powered question suggestions
- Student-to-student discussion forums
- PDF export of reports
- Mobile app with offline support
- Spaced repetition algorithm for study recommendations
