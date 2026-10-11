import PortfolioEditorPage from '../PortfolioEditorPage'
import { getPortfolioEditorData } from '../editorData'

export const dynamic = 'force-dynamic'

export default async function NewPortfolioPage() {
  const { categories } = await getPortfolioEditorData()
  return <PortfolioEditorPage categories={categories} />
}
