import type { OversampleType } from '../../../types/audio'
import type { CSSProperties } from 'react'
import Slider from '../../shared/Slider'
import Checkbox from '../../shared/Checkbox'
import Button from '../../shared/Button'
import ControlPanel from '../../shared/ControlPanel'

interface ControlProp<T> {
  value: T
  onChange: (v: T) => void
}

interface WaveformProp {
  value: string
  onChange: (v: OscillatorType) => void
  options: Array<{ id: string; name: string }>
}

interface DelayProps {
  enabled: ControlProp<boolean>
  time: ControlProp<number>
  feedback: ControlProp<number>
  mix: ControlProp<number>
}

interface ReverbProps {
  enabled: ControlProp<boolean>
  roomSize: ControlProp<number>
  damping: ControlProp<number>
  mix: ControlProp<number>
}

interface DistortionProps {
  enabled: ControlProp<boolean>
  amount: ControlProp<number>
  oversample?: ControlProp<OversampleType>
  mix: ControlProp<number>
}

interface TremoloProps {
  enabled: ControlProp<boolean>
  rate: ControlProp<number>
  depth: ControlProp<number>
  mix: ControlProp<number>
}

interface EffectControlsProps {
  title?: string
  waveform: WaveformProp
  volume: ControlProp<number>
  duration: ControlProp<number>
  detune: ControlProp<number>
  delay?: DelayProps
  reverb?: ReverbProps
  distortion?: DistortionProps
  tremolo?: TremoloProps
}

const sectionLabel: CSSProperties = {
  color: 'white',
  fontWeight: 'bold',
  display: 'block',
  marginBottom: '8px',
  fontFamily: 'system-ui, sans-serif',
  fontSize: '14px',
}

const smallLabel: CSSProperties = {
  color: 'white',
  display: 'block',
  marginBottom: '6px',
  fontFamily: 'system-ui, sans-serif',
  fontSize: '13px',
}

export default function EffectControls({
  title,
  waveform,
  volume,
  duration,
  detune,
  delay,
  reverb,
  distortion,
  tremolo,
}: EffectControlsProps) {
  return (
    <ControlPanel title={title}>
      {/* Waveform */}
      <div style={{ marginBottom: '16px' }}>
        <label style={sectionLabel}>Waveform</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {waveform.options.map(wave => (
            <Button key={wave.id} onClick={() => waveform.onChange(wave.id as OscillatorType)} isActive={waveform.value === wave.id}>
              {wave.name}
            </Button>
          ))}
        </div>
      </div>

      <Slider label="Volume" value={volume.value} onChange={volume.onChange}
        min={0} max={1.0} step={0.05}
        formatValue={(v) => `${(v * 100).toFixed(0)}%`}
        style={{ marginBottom: '12px' }} />

      <Slider label="Duration" value={duration.value} onChange={duration.onChange}
        min={0.05} max={5.0} step={0.05}
        formatValue={(v) => `${v.toFixed(2)}s`}
        style={{ marginBottom: '12px' }} />

      <Slider label="Detune" value={detune.value} onChange={detune.onChange}
        min={-1200} max={1200} step={100}
        formatValue={(v) => `${v} cents`}
        style={{ marginBottom: '16px' }} />

      {/* Tremolo */}
      {tremolo && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ marginBottom: '8px' }}>
            <Checkbox label="Tremolo" checked={tremolo.enabled.value} onChange={tremolo.enabled.onChange} />
          </div>
          {tremolo.enabled.value && (
            <>
              <Slider label="Rate" value={tremolo.rate.value} onChange={tremolo.rate.onChange}
                min={0.1} max={20.0} step={0.1}
                formatValue={(v) => `${v.toFixed(1)} Hz`}
                style={{ marginBottom: '8px' }} />
              <Slider label="Depth" value={tremolo.depth.value} onChange={tremolo.depth.onChange}
                min={0} max={1.0} step={0.05}
                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                style={{ marginBottom: '8px' }} />
              <Slider label="Mix" value={tremolo.mix.value} onChange={tremolo.mix.onChange}
                min={0} max={1.0} step={0.1}
                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                style={{ marginBottom: '16px' }} />
            </>
          )}
        </div>
      )}

      {/* Distortion */}
      {distortion && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ marginBottom: '8px' }}>
            <Checkbox label="Distortion" checked={distortion.enabled.value} onChange={distortion.enabled.onChange} />
          </div>
          {distortion.enabled.value && (
            <>
              <Slider label="Amount" value={distortion.amount.value} onChange={distortion.amount.onChange}
                min={0} max={1.0} step={0.05}
                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                style={{ marginBottom: '8px' }} />
              {distortion.oversample && (
                <div style={{ marginBottom: '8px' }}>
                  <label style={smallLabel}>Oversample</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    {(['none', '2x', '4x'] as OversampleType[]).map(opt => (
                      <Button key={opt} onClick={() => distortion.oversample!.onChange(opt)}
                        isActive={distortion.oversample!.value === opt}>
                        {opt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <Slider label="Mix" value={distortion.mix.value} onChange={distortion.mix.onChange}
                min={0} max={1.0} step={0.1}
                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                style={{ marginBottom: '16px' }} />
            </>
          )}
        </div>
      )}

      {/* Reverb */}
      {reverb && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ marginBottom: '8px' }}>
            <Checkbox label="Reverb" checked={reverb.enabled.value} onChange={reverb.enabled.onChange} />
          </div>
          {reverb.enabled.value && (
            <>
              <Slider label="Room Size" value={reverb.roomSize.value} onChange={reverb.roomSize.onChange}
                min={0} max={1.0} step={0.1}
                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                style={{ marginBottom: '8px' }} />
              <Slider label="Damping" value={reverb.damping.value} onChange={reverb.damping.onChange}
                min={0} max={1.0} step={0.1}
                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                style={{ marginBottom: '8px' }} />
              <Slider label="Mix" value={reverb.mix.value} onChange={reverb.mix.onChange}
                min={0} max={1.0} step={0.1}
                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                style={{ marginBottom: '16px' }} />
            </>
          )}
        </div>
      )}

      {/* Delay */}
      {delay && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ marginBottom: '8px' }}>
            <Checkbox label="Delay" checked={delay.enabled.value} onChange={delay.enabled.onChange} />
          </div>
          {delay.enabled.value && (
            <>
              <Slider label="Delay Time" value={delay.time.value} onChange={delay.time.onChange}
                min={0.1} max={1.0} step={0.1}
                formatValue={(v) => `${v.toFixed(2)}s`}
                style={{ marginBottom: '8px' }} />
              <Slider label="Feedback" value={delay.feedback.value} onChange={delay.feedback.onChange}
                min={0} max={0.9} step={0.1}
                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                style={{ marginBottom: '8px' }} />
              <Slider label="Mix" value={delay.mix.value} onChange={delay.mix.onChange}
                min={0} max={1} step={0.1}
                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                style={{ marginBottom: '16px' }} />
            </>
          )}
        </div>
      )}
    </ControlPanel>
  )
}
