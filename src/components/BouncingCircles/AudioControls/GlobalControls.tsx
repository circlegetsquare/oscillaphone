import Slider from '../../shared/Slider'
import ControlPanel from '../../shared/ControlPanel'
import { useAudio } from '../../../context/AudioContext'

interface GlobalControlsProps {
  speed: number
  setSpeed: (speed: number) => void
}

export default function GlobalControls({ speed, setSpeed }: GlobalControlsProps) {
  const { globalVolume, setGlobalVolume } = useAudio()

  return (
    <ControlPanel>
      <Slider
        label="Master Volume"
        value={globalVolume}
        onChange={setGlobalVolume}
        min={0}
        max={1.0}
        step={0.05}
        formatValue={(v) => `${(v * 100).toFixed(0)}%`}
        style={{ marginBottom: '12px' }}
      />
      <Slider
        label="Ball Speed"
        value={speed}
        onChange={setSpeed}
        min={5}
        max={30}
        step={1}
        formatValue={(v) => `${v}`}
      />
    </ControlPanel>
  )
}
