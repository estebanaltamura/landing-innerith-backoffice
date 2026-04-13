import { useState } from 'react'
import { addDoc, updateDoc, collection, doc } from 'firebase/firestore'
import { db, storage } from '../../lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { BlogPost, Block } from './types'
import { INPUT_BASE } from './utils'
import BlockEditor from './BlockEditor'

type Props = {
  post: BlogPost | null
  postsCount: number
  onDone: () => void
  onCancel: () => void
}

export default function BlogPostEditor({ post, postsCount, onDone, onCancel }: Props) {
  const [date, setDate] = useState(post?.date ?? '')
  const [title, setTitle] = useState(post?.title ?? '')
  const [description, setDescription] = useState(post?.description ?? '')
  const [contentMode, setContentMode] = useState<'blocks' | 'pdf'>(post?.pdfUrl ? 'pdf' : 'blocks')
  const [blocks, setBlocks] = useState<Block[]>(post?.blocks ?? [])
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState(post?.pdfUrl ?? '')
  const [pdfName, setPdfName] = useState(post?.pdfName ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const meta = { date, title, description }
      let postId: string
      if (!post) {
        const docRef = await addDoc(collection(db, 'blog'), { ...meta, order: postsCount + 1 })
        postId = docRef.id
      } else {
        postId = post._id
      }

      if (contentMode === 'pdf') {
        let finalPdfUrl = pdfUrl
        let finalPdfName = pdfName
        if (pdfFile) {
          const storageRef = ref(storage, `blog/${postId}.pdf`)
          await uploadBytes(storageRef, pdfFile, { contentType: 'application/pdf' })
          finalPdfUrl = await getDownloadURL(storageRef)
          finalPdfName = pdfFile.name
        }
        if (!finalPdfUrl) throw new Error('No PDF')
        await updateDoc(doc(db, 'blog', postId), { ...meta, pdfUrl: finalPdfUrl, pdfName: finalPdfName, blocks: [] })
      } else {
        await updateDoc(doc(db, 'blog', postId), { ...meta, blocks, pdfUrl: '', pdfName: '' })
      }

      onDone()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const canSave = contentMode === 'blocks' || !!pdfFile || !!pdfUrl

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onCancel} className="self-start text-sm text-gray-400 hover:text-white transition-colors">
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

      {/* Selector de modo */}
      <div className="flex items-center gap-1 p-1 bg-[#111] border border-gray-800 rounded-lg w-fit">
        <button
          onClick={() => setContentMode('blocks')}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${contentMode === 'blocks' ? 'bg-[#f4c430] text-black' : 'text-gray-400 hover:text-white'}`}
        >
          Blocks
        </button>
        <button
          onClick={() => setContentMode('pdf')}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${contentMode === 'pdf' ? 'bg-[#f4c430] text-black' : 'text-gray-400 hover:text-white'}`}
        >
          PDF
        </button>
      </div>

      {/* PDF picker */}
      <label className={`flex items-center gap-3 cursor-pointer border border-dashed rounded-lg px-4 py-5 hover:border-[#f4c430] transition-colors ${contentMode !== 'pdf' ? 'hidden' : ''} ${pdfFile || pdfUrl ? 'border-[#f4c430]/50' : 'border-gray-700'}`}>
        <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
        <span className="text-2xl">📄</span>
        <div className="flex flex-col min-w-0">
          <span className="text-sm text-[#FAFAFA] truncate">
            {pdfFile ? pdfFile.name : pdfUrl ? (pdfName || 'archivo.pdf') : 'Seleccionar archivo PDF'}
          </span>
          {(pdfFile || pdfUrl) && <span className="text-xs text-gray-500 mt-0.5">Click para reemplazar</span>}
        </div>
      </label>

      {/* Block editor */}
      {contentMode === 'blocks' && (
        <BlockEditor blocks={blocks} onChange={setBlocks} />
      )}

      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !canSave || !date.trim() || !title.trim() || !description.trim()}
          className="px-5 py-2 text-sm font-medium bg-[#f4c430] text-black rounded-lg hover:bg-[#e4b020] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
