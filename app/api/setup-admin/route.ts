import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/setup-admin
 * 
 * This endpoint creates the admin user for QBank.
 * Should only be called once during initial setup.
 * 
 * Security: In production, this should be protected by authentication
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Admin credentials
    const email = 'anupriyachauhan0007@gmail.com'
    const password = 'Pr@dMbbs2025'

    // Check if admin already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', 'kunnu')
      .single()

    if (existingUser) {
      return Response.json(
        { error: 'Admin user already exists' },
        { status: 400 }
      )
    }

    // Create the admin user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: 'Admin User',
        role: 'admin',
        username: 'kunnu',
      },
      email_confirm: true, // Auto-confirm email
    })

    if (error) {
      console.error('Error creating admin user:', error)
      return Response.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (data.user) {
      // Profile will be auto-created by the trigger
      return Response.json(
        {
          success: true,
          message: 'Admin user created successfully',
          userId: data.user.id,
          email: data.user.email,
        },
        { status: 201 }
      )
    }

    return Response.json(
      { error: 'Failed to create admin user' },
      { status: 500 }
    )
  } catch (error) {
    console.error('Setup error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
