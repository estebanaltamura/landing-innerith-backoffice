import { useState } from 'react'
import { Tab, CrudTab, TABS, CONFIGS } from '../components/backoffice/types'
import CrudSection from '../components/backoffice/CrudSection'
import BlogEditor from '../components/backoffice/BlogEditor'
import ThesisEditor from '../components/backoffice/ThesisEditor'

export default function Backoffice() {
  const [activeTab, setActiveTab] = useState<Tab>('team')

  return (
    <div className="min-h-screen bg-black text-[#FAFAFA] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold tracking-wide mb-8">Backoffice</h1>

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

        {activeTab === 'thesis'
          ? <ThesisEditor />
          : activeTab === 'blog'
          ? <BlogEditor />
          : <CrudSection key={activeTab} config={CONFIGS[activeTab as CrudTab]} />
        }
      </div>
    </div>
  )
}
