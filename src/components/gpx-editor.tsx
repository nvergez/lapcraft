import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import type { Id } from '../../convex/_generated/dataModel'
import type { ActivityDocument } from '~/utils/dom-model'
import type { LapHandle } from '~/utils/dom-model'
import { exportGpx, exportTcx } from '~/utils/gpx-parser'
import {
  parseToDocument,
  getLapHandles,
  countLaps,
  deleteLap,
  splitLap,
  mergeLaps,
  renameLap,
  renameActivity,
  reorderLaps,
  exportOriginal,
  getTrackPointsFromElement,
} from '~/utils/dom-operations'
import { LapTable } from './lap-table'
import { ActivityMap } from './activity-map'
import { ElevationChart } from './elevation-chart'
import { LapPaceChart } from './lap-pace-chart'
import { Button } from '~/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  RotateCcw,
  ChevronDown,
  Info,
  X,
  FileDown,
  Undo2,
  Redo2,
  Pencil,
  Check,
} from 'lucide-react'
import { StravaLogo } from '~/utils/strava'
import { UndoManager } from '~/utils/undo-manager'

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_')
}

/** Compute aggregate stats from laps for persistence */
function computeActivitySummary(laps: LapHandle[]) {
  let totalDistance = 0
  let totalDuration = 0
  let totalElevationGain = 0
  for (const lap of laps) {
    totalDistance += lap.stats.distance
    totalDuration += lap.stats.duration
    totalElevationGain += lap.stats.elevationGain ?? 0
  }
  return {
    distance: totalDistance,
    duration: totalDuration,
    elevationGain: totalElevationGain || undefined,
    lapCount: laps.length,
  }
}

function ActivityNameEditor({
  name,
  onRename,
}: {
  name: string
  onRename: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function commit() {
    const trimmed = value.trim()
    if (trimmed && trimmed !== name) {
      onRename(trimmed)
    } else {
      setValue(name)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          className="font-serif text-2xl sm:text-3xl tracking-tight text-foreground leading-tight bg-transparent border-b border-foreground/30 outline-none w-full"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setValue(name)
              setEditing(false)
            }
          }}
        />
        <button
          onClick={commit}
          className="shrink-0 rounded-md p-1 hover:bg-muted transition-colors"
        >
          <Check className="size-4 text-muted-foreground" />
        </button>
      </div>
    )
  }

  return (
    <div className="group/name flex items-center gap-2">
      <h2 className="font-serif text-2xl sm:text-3xl tracking-tight text-foreground leading-tight">
        {name}
      </h2>
      <button
        onClick={() => {
          setValue(name)
          setEditing(true)
        }}
        className="shrink-0 rounded-md p-1 opacity-0 group-hover/name:opacity-100 hover:bg-muted transition-all"
        title="Rename activity"
      >
        <Pencil className="size-3.5 text-muted-foreground" />
      </button>
    </div>
  )
}

interface GpxEditorProps {
  activityId: Id<'activities'>
  initialXml: string
  source: 'file' | 'strava'
  stravaActivityId?: number
  onBack: () => void
  onSave: (data: {
    activityId: Id<'activities'>
    xmlContent: string
    name: string
    distance: number
    duration: number
    elevationGain?: number
    lapCount: number
  }) => void
}

export function GpxEditor({
  activityId,
  initialXml,
  source,
  stravaActivityId,
  onBack,
  onSave,
}: GpxEditorProps) {
  const [actDoc] = useState<ActivityDocument | null>(() => {
    try {
      const doc = parseToDocument(initialXml)
      return doc
    } catch {
      return null
    }
  })
  const [revision, setRevision] = useState(0)
  const undoManagerRef = useRef(new UndoManager())
  const [showGpxHint, setShowGpxHint] = useState(() => {
    if (!actDoc) return false
    return actDoc.sourceFormat === 'gpx' && countLaps(actDoc) === 1
  })
  const [crossFormatTarget, setCrossFormatTarget] = useState<'gpx' | 'tcx' | null>(null)
  const [hoveredLapId, setHoveredLapId] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const laps = useMemo(() => {
    if (!actDoc) return []
    void revision
    return getLapHandles(actDoc)
  }, [actDoc, revision])

  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const persistToConvex = useCallback(
    (doc: ActivityDocument, currentLaps: LapHandle[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const xml = exportOriginal(doc)
        const summary = computeActivitySummary(currentLaps)
        onSave({
          activityId,
          xmlContent: xml,
          name: doc.name,
          ...summary,
        })
      }, 500)
    },
    [activityId, onSave],
  )

  const bumpRevision = useCallback(() => {
    setRevision((r) => r + 1)
    setCanUndo(undoManagerRef.current.canUndo)
    setCanRedo(undoManagerRef.current.canRedo)
  }, [])

  // After each revision, persist (laps recalculated via useMemo on next render)
  useEffect(() => {
    if (!actDoc || revision === 0) return
    // Recompute laps directly for persistence (useMemo might not have run yet)
    const currentLaps = getLapHandles(actDoc)
    persistToConvex(actDoc, currentLaps)
  }, [actDoc, revision, persistToConvex])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const handleDeleteLap = useCallback(
    (lapId: string) => {
      if (!actDoc) return
      undoManagerRef.current.snapshot(actDoc)
      deleteLap(actDoc, lapId)
      bumpRevision()
      toast.success('Lap deleted')
    },
    [actDoc, bumpRevision],
  )

  const handleSplitLap = useCallback(
    (lapId: string, pointIndices: number[]) => {
      if (!actDoc) return
      undoManagerRef.current.snapshot(actDoc)
      splitLap(actDoc, lapId, pointIndices)
      bumpRevision()
      const parts = pointIndices.length + 1
      toast.success(`Lap split into ${parts} part${parts !== 1 ? 's' : ''}`)
    },
    [actDoc, bumpRevision],
  )

  const handleMergeLaps = useCallback(
    (lapIds: [string, string]) => {
      if (!actDoc) return
      undoManagerRef.current.snapshot(actDoc)
      mergeLaps(actDoc, lapIds[0], lapIds[1])
      bumpRevision()
      toast.success('Laps merged')
    },
    [actDoc, bumpRevision],
  )

  const handleRenameLap = useCallback(
    (lapId: string, newName: string) => {
      if (!actDoc) return
      undoManagerRef.current.snapshot(actDoc)
      renameLap(actDoc, lapId, newName)
      bumpRevision()
    },
    [actDoc, bumpRevision],
  )

  const handleReorderLaps = useCallback(
    (reorderedLaps: LapHandle[]) => {
      if (!actDoc) return
      undoManagerRef.current.snapshot(actDoc)
      reorderLaps(
        actDoc,
        reorderedLaps.map((l) => l.id),
      )
      bumpRevision()
    },
    [actDoc, bumpRevision],
  )

  const handleExportOriginal = useCallback(() => {
    if (!actDoc) return
    const baseName = sanitizeFilename(actDoc.name)
    const ext = actDoc.sourceFormat
    const content = exportOriginal(actDoc)
    const mimeType = ext === 'tcx' ? 'application/vnd.garmin.tcx+xml' : 'application/gpx+xml'
    downloadFile(content, `${baseName}_edited.${ext}`, mimeType)
    toast.success(`${ext.toUpperCase()} file exported (original format)`)
  }, [actDoc])

  const doCrossFormatExport = useCallback(
    (format: 'gpx' | 'tcx') => {
      if (!actDoc) return
      const baseName = sanitizeFilename(actDoc.name)

      const gpxData = {
        name: actDoc.name,
        sourceFormat: actDoc.sourceFormat,
        laps: laps.map((h) => {
          const points = getTrackPointsFromElement(h.element, actDoc.sourceFormat)
          return {
            id: h.id,
            name: h.name,
            points,
            startTime: points[0]?.time,
            endTime: points[points.length - 1]?.time,
            stats: h.stats,
          }
        }),
      }

      if (format === 'tcx') {
        downloadFile(exportTcx(gpxData), `${baseName}_edited.tcx`, 'application/vnd.garmin.tcx+xml')
        toast.success('TCX file exported')
      } else {
        downloadFile(exportGpx(gpxData), `${baseName}_edited.gpx`, 'application/gpx+xml')
        toast.success('GPX file exported')
      }
    },
    [actDoc, laps],
  )

  const handleExportCrossFormat = useCallback((format: 'gpx' | 'tcx') => {
    setCrossFormatTarget(format)
  }, [])

  const handleConfirmCrossFormat = useCallback(() => {
    if (crossFormatTarget) {
      doCrossFormatExport(crossFormatTarget)
    }
    setCrossFormatTarget(null)
  }, [crossFormatTarget, doCrossFormatExport])

  const handleUndo = useCallback(() => {
    if (!actDoc) return
    if (undoManagerRef.current.undo(actDoc)) bumpRevision()
  }, [actDoc, bumpRevision])

  const handleRedo = useCallback(() => {
    if (!actDoc) return
    if (undoManagerRef.current.redo(actDoc)) bumpRevision()
  }, [actDoc, bumpRevision])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleUndo, handleRedo])

  if (!actDoc) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground">Failed to parse activity data.</p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={onBack}>
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showGpxHint && (
        <div className="flex items-start gap-3 rounded-xl border border-chart-3/30 bg-chart-3/5 p-4 text-sm text-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-chart-3" />
          <div className="flex-1">
            <p className="font-medium">Only 1 lap detected</p>
            <p className="mt-0.5 text-muted-foreground">
              GPX files often merge all laps into a single track. If your activity has multiple
              laps, try importing the TCX version instead to preserve lap data.
            </p>
          </div>
          <button
            onClick={() => setShowGpxHint(false)}
            className="shrink-0 rounded-md p-1 hover:bg-muted transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Activity header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {actDoc.sourceFormat.toUpperCase()} Activity
            </p>
            {source === 'strava' && stravaActivityId && (
              <a
                href={`https://www.strava.com/activities/${stravaActivityId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-[#FC4C02]/10 px-2 py-0.5 text-xs text-[#FC4C02] hover:bg-[#FC4C02]/20 transition-colors"
                title="View on Strava"
              >
                <StravaLogo className="size-3" />
                Strava
              </a>
            )}
          </div>
          <ActivityNameEditor
            name={actDoc.name}
            onRename={(newName) => {
              undoManagerRef.current.snapshot(actDoc)
              renameActivity(actDoc, newName)
              bumpRevision()
            }}
          />
          <p className="text-sm text-muted-foreground">
            {laps.length} lap{laps.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="size-3.5" />
          </Button>
          <Button variant="ghost" onClick={onBack} size="sm">
            <RotateCcw className="size-3.5" />
            Back
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="sm" />}>
              <FileDown className="size-3.5" />
              Export
              <ChevronDown className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportOriginal}>
                Export as {actDoc.sourceFormat.toUpperCase()} (original)
              </DropdownMenuItem>
              {actDoc.sourceFormat !== 'gpx' && (
                <DropdownMenuItem onClick={() => handleExportCrossFormat('gpx')}>
                  Export as GPX
                </DropdownMenuItem>
              )}
              {actDoc.sourceFormat !== 'tcx' && (
                <DropdownMenuItem onClick={() => handleExportCrossFormat('tcx')}>
                  Export as TCX
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ActivityMap
        laps={laps}
        sourceFormat={actDoc.sourceFormat}
        revision={revision}
        hoveredLapId={hoveredLapId}
        onHoverLap={setHoveredLapId}
      />

      <ElevationChart
        laps={laps}
        sourceFormat={actDoc.sourceFormat}
        revision={revision}
        hoveredLapId={hoveredLapId}
        onHoverLap={setHoveredLapId}
      />

      <LapPaceChart laps={laps} hoveredLapId={hoveredLapId} onHoverLap={setHoveredLapId} />

      <LapTable
        laps={laps}
        sourceFormat={actDoc.sourceFormat}
        onDelete={handleDeleteLap}
        onSplit={handleSplitLap}
        onMerge={handleMergeLaps}
        onRename={handleRenameLap}
        onReorder={handleReorderLaps}
        hoveredLapId={hoveredLapId}
        onHoverLap={setHoveredLapId}
      />

      <AlertDialog
        open={crossFormatTarget !== null}
        onOpenChange={(open) => !open && setCrossFormatTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to {crossFormatTarget?.toUpperCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              Converting from {actDoc.sourceFormat.toUpperCase()} to{' '}
              {crossFormatTarget?.toUpperCase()} will lose some data that has no equivalent in the
              target format
              {actDoc.sourceFormat === 'tcx' && ' (calories, lap summaries, device info, etc.)'}
              {actDoc.sourceFormat === 'gpx' && ' (track type, description, links, etc.)'}. Use
              "Export as {actDoc.sourceFormat.toUpperCase()} (original)" for a lossless export.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCrossFormat}>Export anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
