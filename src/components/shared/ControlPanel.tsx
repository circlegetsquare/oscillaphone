import type { ReactNode, CSSProperties } from 'react'

interface ControlPanelProps {
  title?: string
  children?: ReactNode
  style?: CSSProperties
  headerStyle?: CSSProperties
}

const panelStyles: CSSProperties = {
  padding: '12px',
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  borderRadius: '4px',
  marginBottom: '6px',
}

const headerStyles: CSSProperties = {
  color: 'white',
  fontWeight: 'bold',
  fontSize: '16px',
  marginBottom: '12px',
  display: 'block',
  fontFamily: 'system-ui, sans-serif',
}

export default function ControlPanel({ title, children, style = {}, headerStyle = {} }: ControlPanelProps) {
  return (
    <div style={{ ...panelStyles, ...style }}>
      {title && <label style={{ ...headerStyles, ...headerStyle }}>{title}</label>}
      {children}
    </div>
  )
}
