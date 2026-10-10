import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { id } from '@payloadcms/translations/languages/id'
import { buildConfig } from 'payload'
import { Classes } from './collections/Classes'
import { Admins } from './collections/Admins'
import { AwardVotes } from './collections/AwardVotes'
import { Awards } from './collections/Awards'
import { Portfolio } from './collections/Portfolio'
import { PortfolioCategories } from './collections/PortfolioCategories'
import { PortfolioComments } from './collections/PortfolioComments'
import { PortfolioLikes } from './collections/PortfolioLikes'
import { Programs } from './collections/Programs'
import { Students } from './collections/Students'
import { StudentRecords } from './collections/StudentRecords'
import { Uploads } from './collections/Uploads'
import { Users } from './collections/Users'

const databaseURL = process.env.DATABASE_URL || ''
const configuredPoolMax = Number(process.env.DATABASE_POOL_MAX || 5)
const poolMax = Number.isInteger(configuredPoolMax) && configuredPoolMax > 0 ? configuredPoolMax : 5

export default buildConfig({
  admin: {
    user: Admins.slug,
    components: { Nav: '@/components/payload/PayloadNav' },
    importMap: { baseDir: process.cwd() },
  },
  collections: [Portfolio, PortfolioCategories, Awards, Users, Students, StudentRecords, Programs, Classes, Uploads, Admins, PortfolioLikes, PortfolioComments, AwardVotes],
  plugins: [
    vercelBlobStorage({
      enabled: process.env.VERCEL === '1' && Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { uploads: true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
  ],
  editor: lexicalEditor(),
  i18n: { fallbackLanguage: 'id', supportedLanguages: { id } },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: './payload-types.ts' },
  db: postgresAdapter({
    pool: {
      connectionString: databaseURL,
      max: poolMax,
      connectionTimeoutMillis: 15_000,
      idleTimeoutMillis: 30_000,
      keepAlive: true,
    },
  }),
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
})
