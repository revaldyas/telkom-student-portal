import OpportunityEditorPage from '../../OpportunityEditorPage'
import { getOpportunityEditorData } from '../../editorData'

export const dynamic = 'force-dynamic'

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { programs, opportunity } = await getOpportunityEditorData(id)
  return <OpportunityEditorPage programs={programs} opportunity={opportunity} />
}
