import { useState, useEffect } from 'react'
import { collection, getDocs, deleteDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { BlogPost } from './types'
import BlogPostList from './BlogPostList'
import BlogPostEditor from './BlogPostEditor'

type View = { mode: 'list' } | { mode: 'new' } | { mode: 'edit'; post: BlogPost }

export default function BlogEditor() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>({ mode: 'list' })

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

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'blog', id)); await load()
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
      console.error(err); await load()
    }
  }

  if (view.mode !== 'list') {
    return (
      <BlogPostEditor
        post={view.mode === 'edit' ? view.post : null}
        postsCount={posts.length}
        onDone={() => { load(); setView({ mode: 'list' }) }}
        onCancel={() => setView({ mode: 'list' })}
      />
    )
  }

  return (
    <BlogPostList
      posts={posts}
      loading={loading}
      onAdd={() => setView({ mode: 'new' })}
      onEdit={(post) => setView({ mode: 'edit', post })}
      onDelete={handleDelete}
      onReorder={handleReorder}
    />
  )
}
