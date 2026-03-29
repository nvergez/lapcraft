import { useState, useCallback, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useConvexMutation, useConvexAction, convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { GpxEditor } from './gpx-editor'
import { GpxUpload } from './gpx-upload'
import { ActivityList } from './activity-list'
import { parseToDocument, getLapHandles, countLaps, exportOriginal } from '~/utils/dom-operations'

interface EditorState {
  activityId: Id<'activities'>
  xmlContent: string
  source: 'file' | 'strava'
  stravaActivityId?: number
}

/** Upload XML string to Convex file storage, return the storage ID */
async function uploadXml(
  generateUploadUrl: () => Promise<string>,
  xmlContent: string,
): Promise<Id<'_storage'>> {
  const uploadUrl = await generateUploadUrl()
  const blob = new Blob([xmlContent], { type: 'application/xml' })
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: blob,
  })
  if (!response.ok) throw new Error('Failed to upload XML')
  const { storageId } = (await response.json()) as { storageId: Id<'_storage'> }
  return storageId
}

export function ActivityHub() {
  const [editorState, setEditorState] = useState<EditorState | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { data: activities } = useQuery(convexQuery(api.activities.list, {}))

  const generateUploadUrlFn = useConvexMutation(api.activities.generateUploadUrl)
  const createActivityFn = useConvexMutation(api.activities.create)
  const updateActivityFn = useConvexMutation(api.activities.update)
  const getXmlContentFn = useConvexAction(api.activities.getXmlContent)

  const { mutate: removeActivity } = useMutation({
    mutationFn: useConvexMutation(api.activities.remove),
  })

  const handleFileLoaded = useCallback(
    async (xmlString: string, source: 'file' | 'strava' = 'file', stravaActivityId?: number) => {
      try {
        const doc = parseToDocument(xmlString)
        const lapCount = countLaps(doc)
        if (lapCount === 0) {
          toast.error('No tracks/laps found in this file')
          return
        }

        setIsLoading(true)

        const laps = getLapHandles(doc)
        let totalDistance = 0
        let totalDuration = 0
        let totalElevationGain = 0
        for (const lap of laps) {
          totalDistance += lap.stats.distance
          totalDuration += lap.stats.duration
          totalElevationGain += lap.stats.elevationGain ?? 0
        }

        // Extract activity date
        const firstLap = laps[0]
        let activityDate: string | undefined
        if (firstLap) {
          const firstEl = firstLap.element
          const timeEl =
            firstEl.getElementsByTagName('time')[0] || firstEl.getElementsByTagName('Time')[0]
          if (timeEl?.textContent) {
            activityDate = timeEl.textContent
          }
        }
        if (!activityDate && doc.sourceFormat === 'tcx') {
          const lapEl = doc.doc.getElementsByTagName('Lap')[0]
          const startTime = lapEl?.getAttribute('StartTime')
          if (startTime) activityDate = startTime
        }

        let sport: string | undefined
        if (doc.sourceFormat === 'tcx') {
          const activity = doc.doc.getElementsByTagName('Activity')[0]
          sport = activity?.getAttribute('Sport') ?? undefined
        }

        const xmlContent = exportOriginal(doc)

        // Upload XML to file storage
        const xmlStorageId = await uploadXml(() => generateUploadUrlFn({}), xmlContent)

        const activityId = await createActivityFn({
          name: doc.name,
          sourceFormat: doc.sourceFormat,
          xmlStorageId,
          source,
          stravaActivityId,
          sport,
          distance: totalDistance,
          duration: totalDuration,
          elevationGain: totalElevationGain || undefined,
          lapCount: laps.length,
          activityDate,
        })

        setEditorState({ activityId, xmlContent, source, stravaActivityId })
        toast.success(`Loaded "${doc.name}" with ${laps.length} lap(s)`)
      } catch (e) {
        toast.error(`Failed to save activity: ${e instanceof Error ? e.message : 'Unknown error'}`)
      } finally {
        setIsLoading(false)
      }
    },
    [generateUploadUrlFn, createActivityFn],
  )

  const handleStravaFileLoaded = useCallback(
    (xmlString: string, stravaActivityId?: number) => {
      handleFileLoaded(xmlString, 'strava', stravaActivityId)
    },
    [handleFileLoaded],
  )

  const handleOpenActivity = useCallback(
    async (activityId: Id<'activities'>) => {
      setIsLoading(true)
      try {
        const xmlContent = await getXmlContentFn({ activityId })
        if (!xmlContent) throw new Error('Activity not found')
        const activity = activities?.find((a) => a._id === activityId)
        setEditorState({
          activityId,
          xmlContent,
          source: (activity?.source as 'file' | 'strava') ?? 'file',
          stravaActivityId: activity?.stravaActivityId ?? undefined,
        })
      } catch (e) {
        toast.error(`Failed to load activity: ${e instanceof Error ? e.message : 'Unknown error'}`)
      } finally {
        setIsLoading(false)
      }
    },
    [getXmlContentFn, activities],
  )

  const handleDeleteActivity = useCallback(
    (activityId: Id<'activities'>) => {
      removeActivity(
        { activityId },
        {
          onSuccess: () => toast.success('Activity deleted'),
          onError: (err) => toast.error(err.message),
        },
      )
    },
    [removeActivity],
  )

  const { mutate: renameActivity } = useMutation({
    mutationFn: useConvexMutation(api.activities.update),
  })

  const handleRenameActivity = useCallback(
    (activityId: Id<'activities'>, name: string) => {
      renameActivity(
        { activityId, name },
        {
          onError: (err) => toast.error(err.message),
        },
      )
    },
    [renameActivity],
  )

  // Use a ref to hold the latest save-in-progress to avoid stacking
  const saveAbortRef = useRef<AbortController | null>(null)

  const handleSave = useCallback(
    async (data: {
      activityId: Id<'activities'>
      xmlContent: string
      name: string
      distance: number
      duration: number
      elevationGain?: number
      lapCount: number
    }) => {
      // Cancel any in-flight save
      if (saveAbortRef.current) saveAbortRef.current.abort()
      const controller = new AbortController()
      saveAbortRef.current = controller

      try {
        const xmlStorageId = await uploadXml(() => generateUploadUrlFn({}), data.xmlContent)
        if (controller.signal.aborted) return

        await updateActivityFn({
          activityId: data.activityId,
          xmlStorageId,
          name: data.name,
          distance: data.distance,
          duration: data.duration,
          elevationGain: data.elevationGain,
          lapCount: data.lapCount,
        })
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('Failed to save activity:', err)
        }
      }
    },
    [generateUploadUrlFn, updateActivityFn],
  )

  const handleBack = useCallback(() => {
    setEditorState(null)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (editorState) {
    return (
      <GpxEditor
        key={editorState.activityId}
        activityId={editorState.activityId}
        initialXml={editorState.xmlContent}
        source={editorState.source}
        stravaActivityId={editorState.stravaActivityId}
        onBack={handleBack}
        onSave={handleSave}
      />
    )
  }

  return (
    <div className="space-y-10">
      <GpxUpload
        onFileLoaded={(xml) => handleFileLoaded(xml, 'file')}
        onStravaFileLoaded={handleStravaFileLoaded}
      />

      {activities && activities.length > 0 && (
        <ActivityList
          activities={activities}
          onOpen={handleOpenActivity}
          onDelete={handleDeleteActivity}
          onRename={handleRenameActivity}
        />
      )}
    </div>
  )
}
