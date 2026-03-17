'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'

interface Provider {
  id: string
  name: string
  description: string
}

interface Subject {
  id: string
  name: string
  description: string
}

export default function SubjectProvidersPage() {
  const params = useParams()
  const router = useRouter()
  const subjectId = params.subjectId as string

  const [subject, setSubject] = useState<Subject | null>(null)
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [subjectId])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Get subject
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('id, name, description')
        .eq('id', subjectId)
        .single()

      if (subjectError) throw subjectError
      setSubject(subjectData)

      // Get providers
      const { data: providersData, error: providersError } = await supabase
        .from('video_providers')
        .select('id, name, description')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false })

      if (providersError) throw providersError
      setProviders(providersData || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin inline-block mb-4 text-pink-600" />
          <p className="text-pink-600 font-medium">Loading providers...</p>
        </div>
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="text-center py-20">
        <p className="text-pink-600 text-lg">Subject not found</p>
        <Button onClick={() => router.back()} className="mt-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/student/watch" className="text-pink-600 hover:underline font-medium">
          Watch Videos
        </Link>
        <span className="text-pink-300">/</span>
        <span className="text-pink-600 font-medium">{subject.name}</span>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl p-8 border border-pink-300 shadow-lg">
        <h1 className="text-4xl font-bold text-white">{subject.name}</h1>
        {subject.description && (
          <p className="text-pink-100 mt-3 text-lg">{subject.description}</p>
        )}
      </div>

      {/* Providers Grid */}
      {providers.length === 0 ? (
        <Card className="border-dashed border-pink-300 bg-pink-50">
          <CardContent className="py-12 text-center text-pink-600">
            <p className="text-lg font-medium">No providers available</p>
            <p className="text-sm">Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {providers.map(provider => (
            <Link key={provider.id} href={`/student/watch/${subjectId}/${provider.id}`}>
              <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer border-pink-200 hover:border-pink-400 bg-gradient-to-br from-white to-pink-50 hover:from-pink-50 hover:to-pink-100">
                <CardHeader>
                  <CardTitle className="text-xl text-pink-900">{provider.name}</CardTitle>
                  {provider.description && (
                    <CardDescription className="line-clamp-2 text-pink-600">
                      {provider.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white">
                    View Versions <ArrowRight className="h-4 w-4 ml-2" />
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
