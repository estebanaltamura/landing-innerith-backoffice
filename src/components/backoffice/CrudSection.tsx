import { useState, useEffect, FormEvent } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { Pencil, Trash2, Plus, CircleDot, GripVertical } from 'lucide-react'
import { CollectionConfig, Item } from './types'
import { emptyForm } from './utils'
import Spinner from './Spinner'
import Modal from './Modal'
import FieldInput from './FieldInput'
import { translateStrings, LANG_FIELDS } from './translateBlocks'

type TranslateStatus = 'idle' | 'translating' | 'done' | 'error'

export default function CrudSection({ config }: { config: CollectionConfig }) {
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
  const [translateStatus, setTranslateStatus] = useState<Record<string, TranslateStatus>>(
    Object.fromEntries(LANG_FIELDS.map(({ field }) => [field, 'idle']))
  )
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set())

  const runTranslations = async (docId: string, data: Record<string, any>, fieldsToTranslate: string[]) => {
    const texts = fieldsToTranslate.map((f) => data[f] ?? '')
    for (const { key, field } of LANG_FIELDS) {
      setTranslateStatus((s) => ({ ...s, [field]: 'translating' }))
      try {
        const translated = await translateStrings(texts, key)
        const docUpdate: Record<string, string> = {}
        fieldsToTranslate.forEach((f, i) => { docUpdate[`${f}${key}`] = translated[i] ?? '' })
        await updateDoc(doc(db, config.collectionName, docId), docUpdate)
        setTranslateStatus((s) => ({ ...s, [field]: 'done' }))
      } catch (err) {
        console.error(`Translation error (${key}):`, err)
        setTranslateStatus((s) => ({ ...s, [field]: 'error' }))
      }
    }
  }

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

  useEffect(() => { load() }, [config.collectionName])

  const formFields = config.fields.filter((f) => f.key !== config.orderField)

  const resetTranslateState = () => {
    setTranslateStatus(Object.fromEntries(LANG_FIELDS.map(({ field }) => [field, 'idle'])))
    setDirtyFields(new Set())
  }

  const openAdd = () => {
    resetTranslateState(); setFormData(emptyForm(formFields)); setEditingItem(null); setModalMode('add')
  }

  const openEdit = (item: Item) => {
    resetTranslateState()
    const form: Record<string, any> = {}
    formFields.forEach((f) => { form[f.key] = item[f.key] ?? (f.type === 'checkbox' ? false : '') })
    setFormData(form); setEditingItem(item); setModalMode('edit')
  }

  const closeModal = () => { setModalMode(null); setEditingItem(null); setFormData({}); resetTranslateState() }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = { ...formData }
      if (config.orderField && modalMode === 'add') data[config.orderField] = items.length + 1
      if (config.orderField && modalMode === 'edit' && editingItem) data[config.orderField] = editingItem[config.orderField]
      let savedId: string | undefined
      if (modalMode === 'add') {
        const docRef = await addDoc(collection(db, config.collectionName), data)
        savedId = docRef.id
      } else if (editingItem) {
        await updateDoc(doc(db, config.collectionName, editingItem._id), data)
        savedId = editingItem._id
      }
      await load()

      if (config.translatableFields && savedId) {
        const fieldsToTranslate = modalMode === 'add'
          ? config.translatableFields
          : config.translatableFields.filter((f) => dirtyFields.has(f) && String(data[f] ?? '') !== String(editingItem?.[f] ?? ''))

        if (modalMode === 'add') {
          closeModal()
          runTranslations(savedId, data, fieldsToTranslate)
        } else if (fieldsToTranslate.length > 0) {
          setDirtyFields(new Set())
          setEditingItem((prev) => prev ? { ...prev, ...data } : prev)
          setTranslateStatus(Object.fromEntries(LANG_FIELDS.map(({ field }) => [field, 'idle'])))
          runTranslations(savedId, data, fieldsToTranslate)
        } else {
          closeModal()
        }
      } else {
        closeModal()
      }
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
        batch.update(doc(db, config.collectionName, item._id), { [config.exclusiveField!]: item._id === targetId })
      })
      await batch.commit()
      setItems((prev) => prev.map((item) => ({ ...item, [config.exclusiveField!]: item._id === targetId })))
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
      console.error(err); await load()
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, config.collectionName, id)); setDeleteId(null); await load()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={openAdd} className="flex items-center gap-2 bg-[#f4c430] text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#e4b020] transition-colors">
          <Plus size={16} /> Add
        </button>
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
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
                {config.orderField && <GripVertical size={16} className="text-gray-600 flex-shrink-0 cursor-grab active:cursor-grabbing" />}
                <span className="text-sm text-[#FAFAFA] truncate flex-1">{item[config.displayField] ?? '(no title)'}</span>
                <div className="flex gap-2 flex-shrink-0 items-center">
                  {config.exclusiveField && (
                    <button
                      onClick={() => handleSetExclusive(item._id)}
                      disabled={togglingId === item._id || !!item[config.exclusiveField]}
                      title={item[config.exclusiveField] ? config.exclusiveLabel ?? 'Current' : `Set as ${config.exclusiveLabel ?? 'Current'}`}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors disabled:cursor-default ${item[config.exclusiveField] ? 'bg-[#f4c430] text-black font-medium' : 'border border-gray-600 text-gray-400 hover:border-[#f4c430] hover:text-[#f4c430]'}`}
                    >
                      <CircleDot size={11} /> {config.exclusiveLabel ?? 'Current'}
                    </button>
                  )}
                  <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-[#f4c430] transition-colors"><Pencil size={15} /></button>
                  <button onClick={() => setDeleteId(item._id)} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalMode && (
        <Modal title={modalMode === 'add' ? 'Add Item' : 'Edit Item'} onClose={closeModal}>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {formFields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-gray-400 mb-1">
                  {field.label}{field.required && <span className="text-[#f4c430] ml-0.5">*</span>}
                </label>
                <FieldInput
                  field={field}
                  value={formData[field.key]}
                  onChange={(val) => {
                    setFormData((prev) => ({ ...prev, [field.key]: val }))
                    setDirtyFields((prev) => new Set(Array.from(prev).concat(field.key)))
                  }}
                />
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 mt-2 flex-wrap">
              {config.translatableFields && Object.values(translateStatus).some((s) => s !== 'idle') && (
                <div className="flex gap-2 flex-wrap">
                  {LANG_FIELDS.map(({ field, label }) => {
                    const status = translateStatus[field]
                    return (
                      <span
                        key={field}
                        className={`px-2 py-0.5 text-xs rounded border font-mono ${
                          status === 'idle'        ? 'border-gray-700 text-gray-600' :
                          status === 'translating' ? 'border-yellow-600 text-yellow-400 animate-pulse' :
                          status === 'done'        ? 'border-green-700 text-green-400' :
                                                     'border-red-700 text-red-400'
                        }`}
                      >
                        {label} {status === 'translating' ? '...' : status === 'done' ? '✓' : status === 'error' ? '✗' : '—'}
                      </span>
                    )
                  })}
                </div>
              )}
              <div className="flex gap-3 ml-auto">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors">Cancel</button>
                <button
                  type="submit"
                  disabled={saving || Object.values(translateStatus).some((s) => s === 'translating')}
                  className="px-4 py-2 text-sm font-medium bg-[#f4c430] text-black rounded-lg hover:bg-[#e4b020] disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Confirm Delete" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-gray-300 mb-6">Are you sure you want to delete this item? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors">Cancel</button>
            <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
