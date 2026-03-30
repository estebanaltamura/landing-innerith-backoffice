import { useState, useEffect, useRef, FormEvent } from 'react'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, writeBatch, getDoc, setDoc
} from 'firebase/firestore'
import { db, storage } from '../lib/firebase'
import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import { Pencil, Trash2, Plus, X, CircleDot, GripVertical } from 'lucide-react'

type CrudTab = 'home' | 'team' | 'roadmap' | 'log' | 'faq'
type Tab = CrudTab | 'thesis' | 'blog'

const TABS: { key: Tab; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'team', label: 'Team' },
  { key: 'thesis', label: 'Thesis' },
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'blog', label: 'Blog' },
  { key: 'log', label: 'Log' },
  { key: 'faq', label: 'FAQ' },
]

type FieldType = 'text' | 'textarea' | 'number' | 'checkbox' | 'select'

type FieldDef = {
  key: string
  label: string
  type: FieldType
  options?: string[]
  required?: boolean
  maxLength?: number
}

type CollectionConfig = {
  collectionName: string
  displayField: string
  orderField?: string
  exclusiveField?: string
  exclusiveLabel?: string
  fields: FieldDef[]
}

const CONFIGS: Record<CrudTab, CollectionConfig> = {
  home: {
    collectionName: 'home_cards',
    displayField: 'titleMobile',
    orderField: 'order',
    fields: [
      { key: 'order', label: 'Order', type: 'number', required: true },
      { key: 'icon', label: 'Icon', type: 'select', options: ['CircleDot', 'Activity', 'Globe', 'Shield'], required: true },
      { key: 'strokeWidth', label: 'Stroke Width', type: 'number' },
      { key: 'titleMobile', label: 'Title (Mobile)', type: 'text', required: true },
      { key: 'titleDesktopLine1', label: 'Title Desktop — Line 1', type: 'text' },
      { key: 'titleDesktopLine2', label: 'Title Desktop — Line 2', type: 'text' },
      { key: 'text', label: 'Description', type: 'textarea', required: true },
    ],
  },
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
    fields: [
      { key: 'order', label: 'Order', type: 'number', required: true },
      { key: 'question', label: 'Question', type: 'text', required: true },
      { key: 'answer', label: 'Answer', type: 'textarea', required: true },
    ],
  },
}

type Item = Record<string, any> & { _id: string }

const emptyForm = (fields: FieldDef[]): Record<string, any> => {
  const form: Record<string, any> = {}
  fields.forEach((f) => {
    form[f.key] = f.type === 'checkbox' ? false : f.type === 'number' ? '' : ''
  })
  return form
}

function Spinner() {
  return (
    <div className="flex justify-center items-center py-10">
      <div className="w-6 h-6 border-2 border-gray-700 border-t-[#f4c430] rounded-full animate-spin" />
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-[#111] border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-semibold text-[#FAFAFA]">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: any
  onChange: (val: any) => void
}) {
  const base =
    'w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-[#FAFAFA] text-sm focus:outline-none focus:border-[#f4c430] transition-colors'

  if (field.type === 'textarea') {
    return (
      <textarea
        rows={4}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={base}
        required={field.required}
        maxLength={field.maxLength}
      />
    )
  }
  if (field.type === 'checkbox') {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-[#f4c430]"
      />
    )
  }
  if (field.type === 'select' && field.options) {
    return (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={base} required={field.required}>
        <option value="">Select...</option>
        {field.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }
  return (
    <input
      type={field.type === 'number' ? 'number' : 'text'}
      value={value ?? ''}
      onChange={(e) =>
        onChange(field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)
      }
      className={base}
      required={field.required}
    />
  )
}

function CrudTab({ config }: { config: CollectionConfig }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const q = config.orderField
        ? query(collection(db, config.collectionName), orderBy(config.orderField))
        : collection(db, config.collectionName)
      const snap = await getDocs(q)
      setItems(snap.docs.map((d) => ({ _id: d.id, ...d.data() })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [config.collectionName])

  const formFields = config.fields.filter((f) => f.key !== config.orderField)

  const openAdd = () => {
    setFormData(emptyForm(formFields))
    setEditingItem(null)
    setModalMode('add')
  }

  const openEdit = (item: Item) => {
    const form: Record<string, any> = {}
    formFields.forEach((f) => {
      form[f.key] = item[f.key] ?? (f.type === 'checkbox' ? false : '')
    })
    setFormData(form)
    setEditingItem(item)
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingItem(null)
    setFormData({})
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = { ...formData }
      if (config.orderField) data[config.orderField] = items.length + 1
      if (modalMode === 'add') {
        await addDoc(collection(db, config.collectionName), data)
      } else if (editingItem) {
        await updateDoc(doc(db, config.collectionName, editingItem._id), data)
      }
      await load()
      closeModal()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleSetExclusive = async (targetId: string) => {
    if (!config.exclusiveField) return
    setTogglingId(targetId)
    try {
      const batch = writeBatch(db)
      items.forEach((item) => {
        batch.update(doc(db, config.collectionName, item._id), {
          [config.exclusiveField!]: item._id === targetId,
        })
      })
      await batch.commit()
      setItems((prev) =>
        prev.map((item) => ({ ...item, [config.exclusiveField!]: item._id === targetId }))
      )
    } catch (err) {
      console.error(err)
    } finally {
      setTogglingId(null)
    }
  }

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || !config.orderField) return
    const reordered = [...items]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    const withOrder = reordered.map((item, i) => ({ ...item, [config.orderField!]: i + 1 }))
    setItems(withOrder)
    try {
      const batch = writeBatch(db)
      withOrder.forEach((item) => {
        batch.update(doc(db, config.collectionName, item._id), { [config.orderField!]: item[config.orderField!] })
      })
      await batch.commit()
    } catch (err) {
      console.error(err)
      await load()
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, config.collectionName, id))
      setDeleteId(null)
      await load()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#f4c430] text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#e4b020] transition-colors"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-sm">No items yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <div
              key={item._id}
              className="relative"
              draggable={!!config.orderField}
              onDragStart={() => { setDragIndex(index); setDragOverIndex(null) }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index) }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={() => { handleReorder(dragIndex!, index); setDragIndex(null); setDragOverIndex(null) }}
              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
            >
              {dragOverIndex === index && dragIndex !== null && dragIndex > index && (
                <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[#f4c430] rounded-full z-10" />
              )}
              {dragOverIndex === index && dragIndex !== null && dragIndex < index && (
                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#f4c430] rounded-full z-10" />
              )}
            <div className={`flex items-center justify-between gap-4 bg-[#111] border border-gray-800 rounded-lg px-4 py-3 ${dragIndex === index ? 'opacity-40' : ''}`}>
              {config.orderField && (
                <GripVertical size={16} className="text-gray-600 flex-shrink-0 cursor-grab active:cursor-grabbing" />
              )}
              <span className="text-sm text-[#FAFAFA] truncate flex-1">
                {item[config.displayField] ?? '(no title)'}
              </span>
              <div className="flex gap-2 flex-shrink-0 items-center">
                {config.exclusiveField && (
                  <button
                    onClick={() => handleSetExclusive(item._id)}
                    disabled={togglingId === item._id || !!item[config.exclusiveField]}
                    title={item[config.exclusiveField] ? config.exclusiveLabel ?? 'Current' : `Set as ${config.exclusiveLabel ?? 'Current'}`}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors disabled:cursor-default ${
                      item[config.exclusiveField]
                        ? 'bg-[#f4c430] text-black font-medium'
                        : 'border border-gray-600 text-gray-400 hover:border-[#f4c430] hover:text-[#f4c430]'
                    }`}
                  >
                    <CircleDot size={11} />
                    {config.exclusiveLabel ?? 'Current'}
                  </button>
                )}
                <button
                  onClick={() => openEdit(item)}
                  className="p-1.5 text-gray-400 hover:text-[#f4c430] transition-colors"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => setDeleteId(item._id)}
                  className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalMode && (
        <Modal
          title={modalMode === 'add' ? 'Add Item' : 'Edit Item'}
          onClose={closeModal}
        >
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {formFields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-gray-400 mb-1">
                  {field.label}
                  {field.required && <span className="text-[#f4c430] ml-0.5">*</span>}
                </label>
                <FieldInput
                  field={field}
                  value={formData[field.key]}
                  onChange={(val) => setFormData((prev) => ({ ...prev, [field.key]: val }))}
                />
              </div>
            ))}
            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-[#f4c430] text-black rounded-lg hover:bg-[#e4b020] disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <Modal title="Confirm Delete" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-300 mb-6">Are you sure you want to delete this item? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(deleteId)}
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

const TOOLBAR_BTN = 'px-2 py-1 text-xs bg-[#222] border border-gray-700 rounded hover:border-[#f4c430] hover:text-[#f4c430] transition-colors'
const INPUT_BASE = 'w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-[#FAFAFA] text-sm focus:outline-none focus:border-[#f4c430] transition-colors'

function toVideoEmbed(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  return url
}

function videoHTML(url: string): string {
  const isYoutube = /youtube\.com|youtu\.be/.test(url)
  const embedUrl = toVideoEmbed(url)
  if (isYoutube) {
    return `<div style="text-align:center;margin:1.2rem 0;"><iframe style="width:500px;max-width:100%;aspect-ratio:16/9;display:inline-block;" src="${embedUrl}" frameborder="0" allowfullscreen></iframe></div>`
  }
  return `<div style="text-align:center;margin:1.2rem 0;"><video src="${url}" controls style="width:500px;max-width:100%;height:auto;display:inline-block;"></video></div>`
}

type BlogPost = {
  _id: string
  order: number
  date: string
  title: string
  description: string
  contentUrl?: string
  content?: string
}

function BlogEditor() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [date, setDate] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'blog'), orderBy('order')))
      setPosts(snap.docs.map((d) => ({ _id: d.id, ...d.data() } as BlogPost)))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!(editing !== null || isNew) || !editorRef.current) return
    const el = editorRef.current
    if (editing?.contentUrl) {
      fetch(editing.contentUrl).then((r) => r.text()).then((html) => { el.innerHTML = html })
    } else {
      el.innerHTML = editing?.content ?? ''
    }
  }, [editing, isNew])

  const openNew = () => {
    setDate(''); setTitle(''); setDescription('')
    setEditing(null); setIsNew(true)
  }

  const openEdit = (post: BlogPost) => {
    setDate(post.date); setTitle(post.title); setDescription(post.description)
    setEditing(post); setIsNew(false)
  }

  const handleCancel = () => { setEditing(null); setIsNew(false) }

  const handleSave = async () => {
    if (!editorRef.current) return
    setSaving(true)
    try {
      const html = editorRef.current.innerHTML
      const meta = { date, title, description }
      let postId: string
      if (isNew) {
        const docRef = await addDoc(collection(db, 'blog'), { ...meta, order: posts.length + 1 })
        postId = docRef.id
      } else {
        postId = editing!._id
      }
      const storageRef = ref(storage, `blog/${postId}.html`)
      await uploadString(storageRef, html, 'raw', { contentType: 'text/html; charset=utf-8' })
      const contentUrl = await getDownloadURL(storageRef)
      await updateDoc(doc(db, 'blog', postId), { ...meta, contentUrl })
      await load()
      handleCancel()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'blog', id))
      setDeleteId(null)
      await load()
    } catch (err) {
      console.error(err)
    }
  }

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    const reordered = [...posts]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    const withOrder = reordered.map((p, i) => ({ ...p, order: i + 1 }))
    setPosts(withOrder)
    try {
      const batch = writeBatch(db)
      withOrder.forEach((p) => { batch.update(doc(db, 'blog', p._id), { order: p.order }) })
      await batch.commit()
    } catch (err) {
      console.error(err)
      await load()
    }
  }

  if (editing !== null || isNew) {
    return (
      <div className="flex flex-col gap-4">
        <button onClick={handleCancel} className="self-start text-sm text-gray-400 hover:text-white transition-colors">
          ← Back to list
        </button>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Date <span className="text-[#f4c430]">*</span></label>
            <input value={date} onChange={(e) => setDate(e.target.value)} className={INPUT_BASE} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Title <span className="text-[#f4c430]">*</span></label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT_BASE} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description <span className="text-[#f4c430]">*</span></label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={INPUT_BASE} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 p-3 bg-[#111] border border-gray-800 rounded-lg">
          <button
            className={TOOLBAR_BTN}
            onClick={() => {
              editorRef.current?.focus()
              document.execCommand('selectAll', false)
              document.execCommand('foreColor', false, '#ffffff')
              window.getSelection()?.removeAllRanges()
            }}
          >
            White text
          </button>
          <button
            className={TOOLBAR_BTN}
            onClick={() => {
              const url = window.prompt('Video URL (YouTube or direct):')
              if (!url) return
              editorRef.current?.focus()
              document.execCommand('insertHTML', false, videoHTML(url))
            }}
          >
            Insert video
          </button>
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="min-h-[400px] bg-[#1a1a1a] border border-gray-700 rounded-lg p-5 text-[#FAFAFA] text-sm focus:outline-none focus:border-[#f4c430] transition-colors thesis-editor"
        />
        <div className="flex justify-end gap-3">
          <button onClick={handleCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-medium bg-[#f4c430] text-black rounded-lg hover:bg-[#e4b020] disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-[#f4c430] text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#e4b020] transition-colors"
        >
          <Plus size={16} />
          Add
        </button>
      </div>
      {loading ? (
        <Spinner />
      ) : posts.length === 0 ? (
        <p className="text-gray-500 text-sm">No posts yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.map((post, index) => (
            <div
              key={post._id}
              className="relative"
              draggable
              onDragStart={() => { setDragIndex(index); setDragOverIndex(null) }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index) }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={() => { handleReorder(dragIndex!, index); setDragIndex(null); setDragOverIndex(null) }}
              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
            >
              {dragOverIndex === index && dragIndex !== null && dragIndex > index && (
                <div className="absolute -top-1 left-0 right-0 h-0.5 bg-[#f4c430] rounded-full z-10" />
              )}
              {dragOverIndex === index && dragIndex !== null && dragIndex < index && (
                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#f4c430] rounded-full z-10" />
              )}
              <div className={`flex items-center justify-between gap-4 bg-[#111] border border-gray-800 rounded-lg px-4 py-3 ${dragIndex === index ? 'opacity-40' : ''}`}>
                <GripVertical size={16} className="text-gray-600 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs text-gray-500">{post.date}</span>
                  <span className="text-sm text-[#FAFAFA] truncate">{post.title}</span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(post)} className="p-1.5 text-gray-400 hover:text-[#f4c430] transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setDeleteId(post._id)} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {deleteId && (
        <Modal title="Confirm Delete" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-300 mb-6">Are you sure you want to delete this post? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors">Cancel</button>
            <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ThesisEditor() {
  const editorRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [initialContent, setInitialContent] = useState<string | null>(null)

  useEffect(() => {
    getDoc(doc(db, 'thesis', 'main')).then(async (snap) => {
      if (!snap.exists()) { setLoading(false); return }
      const { contentUrl, content } = snap.data()
      if (contentUrl) {
        const res = await fetch(contentUrl)
        setInitialContent(await res.text())
      } else if (content) {
        setInitialContent(content)
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!loading && editorRef.current && initialContent !== null) {
      editorRef.current.innerHTML = initialContent
    }
  }, [loading])

  const handleSave = async () => {
    if (!editorRef.current) return
    setSaving(true)
    try {
      const html = editorRef.current.innerHTML
      const storageRef = ref(storage, 'thesis/main.html')
      await uploadString(storageRef, html, 'raw', { contentType: 'text/html; charset=utf-8' })
      const contentUrl = await getDownloadURL(storageRef)
      await setDoc(doc(db, 'thesis', 'main'), { contentUrl })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-3 bg-[#111] border border-gray-800 rounded-lg">
        <button
          className={TOOLBAR_BTN}
          onClick={() => {
            editorRef.current?.focus()
            document.execCommand('selectAll', false)
            document.execCommand('foreColor', false, '#ffffff')
            window.getSelection()?.removeAllRanges()
          }}
        >
          White text
        </button>
        <button
          className={TOOLBAR_BTN}
          onClick={() => {
            const url = window.prompt('Video URL (YouTube or direct):')
            if (!url) return
            editorRef.current?.focus()
            document.execCommand('insertHTML', false, videoHTML(url))
          }}
        >
          Insert video
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[400px] bg-[#1a1a1a] border border-gray-700 rounded-lg p-5 text-[#FAFAFA] text-sm focus:outline-none focus:border-[#f4c430] transition-colors thesis-editor"
      />

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 text-sm font-medium bg-[#f4c430] text-black rounded-lg hover:bg-[#e4b020] disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default function Backoffice() {
  const [activeTab, setActiveTab] = useState<Tab>('home')

  return (
    <div className="min-h-screen bg-black text-[#FAFAFA] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold tracking-wide mb-8">Backoffice</h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-8 border-b border-gray-800 pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#111] border border-b-[#111] border-gray-700 text-[#f4c430] -mb-px'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'thesis'
          ? <ThesisEditor />
          : activeTab === 'blog'
          ? <BlogEditor />
          : <CrudTab key={activeTab} config={CONFIGS[activeTab as CrudTab]} />
        }
      </div>
    </div>
  )
}
