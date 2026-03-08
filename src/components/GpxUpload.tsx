import { useCallback, useRef, useState } from 'react'
import { Card, CardContent } from '~/components/ui/card'
import { Upload } from 'lucide-react'

interface GpxUploadProps {
  onFileLoaded: (xmlString: string) => void
}

export function GpxUpload({ onFileLoaded }: GpxUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      const name = file.name.toLowerCase()
      if (!name.endsWith('.gpx') && !name.endsWith('.tcx')) {
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result
        if (typeof text === 'string') {
          onFileLoaded(text)
        }
      }
      reader.readAsText(file)
    },
    [onFileLoaded],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  return (
    <Card
      className={`cursor-pointer border-2 border-dashed transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
      }`}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <Upload className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <p className="text-lg font-medium">Drop a GPX or TCX file here</p>
          <p className="text-sm text-muted-foreground">or click to browse</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".gpx,.tcx"
          className="hidden"
          onChange={handleInputChange}
        />
      </CardContent>
    </Card>
  )
}
