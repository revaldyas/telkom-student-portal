import ProjectEditorPage from '../../ProjectEditorPage'
import { getProjectEditorData } from '../../editorData'

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getProjectEditorData(id)
  return <ProjectEditorPage userID={data.userID} students={data.students} teachers={data.teachers} categories={data.categories} project={data.project} />
}
