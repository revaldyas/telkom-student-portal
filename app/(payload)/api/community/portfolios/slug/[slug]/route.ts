import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'portfolios',
    where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] },
    depth: 2,
    limit: 1,
    overrideAccess: true,
  })
  const work = result.docs[0]
  if (!work) return NextResponse.json({ message: 'Karya tidak ditemukan.' }, { status: 404 })
  const awards = await payload.find({
    collection: 'awards',
    where: { status: { not_equals: 'draft' } },
    depth: 0,
    limit: 1000,
    overrideAccess: true,
  })
  const isNominee = awards.docs.some((award) => Array.isArray(award.nominees) && award.nominees.some((nominee) => {
    const nomineeID = nominee && typeof nominee === 'object' && 'id' in nominee ? nominee.id : nominee
    return String(nomineeID) === String(work.id)
  }))
  const student = typeof work.student === 'object' ? work.student : null
  const photo = student && typeof student.profilePhoto === 'object' ? student.profilePhoto : null
  const category = typeof work.categoryRef === 'object' ? work.categoryRef : null
  const cover = typeof work.coverImage === 'object' ? work.coverImage : null
  const projectFile = typeof work.projectFile === 'object' ? work.projectFile : null
  return NextResponse.json({
    id: work.id,
    slug: work.slug,
    title: work.title,
    isNominee,
    summary: work.summary,
    year: work.year,
    projectUrl: work.projectUrl,
    projectFile: projectFile ? { url: projectFile.url, mimeType: projectFile.mimeType, filename: projectFile.filename } : null,
    tools: work.tools,
    verificationStatus: work.verificationStatus || 'unreviewed',
    verifiedBy: typeof work.verifiedBy === 'object' && work.verifiedBy ? { name: work.verifiedBy.name } : null,
    categoryRef: category ? { name: category.name, code: category.code } : null,
    coverImage: cover ? { url: cover.url, alt: cover.alt } : null,
    student: student ? { id: student.id, name: student.name, profilePhoto: photo?.url || null } : null,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
