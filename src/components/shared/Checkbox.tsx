import type { CSSProperties } from 'react'

interface CheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  style?: CSSProperties
  checkboxStyle?: CSSProperties
  labelStyle?: CSSProperties
}

const checkboxStyles: CSSProperties = {
  marginRight: '8px',
  accentColor: '#9333ea',
  cursor: 'pointer',
}

const labelStyles: CSSProperties = {
  color: 'white',
  fontSize: '14px',
  fontFamily: 'system-ui, sans-serif',
  userSelect: 'none',
  display: 'flex',
  alignItems: 'center',
}

export default function Checkbox({
  label,
  checked,
  onChange,
  checkboxStyle = {},
  labelStyle = {},
}: CheckboxProps) {
  return (
    <label style={{ ...labelStyles, ...labelStyle }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ ...checkboxStyles, ...checkboxStyle }}
      />
      {label}
    </label>
  )
}
