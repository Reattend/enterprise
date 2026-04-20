'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  FolderKanban,
  Plus,
  Brain,
  ChevronRight,
  Loader2,
  Palette,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { TourTooltip } from '@/components/app/tour-tooltip'
import { cn } from '@/lib/utils'

type Project = {
  id: string
  name: string
  description: string | null
  color: string | null
  isDefault: boolean | null
  recordCount: number
  createdAt: string
}

type SortMode = 'last_opened' | 'top_interacted'

const projectColors = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#94a3b8',
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [creating, setCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('last_opened')

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      if (data.projects) {
        setProjects(data.projects)
      }
    } catch {
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim(),
          color: newColor,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to create project')
        return
      }
      setProjects(prev => [data.project, ...prev])
      toast.success(`Project "${newName}" created!`)
      setShowNewDialog(false)
      setNewName('')
      setNewDescription('')
      setNewColor('#6366f1')
    } catch {
      toast.error('Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  const filteredProjects = useMemo(() => {
    let list = [...projects]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      )
    }
    if (sortMode === 'top_interacted') {
      list = list.sort((a, b) => b.recordCount - a.recordCount)
    } else {
      // last_opened: sort by createdAt descending
      list = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return list
  }, [projects, searchQuery, sortMode])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-5xl"
    >
      {/* Header */}
      <div className="rounded-xl border bg-gradient-to-r from-primary/5 via-background to-primary/5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <TourTooltip
              tourKey="projects"
              title="Projects"
              description="Group related memories into projects. AI can also suggest project groupings for you."
            >
              <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            </TourTooltip>
            <p className="text-sm text-muted-foreground mt-1">
              Create projects to organize your memories.<br />
              Start by adding a project, then create memories inside it.
            </p>
          </div>
          <Button size="lg" onClick={() => setShowNewDialog(true)} className="shadow-md">
            <Plus className="h-5 w-5 mr-2" />
            Add Project
          </Button>
        </div>
      </div>

      {/* Search + Sort row */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-9"
              onKeyDown={(e) => e.key === 'Escape' && setSearchQuery('')}
            />
          </div>
          <Button
            variant="default"
            size="sm"
            className="shrink-0"
            onClick={() => {/* search is live */}}
          >
            Search
          </Button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setSortMode('last_opened')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
              sortMode === 'last_opened'
                ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                : 'bg-background text-muted-foreground border-border hover:border-[#4F46E5]/40 hover:text-foreground'
            )}
          >
            Last opened
          </button>
          <button
            onClick={() => setSortMode('top_interacted')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
              sortMode === 'top_interacted'
                ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                : 'bg-background text-muted-foreground border-border hover:border-[#4F46E5]/40 hover:text-foreground'
            )}
          >
            Top interacted
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="text-center py-20 border rounded-xl bg-muted/20">
          <FolderKanban className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold mb-1">No projects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first project to start organizing memories.
          </p>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create First Project
          </Button>
        </div>
      )}

      {/* No search results */}
      {!loading && projects.length > 0 && filteredProjects.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No projects match &ldquo;{searchQuery}&rdquo;
        </div>
      )}

      {/* Projects Grid */}
      {!loading && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link href={`/app/projects/${project.id}`}>
                <div className="rounded-xl border border-border/60 bg-background hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group p-4">
                  <div className="flex items-start justify-between">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: project.color || '#6366f1' }}
                    >
                      {project.name[0]}
                    </div>
                    {project.isDefault && (
                      <Badge variant="secondary" className="text-[10px]">Default</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                  </div>
                  <h3 className="font-semibold text-sm mt-3 group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {project.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-1 mt-4 text-xs text-muted-foreground">
                    <Brain className="h-3 w-3" />
                    {project.recordCount} {project.recordCount === 1 ? 'memory' : 'memories'}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          {/* Add Project card */}
          {!searchQuery && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: filteredProjects.length * 0.04 }}
            >
              <div
                className="rounded-xl border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center min-h-[148px]"
                onClick={() => setShowNewDialog(true)}
              >
                <div className="text-center">
                  <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-muted-foreground">Add Project</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* New Project Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>Group related memories into a project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Product Development"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateProject() }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1">
                <Palette className="h-3.5 w-3.5" />
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {projectColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      newColor === color ? 'scale-110 border-foreground' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateProject} disabled={!newName.trim() || creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
