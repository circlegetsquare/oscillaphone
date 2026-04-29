import WallControls from './WallControls'
import CircleControls from './CircleControls'
import GlobalControls from './GlobalControls'
import { useAudio } from '../../../context/AudioContext'
import Button from '../../shared/Button'

interface AudioControlsProps {
  visible: boolean
  speed: number
  setSpeed: (speed: number) => void
}

export default function AudioControls({ visible, speed, setSpeed }: AudioControlsProps) {
  const { resetAllControls } = useAudio()

  if (!visible) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <GlobalControls speed={speed} setSpeed={setSpeed} />
      <CircleControls />
      <WallControls />

      <div style={{
        padding: '0px',
        backgroundColor: 'rgba(0, 0, 0, 0.0)',
        borderRadius: '4px',
        marginBottom: '4px',
      }}>
        <Button
          onClick={resetAllControls}
          style={{
            backgroundColor: 'transparent',
            color: '#6b21a8',
            border: '2px solid #6b21a8',
            width: '100%',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#6b21a8'
            e.currentTarget.style.color = 'white'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#6b21a8'
          }}
        >
          Reset controls
        </Button>
      </div>
    </div>
  )
}
