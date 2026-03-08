import type { LapStats } from './gpx-parser'

export interface ActivityDocument {
  doc: Document
  sourceFormat: 'gpx' | 'tcx'
  name: string
  lapNames: Map<string, string> // user-defined names (TCX laps have no <name> element)
}

export interface LapHandle {
  id: string
  element: Element // <trk> for GPX, <Lap> for TCX
  name: string
  stats: LapStats // computed read-only from DOM
  pointCount: number
}
