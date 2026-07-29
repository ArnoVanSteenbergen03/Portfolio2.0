import type { CollectionConfig } from 'payload'

import {
  revalidateOnChange,
  revalidateOnDelete,
} from '../hooks/revalidateFrontend'

export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: { useAsTitle: 'name' },
  access: { read: () => true }, // public read, so the frontend can fetch without auth
  hooks: {
    afterChange: [revalidateOnChange('projects')],
    afterDelete: [revalidateOnDelete('projects')],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'tagline', type: 'text', required: true },
    { name: 'stack', type: 'array', fields: [{ name: 'label', type: 'text' }] },
    { name: 'status', type: 'select', options: ['live', 'idle'], defaultValue: 'live' },
    { name: 'year', type: 'text' },
  ],
}