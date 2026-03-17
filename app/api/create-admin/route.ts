import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/create-admin
 * 
 * This endpoint creates the admin user for QBank.
 * Visit this URL in your browser to set up the admin account.
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Admin credentials
    const adminEmail = 'anupriyachauhan0007@gmail.com'
    const adminPassword = 'Pr@dMbbs2025'

    // Check if admin already exists by username
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id, username, role')
      .eq('username', 'kunnu')

    if (existingProfiles && existingProfiles.length > 0) {
      return Response.json(
        {
          success: false,
          message: 'Admin user already exists!',
          username: 'kunnu',
          email: adminEmail,
          instructions: 'Use your existing password to login at /auth/admin-login',
        },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existingEmails } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', adminEmail)

    if (existingEmails && existingEmails.length > 0) {
      return Response.json(
        {
          success: false,
          message: 'An account with this email already exists',
        },
        { status: 400 }
      )
    }

    // Sign up WITHOUT email confirmation to avoid rate limiting
    const { data, error: signupError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          full_name: 'Admin',
          username: 'kunnu',
          role: 'admin',
        },
        // Disable email confirmation to avoid rate limiting
        emailRedirectTo: undefined,
      },
    })

    if (signupError) {
      console.error('Signup error:', signupError)

      // Check if it's an email rate limit error
      if (signupError.message?.includes('rate limit') || signupError.status === 429) {
        return Response.json(
          {
            success: false,
            message: 'Email rate limit exceeded. Please wait a few minutes and try again.',
            code: 'RATE_LIMIT',
          },
          { status: 429 }
        )
      }

      return Response.json(
        {
          success: false,
          message: `Error: ${signupError.message}`,
          code: signupError.code,
        },
        { status: 400 }
      )
    }

    if (data.user) {
      // Wait for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 500))

      // Verify profile was created
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        // Manually create profile if trigger failed
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: 'kunnu',
            role: 'admin',
            full_name: 'Admin',
          })

        if (insertError) {
          console.error('Profile creation error:', insertError)
          return Response.json(
            {
              success: false,
              message: 'Admin user created but profile setup failed. Please contact support.',
            },
            { status: 500 }
          )
        }
      }

      return Response.json(
        {
          success: true,
          message: 'Admin user created successfully! You can now login.',
          loginUrl: '/auth/admin-login',
          credentials: {
            email: adminEmail,
            password: adminPassword,
            username: 'kunnu',
          },
          note: 'Email confirmation is NOT required. You can login immediately.',
        },
        { status: 201 }
      )
    }

    return Response.json(
      {
        success: false,
        error: 'Failed to create admin user - no user data returned'
      },
      { status: 500 }
    )
  } catch (error) {
    console.error('Setup error:', error)
    return Response.json(
      {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}
