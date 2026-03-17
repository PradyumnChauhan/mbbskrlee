'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen, ArrowRight, Sparkles } from 'lucide-react'

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const { data } = await supabase
          .from('subjects')
          .select('*')
          .order('created_at', { ascending: false })

        setSubjects(data || [])
      } catch (error) {
        console.error('Failed to load subjects:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSubjects()
  }, [supabase])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-rose-200 animate-pulse mb-4">
            <BookOpen className="h-6 w-6 text-rose-600" />
          </div>
          <p className="text-slate-600 font-medium">Loading subjects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-rose-500" />
          <h1 className="text-4xl font-bold text-slate-900">All Subjects</h1>
        </div>
        <p className="text-slate-500 text-lg">Choose a subject to start practicing and boost your knowledge</p>
      </div>

      {subjects.length === 0 ? (
        <Card className="border-rose-100 bg-gradient-to-br from-rose-50 to-pink-50">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-rose-100">
                <BookOpen className="h-8 w-8 text-rose-600" />
              </div>
              <p className="text-slate-600 text-lg font-medium">No subjects available yet</p>
              <p className="text-slate-500">Please check back soon!</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {subjects.map((subject: any, index: number) => {
            const colors = [
              { bg: 'from-rose-400 to-rose-600', icon: 'bg-rose-100', text: 'text-rose-600' },
              { bg: 'from-pink-400 to-pink-600', icon: 'bg-pink-100', text: 'text-pink-600' },
              { bg: 'from-red-400 to-red-600', icon: 'bg-red-100', text: 'text-red-600' },
              { bg: 'from-orange-400 to-orange-600', icon: 'bg-orange-100', text: 'text-orange-600' },
            ]
            const color = colors[index % colors.length]

            return (
              <Link key={subject.id} href={`/student/subject/${subject.id}`} className="group">
                <Card className="h-full border-rose-100 bg-white hover:shadow-lg hover:border-rose-200 transition-all duration-300 overflow-hidden">
                  {/* Color Bar */}
                  <div className={`h-1 bg-gradient-to-r ${color.bg}`} />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`inline-flex items-center justify-center h-10 w-10 rounded-lg ${color.icon} group-hover:scale-110 transition-transform`}>
                            <BookOpen className={`h-5 w-5 ${color.text}`} />
                          </div>
                        </div>
                        <CardTitle className="text-xl group-hover:text-rose-600 transition-colors">{subject.name}</CardTitle>
                        {subject.description && (
                          <CardDescription className="mt-2 line-clamp-2">{subject.description}</CardDescription>
                        )}
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <Button className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white group-hover:shadow-lg transition-all">
                      Start Practicing
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
