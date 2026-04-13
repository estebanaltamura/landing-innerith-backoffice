import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, storage } from '../../lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Block } from './types'
import Spinner from './Spinner'
import BlockEditor from './BlockEditor'

export default function ThesisEditor() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [contentMode, setContentMode] = useState<'blocks' | 'pdf'>('blocks')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [pdfName, setPdfName] = useState('')

  useEffect(() => {
    getDoc(doc(db, 'thesis', 'main')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data()
        if (data.pdfUrl) {
          setContentMode('pdf')
          setPdfUrl(data.pdfUrl)
          setPdfName(data.pdfName ?? '')
        } else {
          setBlocks(data.blocks ?? [])
        }
      }
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (contentMode === 'pdf') {
        let finalPdfUrl = pdfUrl
        let finalPdfName = pdfName
        if (pdfFile) {
          const storageRef = ref(storage, 'thesis/main.pdf')
          await uploadBytes(storageRef, pdfFile, { contentType: 'application/pdf' })
          finalPdfUrl = await getDownloadURL(storageRef)
          finalPdfName = pdfFile.name
        }
        if (!finalPdfUrl) throw new Error('No PDF')
        await setDoc(doc(db, 'thesis', 'main'), { pdfUrl: finalPdfUrl, pdfName: finalPdfName, blocks: [] })
        setPdfUrl(finalPdfUrl)
        setPdfName(finalPdfName)
        setPdfFile(null)
      } else {
        await setDoc(doc(db, 'thesis', 'main'), { blocks, pdfUrl: '', pdfName: '' })
        setPdfUrl('')
        setPdfName('')
        setPdfFile(null)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const canSave = contentMode === 'blocks' || !!pdfFile || !!pdfUrl

  return (
    <div className="flex flex-col gap-3">
      {loading && <Spinner />}

      <div className={loading ? 'hidden' : 'flex flex-col gap-3'}>
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

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="px-5 py-2 text-sm font-medium bg-[#f4c430] text-black rounded-lg hover:bg-[#e4b020] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
