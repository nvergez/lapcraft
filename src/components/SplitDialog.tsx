import { useState } from 'react'
import type { GpxLap } from '~/utils/gpx-parser'
import { formatDistance, formatDuration } from '~/utils/gpx-parser'
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
  lap: GpxLap
  onSplit: (pointIndex: number) => void
  onClose: () => void
}

export function SplitDialog({ lap, onSplit, onClose }: SplitDialogProps) {
  const midpoint = Math.floor(lap.points.length / 2)
  const [splitIndex, setSplitIndex] = useState(midpoint)

  const maxIndex = lap.points.length - 1

  // Preview info for the split
  const firstHalf = lap.points.slice(0, splitIndex + 1)
  const secondHalf = lap.points.slice(splitIndex)

  const firstDistance = firstHalf.reduce((sum, pt, i) => {
    if (i === 0) return 0
    const prev = firstHalf[i - 1]
    const R = 6371000
    const toRad = (d: number) => (d * Math.PI) / 180
    const dLat = toRad(pt.lat - prev.lat)
    const dLon = toRad(pt.lon - prev.lon)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(prev.lat)) * Math.cos(toRad(pt.lat)) * Math.sin(dLon / 2) ** 2
    return sum + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }, 0)

  const secondDistance = lap.stats.distance - firstDistance

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Split "{lap.name}"</DialogTitle>
          <DialogDescription>
            Choose where to split this lap ({lap.points.length} points, {formatDistance(lap.stats.distance)}).
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
