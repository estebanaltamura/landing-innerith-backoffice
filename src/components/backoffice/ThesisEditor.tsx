import { useState, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, storage } from '../../lib/firebase'
import { ref, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage'
import { TOOLBAR_BTN, videoHTML } from './utils'
import Spinner from './Spinner'

export default function ThesisEditor() {
  const editorRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [contentMode, setContentMode] = useState<'html' | 'pdf'>('html')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [pdfName, setPdfName] = useState('')

  useEffect(() => {
    getDoc(doc(db, 'thesis', 'main')).then(async (snap) => {
      if (!snap.exists()) { setLoading(false); return }
      const data = snap.data()
      if (data.pdfUrl) {
        setContentMode('pdf'); setPdfUrl(data.pdfUrl); setPdfName(data.pdfName ?? '')
      } else if (data.contentUrl) {
        const res = await fetch(data.contentUrl)
        const html = await res.text()
        if (editorRef.current) editorRef.current.innerHTML = html
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
        await setDoc(doc(db, 'thesis', 'main'), { pdfUrl: finalPdfUrl, pdfName: finalPdfName, contentUrl: '' })
        setPdfUrl(finalPdfUrl); setPdfName(finalPdfName); setPdfFile(null)
        if (editorRef.current) editorRef.current.innerHTML = ''
      } else {
        if (!editorRef.current) return
        const html = editorRef.current.innerHTML
        const storageRef = ref(storage, 'thesis/main.html')
        await uploadString(storageRef, html, 'raw', { contentType: 'text/html; charset=utf-8' })
        const contentUrl = await getDownloadURL(storageRef)
        await setDoc(doc(db, 'thesis', 'main'), { contentUrl, pdfUrl: '', pdfName: '' })
        setPdfUrl(''); setPdfName(''); setPdfFile(null)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  const canSave = contentMode === 'html' || !!pdfFile || !!pdfUrl

  return (
    <div className="flex flex-col gap-3">
      {/* Selector de modo */}
      <div className="flex items-center gap-1 p-1 bg-[#111] border border-gray-800 rounded-lg w-fit">
        <button
          onClick={() => setContentMode('html')}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${contentMode === 'html' ? 'bg-[#f4c430] text-black' : 'text-gray-400 hover:text-white'}`}
        >
          HTML
        </button>
        <button
          onClick={() => setContentMode('pdf')}
          className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${contentMode === 'pdf' ? 'bg-[#f4c430] text-black' : 'text-gray-400 hover:text-white'}`}
        >
          PDF
        </button>
      </div>

      {/* PDF picker — siempre montado para no perder el archivo */}
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

      {/* HTML editor — siempre montado para no perder el contenido */}
      <div className={contentMode !== 'html' ? 'hidden' : 'flex flex-col gap-3'}>
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
      </div>

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
  )
}
