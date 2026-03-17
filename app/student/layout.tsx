'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BookOpen, Clock3, LogOut, Menu, X } from 'lucide-react'
import Link from 'next/link'

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login')
        return
      }

      setUser(session.user)

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profileData?.role === 'admin') {
        router.push('/admin')
        return
      }

      setProfile(profileData)
    }

    checkAuth()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (!user || !profile) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-rose-200 animate-pulse">
            <BookOpen className="h-6 w-6 text-rose-600" />
          </div>
          <p className="text-rose-700 font-medium">Preparing your study space...</p>
        </div>
      </div>
    )
  }

  if (profile.role === 'student' && !profile.is_verified) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-8 shadow-sm space-y-4 text-center">
          <div className="mx-auto inline-flex items-center justify-center h-12 w-12 rounded-full bg-rose-100">
            <Clock3 className="h-6 w-6 text-rose-600" />
          </div>
          <h1 className="text-2xl font-bold text-rose-700">Account Pending Approval</h1>
          <p className="text-slate-600">
            Your student account is created, but content access is blocked until an admin verifies your profile.
          </p>
          <p className="text-sm text-slate-500">
            Please contact admin and try again after approval.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="gap-2 border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100">
      {/* Header with Pink Theme */}
      <header className="sticky top-0 z-50 border-b border-pink-200 bg-white/75 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-4">
          <Link href="/student" className="flex items-center gap-2.5 font-bold text-lg transition-transform hover:scale-105">
            <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-rose-400 to-rose-600">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-rose-700 hidden sm:inline">QBank</span>
          </Link>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 hover:bg-rose-50 rounded-lg transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <X className="h-5 w-5 text-rose-600" />
            ) : (
              <Menu className="h-5 w-5 text-rose-600" />
            )}
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/student"
              className="text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/student/subjects"
              className="text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors"
            >
              Subjects
            </Link>
            <Link
              href="/student/watch"
              className="text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors"
            >
              Watch
            </Link>
            <Link
              href="/student/bookmarks"
              className="text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors"
            >
              Bookmarks
            </Link>
            <div className="flex items-center gap-4 ml-auto pl-8 border-l border-rose-100">
              <span className="text-sm text-slate-600">
                {profile.full_name || profile.username}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </nav>
        </div>

        {/* Mobile nav */}
        {isOpen && (
          <nav className="md:hidden border-t border-rose-100 px-4 py-3 flex flex-col gap-2 bg-rose-50/50">
            <Link
              href="/student"
              className="px-3 py-2 rounded-lg text-sm font-medium text-rose-700 hover:bg-rose-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/student/subjects"
              className="px-3 py-2 rounded-lg text-sm font-medium text-rose-700 hover:bg-rose-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Subjects
            </Link>
            <Link
              href="/student/watch"
              className="px-3 py-2 rounded-lg text-sm font-medium text-rose-700 hover:bg-rose-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Watch
            </Link>
            <Link
              href="/student/bookmarks"
              className="px-3 py-2 rounded-lg text-sm font-medium text-rose-700 hover:bg-rose-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Bookmarks
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2 justify-start w-full text-rose-600 hover:bg-rose-100 hover:text-rose-700"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </nav>
        )}
      </header>

      {/* Main content - optimized for iPad Air */}
      <main className="flex-1 py-6 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
