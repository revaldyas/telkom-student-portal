import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import config from '@payload-config'
import { importMap } from '../importMap'
import type { Metadata } from 'next'
type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<Record<string, string | string[]>>
}
export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> => generatePageMetadata({ config, params, searchParams })
const Page = ({ params, searchParams }: Args) => RootPage({ config, params, searchParams, importMap })
export default Page
