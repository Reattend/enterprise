'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getTaskMode } from '@/lib/ai/task-modes'
import { TaskModePanel } from '@/components/enterprise/task-mode-panel'

export default function TaskDetailPage() {
  const params = useParams()
  const taskId = params.taskId as string
  const mode = getTaskMode(taskId)

  if (!mode) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-4">Unknown task.</p>
        <Button asChild><Link href="/app/tasks">Back to tasks</Link></Button>
      </div>
    )
  }

  return <TaskModePanel mode={mode} />
}
