import { useState } from 'react'
import { Pencil, Trash2, Plus, GripVertical } from 'lucide-react'
import { BlogPost } from './types'
import Spinner from './Spinner'
import Modal from './Modal'

type Props = {
  posts: BlogPost[]
  loading: boolean
  onAdd: () => void
  onEdit: (post: BlogPost) => void
  onDelete: (id: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

export default function BlogPostList({ posts, loading, onAdd, onEdit, onDelete, onReorder }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={onAdd} className="flex items-center gap-2 bg-[#f4c430] text-black text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#e4b020] transition-colors">
          <Plus size={16} /> Add
        </button>
      </div>

      {loading ? <Spinner /> : posts.length === 0 ? (
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
              onDrop={() => { onReorder(dragIndex!, index); setDragIndex(null); setDragOverIndex(null) }}
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
                  <button onClick={() => onEdit(post)} className="p-1.5 text-gray-400 hover:text-[#f4c430] transition-colors"><Pencil size={15} /></button>
                  <button onClick={() => setDeleteId(post._id)} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
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
            <button onClick={() => { onDelete(deleteId); setDeleteId(null) }} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
