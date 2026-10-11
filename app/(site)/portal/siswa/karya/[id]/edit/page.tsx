import PortfolioEditorPage from '../../PortfolioEditorPage'
import { getPortfolioEditorData } from '../../editorData'

export const dynamic = 'force-dynamic'

export default async function EditPortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { categories, work } = await getPortfolioEditorData(id)
  return <PortfolioEditorPage categories={categories} work={work} />
}
