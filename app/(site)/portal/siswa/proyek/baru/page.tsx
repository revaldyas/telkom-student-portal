import ProjectEditorPage from '../ProjectEditorPage'
import { getProjectEditorData } from '../editorData'

export default async function NewProjectPage() {
  const data = await getProjectEditorData()
  return <ProjectEditorPage userID={data.userID} students={data.students} teachers={data.teachers} categories={data.categories} />
}
