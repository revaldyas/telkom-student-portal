import OpportunityEditorPage from '../OpportunityEditorPage'
import { getOpportunityEditorData } from '../editorData'

export const dynamic = 'force-dynamic'

export default async function NewOpportunityPage() {
  const { programs } = await getOpportunityEditorData()
  return <OpportunityEditorPage programs={programs} />
}
