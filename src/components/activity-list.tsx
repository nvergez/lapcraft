import { useState, useRef, useEffect } from 'react'
import type { Doc } from '../../convex/_generated/dataModel'
import type { Id } from '../../convex/_generated/dataModel'
import { formatDistance, formatDuration } from '~/utils/gpx-parser'
import { Clock, Route, Mountain, Trash2, Upload, StretchHorizontal, Pencil } from 'lucide-react'
import { StravaLogo } from '~/utils/strava'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'

interface ActivityListProps {
  activities: Doc<'activities'>[]
  onOpen: (activityId: Id<'activities'>) => void
  onDelete: (activityId: Id<'activities'>) => void
  onRename: (activityId: Id<'activities'>, name: string) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function sportIcon(sport?: string): string {
  if (!sport) return '\u{1F3CB}\u{FE0F}'
  const lower = sport.toLowerCase()
  if (lower.includes('run')) return '\u{1F3C3}'
  if (lower.includes('rid') || lower.includes('cycl') || lower.includes('bik')) return '\u{1F6B4}'
  if (lower.includes('swim')) return '\u{1F3CA}'
  if (lower.includes('hik') || lower.includes('walk')) return '\u{1F6B6}'
  if (lower.includes('ski')) return '\u{26F7}\u{FE0F}'
  return '\u{1F3CB}\u{FE0F}'
}

export function ActivityList({ activities, onOpen, onDelete, onRename }: ActivityListProps) {
  const [editingId, setEditingId] = useState<Id<'activities'> | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  function startRename(activity: Doc<'activities'>) {
    setEditingId(activity._id)
    setEditValue(activity.name)
  }

  function commitRename() {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-xl tracking-tight text-foreground">Your activities</h3>
        <span className="text-xs text-muted-foreground">
          {activities.length} activit{activities.length === 1 ? 'y' : 'ies'}
        </span>
      </div>

      <div className="space-y-1.5">
        {activities.map((activity) => (
          <div
            key={activity._id}
            className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-muted/60 cursor-pointer"
            onClick={() => editingId !== activity._id && onOpen(activity._id)}
          >
            <span className="text-lg shrink-0">{sportIcon(activity.sport)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {editingId === activity._id ? (
                  <input
                    ref={inputRef}
                    className="text-sm font-medium bg-transparent border-b border-foreground/30 outline-none py-0 px-0 w-full"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p className="text-sm font-medium truncate">{activity.name}</p>
                )}
                {activity.source === 'strava' && activity.stravaActivityId && (
                  <a
                    href={`https://www.strava.com/activities/${activity.stravaActivityId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="View on Strava"
                  >
                    <StravaLogo className="size-3 shrink-0 text-[#FC4C02]/60 hover:text-[#FC4C02] transition-colors" />
                  </a>
                )}
                {activity.source === 'strava' && !activity.stravaActivityId && (
                  <StravaLogo className="size-3 shrink-0 text-[#FC4C02]/60" />
                )}
                {activity.source === 'file' && (
                  <Upload className="size-3 shrink-0 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                {activity.activityDate && <span>{formatDate(activity.activityDate)}</span>}
                <span className="flex items-center gap-1">
                  <Route className="size-3" />
                  {formatDistance(activity.distance)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatDuration(activity.duration)}
                </span>
                {activity.elevationGain != null && activity.elevationGain > 0 && (
                  <span className="flex items-center gap-1">
                    <Mountain className="size-3" />
                    {Math.round(activity.elevationGain)}m
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <StretchHorizontal className="size-3" />
                  {activity.lapCount} lap{activity.lapCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="shrink-0 rounded-md p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    startRename(activity)
                  }}
                >
                  <Pencil className="size-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(activity._id)
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  )
}
