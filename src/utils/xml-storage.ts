import type { Id } from '../../convex/_generated/dataModel'

/** Upload XML string to Convex file storage, return the storage ID */
export async function uploadXml(
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
