'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { CheckCircle, AlertCircle, Loader } from 'lucide-react'

export default function SetupPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [adminData, setAdminData] = useState<any>(null)

  const createAdmin = async () => {
    setStatus('loading')
    setMessage('Creating admin user...')

    try {
      const response = await fetch('/api/create-admin')
      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setAdminData(data)
        setMessage(data.message)
      } else {
        setStatus('error')
        if (data.code === 'RATE_LIMIT') {
          setMessage(data.message + ' Please wait a few minutes and try again.')
        } else {
          setMessage(data.message || 'Failed to create admin user')
        }
      }
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <Card className="border-pink-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100">
            <CardTitle className="text-3xl text-pink-700">QBank Setup</CardTitle>
            <CardDescription className="text-slate-600">
              Complete the initial setup to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="p-4 border border-pink-200 rounded-lg bg-gradient-to-r from-pink-50 to-transparent">
                <h3 className="font-bold text-slate-800 mb-2">Step 1: Database Ready</h3>
                <p className="text-sm text-slate-600">
                  Your Supabase database has been set up with all required tables and indexes.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-700">✓ Database schema created</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`p-4 border rounded-lg ${status === 'success'
                ? 'border-green-200 bg-green-50'
                : 'border-pink-200 bg-gradient-to-r from-pink-50 to-transparent'
                }`}>
                <h3 className="font-bold text-slate-800 mb-3">Step 2: Create Admin User</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Click the button below to create the admin account with the credentials:
                </p>
                <div className="bg-white p-3 rounded border border-pink-200 mb-4 text-sm space-y-1">
                  <div><strong>Email:</strong> anupriyachauhan0007@gmail.com</div>
                  <div><strong>Password:</strong> Pr@dMbbs2025</div>
                  <div><strong>Username:</strong> kunnu</div>
                  <div><strong>Role:</strong> Admin</div>
                </div>

                {status === 'loading' && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded mb-4">
                    <Loader className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-700">{message}</span>
                  </div>
                )}

                {status === 'success' && (
                  <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded mb-4">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-green-700 font-medium">✓ Admin user created successfully!</p>
                      <p className="text-xs text-green-600 mt-1">You can now log in as admin</p>
                    </div>
                  </div>
                )}

                {status === 'error' && (
                  <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded mb-4">
                    <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-rose-700 font-medium">{message}</p>
                      {message.includes('already exists') && (
                        <p className="text-xs text-rose-600 mt-1">Admin user is already set up. You can proceed to login.</p>
                      )}
                      {message.includes('rate limit') && (
                        <p className="text-xs text-rose-600 mt-1">This is temporary. The system will be ready again soon.</p>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={createAdmin}
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-medium disabled:opacity-50"
                >
                  {status === 'success' ? 'Admin User Created ✓' : status === 'loading' ? 'Creating...' : 'Create Admin User'}
                </Button>
                {status === 'error' && !message.includes('rate limit') && (
                  <Button
                    onClick={createAdmin}
                    className="w-full mt-2 bg-slate-600 hover:bg-slate-700 text-white font-medium"
                  >
                    Try Again
                  </Button>
                )}
              </div>

              {/* Step 3 */}
              <div className={`p-4 border rounded-lg ${status === 'success'
                ? 'border-green-200 bg-green-50'
                : 'border-slate-200 bg-slate-50'
                }`}>
                <h3 className="font-bold text-slate-800 mb-3">Step 3: Login as Admin</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Once the admin user is created, you can log in to the admin dashboard:
                </p>
                <Link href="/auth/admin-login" className="block">
                  <Button
                    variant="outline"
                    className="w-full border-pink-300 hover:bg-pink-50 text-slate-700"
                    disabled={status !== 'success' && status !== 'error'}
                  >
                    Go to Admin Login →
                  </Button>
                </Link>
              </div>

              {/* Alternative for students */}
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                <h3 className="font-bold text-slate-800 mb-2">Student Login</h3>
                <p className="text-sm text-slate-600 mb-3">
                  If you're a student, create an account and start learning:
                </p>
                <Link href="/auth/login" className="block">
                  <Button variant="outline" className="w-full border-slate-300 hover:bg-slate-100">
                    Student Login / Sign Up →
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
