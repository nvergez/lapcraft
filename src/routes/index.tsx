import { createFileRoute } from '@tanstack/react-router'
import { GpxEditor } from '~/components/GpxEditor'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return <GpxEditor />
}
