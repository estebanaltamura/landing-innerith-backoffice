import { FieldDef } from './types'

const base =
  'w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-[#FAFAFA] text-sm focus:outline-none focus:border-[#f4c430] transition-colors'

export default function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: any
  onChange: (val: any) => void
}) {
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
