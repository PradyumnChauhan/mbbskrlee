'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      
      // Verify admin role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (profile?.role === 'admin') {
          router.push('/admin')
        } else {
          setError('You do not have admin access')
          await supabase.auth.signOut()
        }
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 text-center">
            <h1 className="text-4xl font-bold text-white">QBank</h1>
            <p className="text-sm text-slate-300">
              Admin Portal - Manage Questions and Students
            </p>
          </div>
          <Card className="border-slate-700 bg-slate-800 shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-700">
              <CardTitle className="text-2xl text-white">Admin Login</CardTitle>
              <CardDescription className="text-slate-300">
                Enter your admin credentials to access the management panel
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-slate-200 font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@qbank.edu"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="border-slate-600 bg-slate-700 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-slate-200 font-medium">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="border-slate-600 bg-slate-700 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/50"
                    />
                  </div>
                  {error && (
                    <div className="rounded-md bg-red-900/30 border border-red-700 p-3">
                      <p className="text-sm text-red-200">{error}</p>
                    </div>
                  )}
                  <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium">
                    {isLoading ? 'Verifying...' : 'Login as Admin'}
                  </Button>
                </div>
                <div className="mt-6 flex flex-col gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-slate-800 text-slate-400">or</span>
                    </div>
                  </div>
                  <Link href="/auth/login" className="block">
                    <Button variant="outline" className="w-full border-slate-600 hover:bg-slate-700 text-slate-200 hover:text-white">
                      Login as Student
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <p className="text-xs text-slate-400">Demo Credentials:</p>
            <p className="text-sm text-slate-300 font-mono mt-1">Email: kunnu@qbank.edu</p>
            <p className="text-sm text-slate-300 font-mono">Password: Pr@dMbbs2025</p>
          </div>
        </div>
      </div>
    </div>
  )
}
