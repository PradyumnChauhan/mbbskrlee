import { createClient } from '@/lib/supabase/server'

/**
 * Create admin user - Run this once to set up the admin account
 * Call this from an API route or use the Supabase admin panel
 */
export async function setupAdminUser() {
  const supabase = createClient()
  
  const email = 'kunnu@qbank.edu'
  const password = 'Pr@dMbbs2025'
  
  try {
    // Try to sign up the admin user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: 'Admin User',
          role: 'admin',
          username: 'kunnu',
        },
      },
    })

    if (error) {
      console.error('Error creating admin user:', error)
      return { error: error.message }
    }

    if (data.user) {
      console.log('Admin user created:', data.user.id)
      return { success: true, userId: data.user.id }
    }
  } catch (err) {
    console.error('Exception:', err)
    return { error: 'Failed to create admin user' }
  }
}
