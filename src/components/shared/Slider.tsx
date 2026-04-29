import type { CSSProperties } from 'react'

interface SliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  formatValue?: (value: number) => string
  style?: CSSProperties
  sliderStyle?: CSSProperties
  labelStyle?: CSSProperties
}

const containerStyles: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
}

const sliderStyles: CSSProperties = {
  width: '200px',
  cursor: 'pointer',
  accentColor: '#9333ea',
}

const labelStyles: CSSProperties = {
  color: 'white',
  fontSize: '14px',
  fontFamily: 'system-ui, sans-serif',
  userSelect: 'none',
}

export default function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.1,
  formatValue = (val: number) => val.toFixed(2),
  style = {},
  sliderStyle = {},
  labelStyle = {},
}: SliderProps) {
  return (
    <div style={{ ...containerStyles, ...style }}>
      <label style={{ ...labelStyles, ...labelStyle }}>
        {label}: {formatValue(value)}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuetext={formatValue(value)}
        style={{ ...sliderStyles, ...sliderStyle }}
      />
    </div>
  )
}
