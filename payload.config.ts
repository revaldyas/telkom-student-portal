import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { id } from '@payloadcms/translations/languages/id'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { Classes } from './collections/Classes'
import { Admins } from './collections/Admins'
import { HomeBanners } from './collections/HomeBanners'
import { AwardVotes } from './collections/AwardVotes'
import { Awards } from './collections/Awards'
import { Portfolio } from './collections/Portfolio'
import { PortfolioCategories } from './collections/PortfolioCategories'
import { PortfolioComments } from './collections/PortfolioComments'
import { PortfolioLikes } from './collections/PortfolioLikes'
import { PortfolioReviews } from './collections/PortfolioReviews'
import { Projects } from './collections/Projects'
import { OpportunityInterests } from './collections/OpportunityInterests'
import { Opportunities } from './collections/Opportunities'
import { Programs } from './collections/Programs'
import { Students } from './collections/Students'
import { StudentRecords } from './collections/StudentRecords'
import { Uploads } from './collections/Uploads'
import { Users } from './collections/Users'
import { Testimonials } from './collections/Testimonials'
import { ProjectComments, ProjectLikes } from './collections/ProjectSocial'
import { ProjectActivity, ProjectTaskComments, ProjectTasks } from './collections/Tracker'
import { ChatBlocks, ChatConversations, ChatMembers, ChatMessages, ChatReports } from './collections/Chat'

const databaseURL = process.env.DATABASE_URL || ''
const configuredPoolMax = Number(process.env.DATABASE_POOL_MAX || 5)
const poolMax = Number.isInteger(configuredPoolMax) && configuredPoolMax > 0 ? configuredPoolMax : 5

export default buildConfig({
  admin: {
    user: Admins.slug,
    components: { Nav: '@/components/payload/PayloadNav' },
    importMap: { baseDir: process.cwd() },
  },
  collections: [ProjectLikes, ProjectComments, ProjectTasks, ProjectTaskComments, ProjectActivity, ChatConversations, ChatMembers, ChatMessages, ChatBlocks, ChatReports, HomeBanners, Testimonials, Portfolio, Projects, PortfolioCategories, Awards, Users, Students, StudentRecords, Programs, Classes, Uploads, Admins, PortfolioLikes, PortfolioComments, AwardVotes, PortfolioReviews, Opportunities, OpportunityInterests],
  plugins: [
    vercelBlobStorage({
      // Use the same storage adapter locally when a Blob token is configured;
      // otherwise Payload builds local /media URLs for files that only exist in Blob.
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      // Give replaced files a new URL so Vercel's CDN cannot serve a cached pre-crop image.
      addRandomSuffix: true,
      collections: { uploads: true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
  ],
  editor: lexicalEditor(),
  // Wajib untuk crop, titik fokus, dan resize dari editor gambar admin; tanpa ini Payload melewati pemrosesan gambar tanpa error.
  sharp,
  i18n: { fallbackLanguage: 'id', supportedLanguages: { id } },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: './payload-types.ts' },
  db: postgresAdapter({
    // The local Payload schema omits Vercel Blob's internal `_objectkey` column
    // when the Blob plugin is disabled. Keep schema push off so development
    // startup cannot drop that production-only column from the shared database.
    push: false,
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
