import { useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import type { ActivityDocument } from '~/utils/dom-model'
import type { LapHandle } from '~/utils/dom-model'
import { exportGpx, exportTcx } from '~/utils/gpx-parser'
import {
  parseToDocument,
  getLapHandles,
  deleteLap,
  splitLap,
  mergeLaps,
  renameLap,
  reorderLaps,
  exportOriginal,
  getTrackPointsFromElement,
} from '~/utils/dom-operations'
import { GpxUpload } from './GpxUpload'
import { LapTable } from './LapTable'
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
import { Download, RotateCcw, ChevronDown, Info, X } from 'lucide-react'

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

export function GpxEditor() {
  const [actDoc, setActDoc] = useState<ActivityDocument | null>(null)
  const [revision, setRevision] = useState(0)
  const [showGpxHint, setShowGpxHint] = useState(false)
  const [crossFormatTarget, setCrossFormatTarget] = useState<'gpx' | 'tcx' | null>(null)

  const laps = useMemo(() => {
    if (!actDoc) return []
    // revision is used to trigger recomputation after DOM mutations
    void revision
    return getLapHandles(actDoc)
  }, [actDoc, revision])

  const bumpRevision = useCallback(() => setRevision((r) => r + 1), [])

  const handleFileLoaded = useCallback((xmlString: string) => {
    try {
      const doc = parseToDocument(xmlString)
      const handles = getLapHandles(doc)
      if (handles.length === 0) {
        toast.error('No tracks/laps found in this file')
        return
      }
      setActDoc(doc)
      setRevision(0)
      setShowGpxHint(doc.sourceFormat === 'gpx' && handles.length === 1)
      toast.success(`Loaded "${doc.name}" with ${handles.length} lap(s)`)
    } catch (e) {
      toast.error(`Failed to parse file: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }, [])

  const handleDeleteLap = useCallback((lapId: string) => {
    if (!actDoc) return
    deleteLap(actDoc, lapId)
    bumpRevision()
    toast.success('Lap deleted')
  }, [actDoc, bumpRevision])

  const handleSplitLap = useCallback((lapId: string, pointIndex: number) => {
    if (!actDoc) return
    splitLap(actDoc, lapId, pointIndex)
    bumpRevision()
    toast.success('Lap split into two')
  }, [actDoc, bumpRevision])

  const handleMergeLaps = useCallback((lapIds: [string, string]) => {
    if (!actDoc) return
    mergeLaps(actDoc, lapIds[0], lapIds[1])
    bumpRevision()
    toast.success('Laps merged')
  }, [actDoc, bumpRevision])

  const handleRenameLap = useCallback((lapId: string, newName: string) => {
    if (!actDoc) return
    renameLap(actDoc, lapId, newName)
    bumpRevision()
  }, [actDoc, bumpRevision])

  const handleReorderLaps = useCallback((reorderedLaps: LapHandle[]) => {
    if (!actDoc) return
    reorderLaps(actDoc, reorderedLaps.map((l) => l.id))
    bumpRevision()
  }, [actDoc, bumpRevision])

  const handleExportOriginal = useCallback(() => {
    if (!actDoc) return
    const baseName = sanitizeFilename(actDoc.name)
    const ext = actDoc.sourceFormat
    const content = exportOriginal(actDoc)
    const mimeType = ext === 'tcx' ? 'application/vnd.garmin.tcx+xml' : 'application/gpx+xml'
    downloadFile(content, `${baseName}_edited.${ext}`, mimeType)
    toast.success(`${ext.toUpperCase()} file exported (original format)`)
  }, [actDoc])

  const doCrossFormatExport = useCallback((format: 'gpx' | 'tcx') => {
    if (!actDoc) return
    const baseName = sanitizeFilename(actDoc.name)

    // Build GpxData-like structure for cross-format export
    const handles = getLapHandles(actDoc)
    const gpxData = {
      name: actDoc.name,
      sourceFormat: actDoc.sourceFormat,
      laps: handles.map((h) => {
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
  }, [actDoc])

  const handleExportCrossFormat = useCallback((format: 'gpx' | 'tcx') => {
    setCrossFormatTarget(format)
  }, [])

  const handleConfirmCrossFormat = useCallback(() => {
    if (crossFormatTarget) {
      doCrossFormatExport(crossFormatTarget)
    }
    setCrossFormatTarget(null)
  }, [crossFormatTarget, doCrossFormatExport])

  const handleReset = useCallback(() => {
    setActDoc(null)
    setRevision(0)
    setShowGpxHint(false)
  }, [])

  if (!actDoc) {
    return <GpxUpload onFileLoaded={handleFileLoaded} />
  }

  return (
    <div className="space-y-6">
      {showGpxHint && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Only 1 lap detected</p>
            <p className="mt-0.5 text-blue-700 dark:text-blue-300">
              GPX files often merge all laps into a single track. If your activity has multiple laps, try importing the TCX version instead to preserve lap data.
            </p>
          </div>
          <button
            onClick={() => setShowGpxHint(false)}
            className="shrink-0 rounded p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{actDoc.name}</h2>
          <p className="text-sm text-muted-foreground">
            {laps.length} lap(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            New file
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button />}>
                <Download className="mr-2 h-4 w-4" />
                Export
                <ChevronDown className="ml-2 h-4 w-4" />
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

      <LapTable
        laps={laps}
        sourceFormat={actDoc.sourceFormat}
        onDelete={handleDeleteLap}
        onSplit={handleSplitLap}
        onMerge={handleMergeLaps}
        onRename={handleRenameLap}
        onReorder={handleReorderLaps}
      />

      <AlertDialog open={crossFormatTarget !== null} onOpenChange={(open) => !open && setCrossFormatTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to {crossFormatTarget?.toUpperCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              Converting from {actDoc.sourceFormat.toUpperCase()} to {crossFormatTarget?.toUpperCase()} will lose some data that has no equivalent in the target format
              {actDoc.sourceFormat === 'tcx' && ' (calories, lap summaries, device info, etc.)'}
              {actDoc.sourceFormat === 'gpx' && ' (track type, description, links, etc.)'}
              . Use "Export as {actDoc.sourceFormat.toUpperCase()} (original)" for a lossless export.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCrossFormat}>
              Export anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
