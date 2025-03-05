import React from 'react'

const panelStyles = {
  padding: '12px',
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  borderRadius: '4px',
  marginBottom: '20px'
}

const headerStyles = {
  color: 'white',
  fontWeight: 'bold',
  fontSize: '16px',
  marginBottom: '12px',
  display: 'block',
  fontFamily: 'system-ui, sans-serif'
}

/**
 * Reusable ControlPanel component for grouping related controls
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Panel title
 * @param {React.ReactNode} props.children - Panel content
 * @param {Object} props.style - Additional panel styles
 * @param {Object} props.headerStyle - Additional header styles
 */
export default function ControlPanel({
  title,
  children,
  style = {},
  headerStyle = {}
}) {
  return (
    <div style={{ ...panelStyles, ...style }}>
      {title && (
        <label style={{ ...headerStyles, ...headerStyle }}>
          {title}
        </label>
      )}
      {children}
    </div>
  )
}
