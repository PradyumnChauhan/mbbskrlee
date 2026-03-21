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

export default function StudentLoginPage() {
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
      
      router.push('/student')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-pink-50 via-white to-rose-50">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">QBank</h1>
            <p className="text-sm text-slate-600">
              Master your subjects, one question at a time
            </p>
          </div>
          <Card className="border-pink-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100">
              <CardTitle className="text-2xl text-pink-700">Student Login</CardTitle>
              <CardDescription className="text-slate-600">
                Enter your email and password to continue learning
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="border-pink-200 focus:border-pink-400 focus:ring-pink-300"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="border-pink-200 focus:border-pink-400 focus:ring-pink-300"
                    />
                  </div>
                  {error && (
                    <div className="rounded-md bg-rose-50 border border-rose-200 p-3">
                      <p className="text-sm text-rose-700">{error}</p>
                    </div>
                  )}
                  <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-medium">
                    {isLoading ? 'Logging in...' : 'Login as Student'}
                  </Button>
                </div>
                <div className="mt-6 flex flex-col gap-3">
                  <Link href="/auth/reset-password" className="block">
                    <Button variant="ghost" className="w-full text-pink-400 hover:text-pink-300 hover:bg-pink-50/50">
                      Forgot Password?
                    </Button>
                  </Link>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-pink-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-slate-600">or</span>
                    </div>
                  </div>
                  <Link href="/auth/admin-login" className="block">
                    <Button variant="outline" className="w-full border-pink-200 hover:bg-pink-50 text-slate-700">
                      Login as Admin
                    </Button>
                  </Link>
                </div>
                <div className="mt-4 text-center text-sm text-slate-600">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/auth/signup"
                    className="font-medium text-pink-600 hover:text-pink-700 underline underline-offset-4"
                  >
                    Sign up here
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
