'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Mic, Loader2, Clock, Tag, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Transcript = {
  id: string
  title: string
  summary: string | null
  content: string | null
  tags: string | null
  createdAt: string
}

function parseTags(tags: string | null): string[] {
  if (!tags) return []
  try { return JSON.parse(tags) } catch { return [] }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function extractKeyPoints(summary: string | null, content: string | null): string[] {
  const text = summary || content || ''
  if (!text) return []
  // Split into sentences and take first 3 as key points
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 15)
  return sentences.slice(0, 3)
}

export default function TranscriptsPage() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/records?type=transcript&limit=50')
      .then(r => r.json())
      .then(d => {
        if (d.records) setTranscripts(d.records)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="h-10 w-10 rounded-xl bg-pink-500/15 flex items-center justify-center shrink-0">
          <Mic className="h-5 w-5 text-pink-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Transcripts</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${transcripts.length} recording${transcripts.length !== 1 ? 's' : ''} captured`}
          </p>
        </div>
      </motion.div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
        </div>
      )}

      {!loading && transcripts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 rounded-2xl border border-dashed border-border/60">
          <div className="h-14 w-14 rounded-2xl bg-pink-500/10 flex items-center justify-center">
            <Mic className="h-7 w-7 text-pink-400/50" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">No transcripts yet</p>
          <p className="text-muted-foreground/60 text-xs text-center max-w-xs">
            Start a meeting or use the Chrome extension to record and transcribe conversations.
          </p>
        </div>
      )}

      {!loading && transcripts.length > 0 && (
        <div className="space-y-3">
          {transcripts.map((transcript, i) => {
            const tags = parseTags(transcript.tags).filter(t => t !== 'transcript')
            const keyPoints = extractKeyPoints(transcript.summary, transcript.content)

            return (
              <motion.div
                key={transcript.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href={`/app/memories/${transcript.id}`}>
                  <div className="group rounded-2xl border border-border/60 bg-background/60 hover:border-pink-500/20 hover:shadow-sm transition-all p-4">
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-pink-500/15 flex items-center justify-center shrink-0">
                          <Mic className="h-3.5 w-3.5 text-pink-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-pink-500 uppercase tracking-wider">Audio Recording</span>
                          </div>
                          <p className="text-sm font-semibold truncate group-hover:text-pink-500 transition-colors">
                            {transcript.title}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground/60">
                        <Clock className="h-3 w-3" />
                        <div className="text-right">
                          <p className="text-[11px]">{formatDate(transcript.createdAt)}</p>
                          <p className="text-[10px]">{formatTime(transcript.createdAt)}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    {/* Key points */}
                    {keyPoints.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {keyPoints.map((point, pi) => (
                          <div key={pi} className="flex items-start gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-pink-400/60 mt-1.5 shrink-0" />
                            <p className="text-xs text-muted-foreground line-clamp-1">{point}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Tag className="h-3 w-3 text-muted-foreground/40" />
                        {tags.slice(0, 5).map(tag => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px] px-2 py-0 h-5 border-pink-500/20 text-muted-foreground"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
