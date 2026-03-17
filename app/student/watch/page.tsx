'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen, ArrowRight, Loader2 } from 'lucide-react'

interface Subject {
  id: string
  name: string
  description: string
}

export default function StudentWatchPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadSubjects()
  }, [])

  const loadSubjects = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, description')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubjects(data || [])
    } catch (error) {
      console.error('Failed to load subjects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin inline-block mb-4 text-pink-600" />
          <p className="text-pink-600 font-medium">Loading subjects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl p-8 border border-pink-300 shadow-lg">
        <h1 className="text-4xl font-bold text-white">Watch Videos</h1>
        <p className="text-pink-100 mt-3 text-lg">
          Learn from curated YouTube playlists by subject, provider, and version
        </p>
      </div>

      {/* Subjects Grid */}
      {subjects.length === 0 ? (
        <Card className="border-dashed border-pink-300 bg-pink-50">
          <CardContent className="py-12 text-center text-pink-600">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-pink-400" />
            <p className="text-lg font-medium">No subjects available yet</p>
            <p className="text-sm">Check back soon for video content!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map(subject => (
            <Link key={subject.id} href={`/student/watch/${subject.id}`}>
              <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer border-pink-200 hover:border-pink-400 bg-gradient-to-br from-white to-pink-50 hover:from-pink-50 hover:to-pink-100">
                <CardHeader>
                  <CardTitle className="text-xl text-pink-900">{subject.name}</CardTitle>
                  {subject.description && (
                    <CardDescription className="line-clamp-2 text-pink-600">
                      {subject.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white">
                    Explore <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
