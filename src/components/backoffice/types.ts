export type CrudTab = 'team' | 'roadmap' | 'log' | 'faq'
export type Tab = CrudTab | 'thesis' | 'blog'

export const TABS: { key: Tab; label: string }[] = [
  { key: 'thesis', label: 'Thesis' },
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'team', label: 'Team' },
  { key: 'blog', label: 'Blog' },
  { key: 'log', label: 'Log' },
  { key: 'faq', label: 'FAQ' },
]

export type FieldType = 'text' | 'textarea' | 'number' | 'checkbox' | 'select'

export type FieldDef = {
  key: string
  label: string
  type: FieldType
  options?: string[]
  required?: boolean
  maxLength?: number
}

export type CollectionConfig = {
  collectionName: string
  displayField: string
  orderField?: string
  exclusiveField?: string
  exclusiveLabel?: string
  fields: FieldDef[]
  translatableFields?: string[]
}

export const CONFIGS: Record<CrudTab, CollectionConfig> = {
  team: {
    collectionName: 'team',
    displayField: 'name',
    orderField: 'order',
    fields: [
      { key: 'order', label: 'Order', type: 'number', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Role', type: 'text', required: true },
      { key: 'linkedin', label: 'LinkedIn URL', type: 'text', required: true },
      { key: 'bio', label: 'Bio', type: 'textarea' },
      { key: 'image', label: 'Image URL', type: 'text' },
    ],
  },
  roadmap: {
    collectionName: 'roadmap',
    displayField: 'title',
    orderField: 'order',
    exclusiveField: 'current',
    exclusiveLabel: 'Current',
    fields: [
      { key: 'order', label: 'Order', type: 'number', required: true },
      { key: 'date', label: 'Date', type: 'text', required: true },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', required: true, maxLength: 165 },
    ],
  },
  log: {
    collectionName: 'logs',
    displayField: 'title',
    orderField: 'order',
    translatableFields: ['title', 'description'],
    fields: [
      { key: 'order', label: 'Order', type: 'number', required: true },
      { key: 'date', label: 'Date', type: 'text', required: true },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
    ],
  },
  faq: {
    collectionName: 'faqs',
    displayField: 'question',
    orderField: 'order',
    translatableFields: ['question', 'answer'],
    fields: [
      { key: 'order', label: 'Order', type: 'number', required: true },
      { key: 'question', label: 'Question', type: 'text', required: true },
      { key: 'answer', label: 'Answer', type: 'textarea', required: true },
    ],
  },
}

export type Item = Record<string, any> & { _id: string }

export type BlockType = 'h1' | 'h2' | 'p' | 'imageUrl' | 'videoUrl' | 'divider' | 'spacer'

export type BlockAlign = 'left' | 'center' | 'right' | 'justify'

export type Block = {
  type: BlockType
  content: string          
  contentEnglish?: string
  contentHindi?: string
  contentChinese?: string
  contentArab?: string
  maxWidth?: string
  align?: BlockAlign
}

export type BlogPost = {
  _id: string
  order: number
  date: string
  title: string
  description: string
  titleEnglish?: string
  titleHindi?: string
  titleChinese?: string
  titleArab?: string
  descriptionEnglish?: string
  descriptionHindi?: string
  descriptionChinese?: string
  descriptionArab?: string
  blocks?: Block[]
  pdfUrl?: string
  pdfName?: string
}
//
