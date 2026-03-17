'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BookOpen, LogOut, Menu, X, Play, UploadCloud, Home, BarChart3, UserCheck } from 'lucide-react'
import Link from 'next/link'

export default function AdminLayout({
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
      <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-200 animate-pulse mb-4">
            <BookOpen className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-blue-700 font-medium">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-svh w-64 border-r border-blue-200 bg-gradient-to-b from-blue-600 to-blue-700 transition-transform md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} z-40 shadow-lg`}>
        <div className="flex flex-col h-full p-4">
          {/* Logo */}
          <Link href="/admin" className="flex items-center gap-3 font-bold mb-8 text-white hover:text-blue-100 transition-colors">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white/20">
              <BookOpen className="h-6 w-6" />
            </div>
            <span>QBank Admin</span>
          </Link>

          {/* Navigation Sections */}
          <nav className="flex flex-col gap-6 flex-1">
            {/* Main Section */}
            <div className="space-y-2">
              <p className="px-3 text-xs font-semibold text-blue-100 uppercase tracking-wider">Main</p>
              <Link href="/admin">
                <Button variant="ghost" className="w-full justify-start text-blue-50 hover:text-white hover:bg-blue-500 transition-colors" onClick={() => setIsOpen(false)}>
                  <Home className="h-4 w-4 mr-3" />
                  Dashboard
                </Button>
              </Link>
            </div>

            {/* Content Management Section */}
            <div className="space-y-2">
              <p className="px-3 text-xs font-semibold text-blue-100 uppercase tracking-wider">Content</p>
              <Link href="/admin/watch">
                <Button variant="ghost" className="w-full justify-start text-blue-50 hover:text-white hover:bg-blue-500 transition-colors" onClick={() => setIsOpen(false)}>
                  <Play className="h-4 w-4 mr-3" />
                  Videos
                </Button>
              </Link>
              <Link href="/admin/subjects">
                <Button variant="ghost" className="w-full justify-start text-blue-50 hover:text-white hover:bg-blue-500 transition-colors" onClick={() => setIsOpen(false)}>
                  <BookOpen className="h-4 w-4 mr-3" />
                  Subjects
                </Button>
              </Link>
              <Link href="/admin/upload">
                <Button variant="ghost" className="w-full justify-start text-blue-50 hover:text-white hover:bg-blue-500 transition-colors" onClick={() => setIsOpen(false)}>
                  <UploadCloud className="h-4 w-4 mr-3" />
                  Upload Questions
                </Button>
              </Link>
            </div>

            {/* Analytics Section */}
            <div className="space-y-2">
              <p className="px-3 text-xs font-semibold text-blue-100 uppercase tracking-wider">Analytics</p>
              <Link href="/admin/analytics">
                <Button variant="ghost" className="w-full justify-start text-blue-50 hover:text-white hover:bg-blue-500 transition-colors" onClick={() => setIsOpen(false)}>
                  <BarChart3 className="h-4 w-4 mr-3" />
                  Detailed Analysis
                </Button>
              </Link>
            </div>

            <div className="space-y-2">
              <p className="px-3 text-xs font-semibold text-blue-100 uppercase tracking-wider">Users</p>
              <Link href="/admin/students">
                <Button variant="ghost" className="w-full justify-start text-blue-50 hover:text-white hover:bg-blue-500 transition-colors" onClick={() => setIsOpen(false)}>
                  <UserCheck className="h-4 w-4 mr-3" />
                  Verify Students
                </Button>
              </Link>
            </div>
          </nav>

          {/* User Info & Logout */}
          <div className="space-y-3 border-t border-blue-500 pt-4">
            <div className="px-3 py-2 bg-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-100">Logged in as</p>
              <p className="text-sm font-semibold text-white truncate">{profile.full_name || profile.username}</p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-blue-50 hover:text-white hover:bg-blue-500 transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 md:hidden border-b border-blue-200 bg-white shadow-sm">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="font-bold text-blue-900">QBank Admin</h1>
            <button
              className="md:hidden text-blue-600"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 py-6 px-4 md:px-8 overflow-auto">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
