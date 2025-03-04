import React from 'react'

const checkboxStyles = {
  marginRight: '8px',
  accentColor: '#9333ea',
  cursor: 'pointer'
}

const labelStyles = {
  color: 'white',
  fontSize: '14px',
  fontFamily: 'system-ui, sans-serif',
  userSelect: 'none',
  display: 'flex',
  alignItems: 'center'
}

/**
 * Reusable Checkbox component
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Label text
 * @param {boolean} props.checked - Whether the checkbox is checked
 * @param {Function} props.onChange - Change handler function
 * @param {Object} props.style - Additional container styles
 * @param {Object} props.checkboxStyle - Additional checkbox styles
 * @param {Object} props.labelStyle - Additional label styles
 */
export default function Checkbox({
  label,
  checked,
  onChange,
  style = {},
  checkboxStyle = {},
  labelStyle = {}
}) {
  const handleChange = (e) => {
    onChange(e.target.checked)
  }
  
  return (
    <label style={{ ...labelStyles, ...labelStyle }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        style={{ ...checkboxStyles, ...checkboxStyle }}
      />
      {label}
    </label>
  )
}
