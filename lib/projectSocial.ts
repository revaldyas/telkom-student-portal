import type { BasePayload } from 'payload'
import { groupCount } from './dbCounts'

/** Jumlah suka dan komentar untuk sekumpulan proyek: dua query agregat kecil. */
export async function projectCounts(payload: BasePayload, ids: number[]) {
  const [likes, comments] = await Promise.all([groupCount(payload, 'project_likes', 'project_id', ids), groupCount(payload, 'project_comments', 'project_id', ids)])
  return { likes, comments }
}
