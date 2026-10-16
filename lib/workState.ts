/** Status karya dari sudut pandang siswa: gabungan status publikasi dan status verifikasi. */
export type WorkState = 'published' | 'revision' | 'submitted' | 'draft'

export const workState = (work: { status?: string | null; verificationStatus?: string | null }): WorkState =>
  work.status === 'published' ? 'published'
    : work.verificationStatus === 'revision-requested' ? 'revision'
      : work.verificationStatus === 'submitted' ? 'submitted'
        : 'draft'

export const workStateLabel: Record<WorkState, string> = {
  published: 'Terbit',
  revision: 'Perlu revisi',
  submitted: 'Menunggu verifikasi',
  draft: 'Draf',
}

export const workStateClass: Record<WorkState, string> = {
  published: 'is-published',
  revision: 'is-revision',
  submitted: 'is-submitted',
  draft: 'is-draft',
}
