import { useState, useMemo } from 'react'
import type { LapHandle } from '~/utils/dom-model'
import { formatDistance } from '~/utils/gpx-parser'
import { calculateDistance } from '~/utils/gpx-parser'
import { getTrackPointsFromElement } from '~/utils/dom-operations'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Input } from '~/components/ui/input'

interface SplitDialogProps {
  lap: LapHandle
  sourceFormat: 'gpx' | 'tcx'
  onSplit: (pointIndex: number) => void
  onClose: () => void
}

export function SplitDialog({ lap, sourceFormat, onSplit, onClose }: SplitDialogProps) {
  const points = useMemo(
    () => getTrackPointsFromElement(lap.element, sourceFormat),
    [lap.element, sourceFormat],
  )

  const midpoint = Math.floor(points.length / 2)
  const [splitIndex, setSplitIndex] = useState(midpoint)

  const maxIndex = points.length - 1

  const firstHalf = points.slice(0, splitIndex + 1)
  const secondHalf = points.slice(splitIndex)

  const firstDistance = calculateDistance(firstHalf)
  const secondDistance = lap.stats.distance - firstDistance

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Split "{lap.name}"</DialogTitle>
          <DialogDescription>
            Choose where to split this lap ({points.length} points, {formatDistance(lap.stats.distance)}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="split-point">Split at point</Label>
            <div className="flex items-center gap-3">
              <Input
                id="split-point"
                type="range"
                min={1}
                max={maxIndex - 1}
                value={splitIndex}
                onChange={(e) => setSplitIndex(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-mono w-20 text-right">
                {splitIndex} / {maxIndex}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-md bg-muted">
              <p className="font-medium">First half</p>
              <p className="text-muted-foreground">{firstHalf.length} points</p>
              <p className="text-muted-foreground">{formatDistance(firstDistance)}</p>
            </div>
            <div className="p-3 rounded-md bg-muted">
              <p className="font-medium">Second half</p>
              <p className="text-muted-foreground">{secondHalf.length} points</p>
              <p className="text-muted-foreground">{formatDistance(secondDistance)}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSplit(splitIndex)}>Split</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
