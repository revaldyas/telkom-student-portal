import { EntityType, groupNavItems } from '@payloadcms/ui/shared'
import type { EntityToGroup } from '@payloadcms/ui/shared'
import { getTranslation } from '@payloadcms/translations'
import { Logo } from '@payloadcms/next/rsc'
import type { PayloadRequest, ServerProps } from 'payload'
import { PayloadNavClient } from './PayloadNavClient'

type Props = ServerProps & { req?: PayloadRequest }

export default function PayloadNav(props: Props) {
  const { i18n, payload, permissions, visibleEntities } = props
  if (!payload?.config || !visibleEntities || !permissions) return null

  const { collections, globals, routes } = payload.config
  const navItems: EntityToGroup[] = [
      ...collections
        .filter(({ slug }) => visibleEntities.collections.includes(slug))
        .map((entity): EntityToGroup => ({ type: EntityType.collection, entity })),
      ...globals
        .filter(({ slug }) => visibleEntities.globals.includes(slug))
        .map((entity): EntityToGroup => ({ type: EntityType.global, entity })),
    ]
  const groups = groupNavItems(
    navItems,
    permissions,
    i18n,
  )

  return (
    <PayloadNavClient
      groups={groups.map(({ label, entities }) => ({
        label,
        entities: entities.map(({ label: itemLabel, slug, type }) => {
          const translatedLabel = getTranslation(itemLabel, i18n)
          return {
            label: typeof translatedLabel === 'string' ? translatedLabel : slug,
            slug,
            type,
          }
        }),
      }))}
      adminRoute={routes.admin}
      logo={<Logo {...props} />}
    />
  )
}
