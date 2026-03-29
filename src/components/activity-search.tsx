import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { Doc } from '../../convex/_generated/dataModel'
import { formatDistance, formatDuration } from '~/utils/gpx-parser'
import { sportIcon, formatActivityDate } from '~/utils/activity-formatting'
import { Clock, Route, Mountain, Search } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '~/components/ui/command'

interface ActivitySearchProps {
  activities: Doc<'activities'>[]
}

export function ActivitySearch({ activities }: ActivitySearchProps) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleSelect = useCallback(
    (slug: string) => {
      setOpen(false)
      navigate({
        to: '/activities/$slug',
        params: { slug },
      })
    },
    [navigate],
  )

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="pointer-events-none hidden h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search activities"
        description="Search your activities by name"
      >
        <Command>
          <CommandInput placeholder="Search activities..." />
          <CommandList>
            <CommandEmpty>No activities found.</CommandEmpty>
            <CommandGroup heading="Activities">
              {activities.map((activity) => (
                <CommandItem
                  key={activity._id}
                  value={`${activity.name} ${activity.sport ?? ''} ${activity._id}`}
                  onSelect={() => handleSelect(activity.slug)}
                  className="gap-3"
                >
                  <span className="text-base shrink-0">{sportIcon(activity.sport)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {activity.activityDate && (
                        <span>{formatActivityDate(activity.activityDate)}</span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <Route className="size-3" />
                        {formatDistance(activity.distance)}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="size-3" />
                        {formatDuration(activity.duration)}
                      </span>
                      {activity.elevationGain != null && activity.elevationGain > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Mountain className="size-3" />
                          {Math.round(activity.elevationGain)}m
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
