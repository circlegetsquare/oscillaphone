import React from 'react'

const sliderContainerStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
}

const sliderStyles = {
  width: '200px',
  cursor: 'pointer',
  accentColor: '#9333ea'
}

const labelStyles = {
  color: 'white',
  fontSize: '14px',
  fontFamily: 'system-ui, sans-serif',
  userSelect: 'none'
}

/**
 * Reusable Slider component for numeric inputs
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Label text
 * @param {number} props.value - Current value
 * @param {Function} props.onChange - Change handler function
 * @param {number} props.min - Minimum value
 * @param {number} props.max - Maximum value
 * @param {number} props.step - Step increment
 * @param {Function} props.formatValue - Function to format the displayed value
 * @param {Object} props.style - Additional container styles
 * @param {Object} props.sliderStyle - Additional slider styles
 * @param {Object} props.labelStyle - Additional label styles
 */
export default function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.1,
  formatValue = (val) => val.toFixed(2),
  style = {},
  sliderStyle = {},
  labelStyle = {}
}) {
  const handleChange = (e) => {
    onChange(Number(e.target.value))
  }
  
  return (
    <div style={{ ...sliderContainerStyles, ...style }}>
      <label style={{ ...labelStyles, ...labelStyle }}>
        {label}: {formatValue(value)}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        style={{ ...sliderStyles, ...sliderStyle }}
      />
    </div>
  )
}
