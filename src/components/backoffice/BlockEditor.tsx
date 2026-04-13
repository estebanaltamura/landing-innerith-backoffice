import { Block, BlockType } from './types'

const BLOCK_LABELS: Record<BlockType, string> = {
  h1: 'H1',
  h2: 'H2',
  p: 'Paragraph',
  imageUrl: 'Image URL',
  videoUrl: 'Video URL',
  divider: 'Divider',
  spacer: 'Spacer',
}

const NO_CONTENT_TYPES: BlockType[] = ['divider', 'spacer']

type Props = {
  blocks: Block[]
  onChange: (blocks: Block[]) => void
}

export default function BlockEditor({ blocks, onChange }: Props) {
  const update = (index: number, content: string) => {
    onChange(blocks.map((b, i) => (i === index ? { ...b, content } : b)))
  }

  const updateMaxWidth = (index: number, maxWidth: string) => {
    onChange(blocks.map((b, i) => (i === index ? { ...b, maxWidth: maxWidth || undefined } : b)))
  }

  const remove = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const next = [...blocks]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    onChange(next)
  }

  const moveDown = (index: number) => {
    if (index === blocks.length - 1) return
    const next = [...blocks]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    onChange(next)
  }

  const addBlock = (type: BlockType) => {
    onChange([...blocks, { type, content: '' }])
  }

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, i) => (
        <div key={i} className="flex gap-2 items-start bg-[#111] border border-gray-800 rounded-lg p-3">
          <span className="text-xs font-bold text-[#f4c430] w-20 shrink-0 pt-2">
            {BLOCK_LABELS[block.type]}
          </span>

          {NO_CONTENT_TYPES.includes(block.type) ? (
            <div className="flex-1" />
          ) : block.type === 'p' ? (
            <textarea
              rows={3}
              value={block.content}
              onChange={(e) => update(i, e.target.value)}
              placeholder="Text..."
              className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded px-2 py-1.5 text-[#FAFAFA] text-sm focus:outline-none focus:border-[#f4c430] transition-colors resize-none"
            />
          ) : block.type === 'imageUrl' || block.type === 'videoUrl' ? (
            <div className="flex flex-col gap-1.5 flex-1">
              <input
                value={block.content}
                onChange={(e) => update(i, e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-2 py-1.5 text-[#FAFAFA] text-sm focus:outline-none focus:border-[#f4c430] transition-colors"
              />
              <input
                value={block.maxWidth ?? ''}
                onChange={(e) => updateMaxWidth(i, e.target.value)}
                placeholder="Max width (opcional): 500px / 80%"
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-2 py-1.5 text-gray-400 text-xs focus:outline-none focus:border-[#f4c430] transition-colors"
              />
            </div>
          ) : (
            <input
              value={block.content}
              onChange={(e) => update(i, e.target.value)}
              placeholder="Text..."
              className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded px-2 py-1.5 text-[#FAFAFA] text-sm focus:outline-none focus:border-[#f4c430] transition-colors"
            />
          )}

          <div className="flex flex-col gap-1 shrink-0 pt-1">
            <button
              onClick={() => moveUp(i)}
              disabled={i === 0}
              className="text-gray-500 hover:text-white disabled:opacity-20 text-xs leading-none px-1"
            >
              ↑
            </button>
            <button
              onClick={() => moveDown(i)}
              disabled={i === blocks.length - 1}
              className="text-gray-500 hover:text-white disabled:opacity-20 text-xs leading-none px-1"
            >
              ↓
            </button>
            <button
              onClick={() => remove(i)}
              className="text-red-500 hover:text-red-400 text-xs leading-none px-1 mt-1"
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2 mt-1">
        {(['h1', 'h2', 'p', 'imageUrl', 'videoUrl', 'divider', 'spacer'] as BlockType[]).map((type) => (
          <button
            key={type}
            onClick={() => addBlock(type)}
            className="px-3 py-1.5 text-xs border border-gray-700 text-gray-400 rounded-lg hover:border-[#f4c430] hover:text-[#f4c430] transition-colors"
          >
            + {BLOCK_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  )
}
