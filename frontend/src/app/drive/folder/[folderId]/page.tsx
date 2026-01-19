import DriveClient from '../../DriveClient'

export default function FolderPage({ params }: { params: { folderId: string } }) {
  return <DriveClient initialFolderId={params.folderId} />
}
