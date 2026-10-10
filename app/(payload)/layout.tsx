import config from '@payload-config'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import { importMap } from './admin/importMap'
import '@payloadcms/next/css'
import './admin.css'
type Args = { children: React.ReactNode }
const serverFunction = async (args: { name: string; args: Record<string, unknown> }) => {
  'use server'

  return handleServerFunctions({ ...args, config, importMap })
}

const Layout = ({ children }: Args) => RootLayout({ children, config, importMap, serverFunction })
export default Layout
