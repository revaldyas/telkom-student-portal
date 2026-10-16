import PortfolioEditorPage from '../../PortfolioEditorPage'
import { getPortfolioEditorData } from '../../editorData'

export const dynamic = 'force-dynamic'

export default async function EditPortfolioPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params
  const { saved } = await searchParams
  const { categories, work } = await getPortfolioEditorData(id)
  return <PortfolioEditorPage categories={categories} work={work} notice={saved === 'draft' ? 'Draf tersimpan. Lanjutkan kapan saja, lalu ajukan verifikasi saat karya siap.' : ''} />
}
