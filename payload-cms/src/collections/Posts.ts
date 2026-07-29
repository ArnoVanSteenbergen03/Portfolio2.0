import type { CollectionConfig } from 'payload'

import {
  revalidateOnChange,
  revalidateOnDelete,
} from '../hooks/revalidateFrontend'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: { useAsTitle: 'title' },
  access: { read: () => true },
  hooks: {
    afterChange: [revalidateOnChange('posts')],
    afterDelete: [revalidateOnDelete('posts')],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'tag', type: 'text' },
    { name: 'date', type: 'date' },
    { name: 'body', type: 'richText' },
  ],
}