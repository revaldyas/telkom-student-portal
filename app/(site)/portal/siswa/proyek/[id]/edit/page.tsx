import ProjectEditorPage from '../../ProjectEditorPage'
import { getProjectEditorData } from '../../editorData'

export default async function EditProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params
  const { saved } = await searchParams
  const data = await getProjectEditorData(id)
  return <ProjectEditorPage userID={data.userID} students={data.students} teachers={data.teachers} categories={data.categories} project={data.project} notice={saved === 'draft' ? 'Draf tersimpan. Lanjutkan kapan saja; ajukan verifikasi dari halaman proyek setelah mentor utama menerima undangan.' : ''} />
}
