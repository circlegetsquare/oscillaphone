import React from 'react'
import Slider from '../../shared/Slider'
import Checkbox from '../../shared/Checkbox'
import Button from '../../shared/Button'
import ControlPanel from '../../shared/ControlPanel'

/**
 * Base component for audio effect controls
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Panel title
 * @param {Object} props.waveform - Waveform settings { value, onChange, options }
 * @param {Object} props.volume - Volume settings { value, onChange }
 * @param {Object} props.duration - Duration settings { value, onChange }
 * @param {Object} props.detune - Detune settings { value, onChange }
 * @param {Object} props.delay - Delay effect settings
 * @param {Object} props.reverb - Reverb effect settings
 * @param {Object} props.distortion - Distortion effect settings
 * @param {Object} props.tremolo - Tremolo effect settings
 */
export default function EffectControls({
  title,
  waveform,
  volume,
  duration,
  detune,
  delay,
  reverb,
  distortion,
  tremolo
}) {
  return (
    <ControlPanel title={title}>
      {/* Waveform Selection */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          color: 'white',
          fontWeight: 'bold',
          display: 'block',
          marginBottom: '8px',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px'
        }}>
          Waveform
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px'
        }}>
          {waveform.options.map(wave => (
            <Button
              key={wave.id}
              onClick={() => waveform.onChange(wave.id)}
              isActive={waveform.value === wave.id}
            >
              {wave.name}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Volume Control */}
      <Slider
        label="Volume"
        value={volume.value}
        onChange={volume.onChange}
        min={0}
        max={1.0}
        step={0.05}
        formatValue={(val) => `${(val * 100).toFixed(0)}%`}
        style={{ marginBottom: '12px' }}
      />
      
      {/* Duration Control */}
      <Slider
        label="Duration"
        value={duration.value}
        onChange={duration.onChange}
        min={0.05}
        max={5.0}
        step={0.05}
        formatValue={(val) => `${val.toFixed(2)}s`}
        style={{ marginBottom: '12px' }}
      />
      
      {/* Detune Control */}
      <Slider
        label="Detune"
        value={detune.value}
        onChange={detune.onChange}
        min={-1200}
        max={1200}
        step={100}
        formatValue={(val) => `${val} cents`}
        style={{ marginBottom: '16px' }}
      />
      
      {/* Delay Effect Controls */}
      {delay && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ marginBottom: '8px' }}>
            <Checkbox
              label="Delay"
              checked={delay.enabled.value}
              onChange={delay.enabled.onChange}
            />
          </div>
          
          {delay.enabled.value && (
            <>
              <Slider
                label="Delay Time"
                value={delay.time.value}
                onChange={delay.time.onChange}
                min={0.1}
                max={1.0}
                step={0.1}
                formatValue={(val) => `${val.toFixed(2)}s`}
                style={{ marginBottom: '8px' }}
              />
              <Slider
                label="Feedback"
                value={delay.feedback.value}
                onChange={delay.feedback.onChange}
                min={0}
                max={0.9}
                step={0.1}
                formatValue={(val) => `${(val * 100).toFixed(0)}%`}
                style={{ marginBottom: '8px' }}
              />
              <Slider
                label="Mix"
                value={delay.mix.value}
                onChange={delay.mix.onChange}
                min={0}
                max={1}
                step={0.1}
                formatValue={(val) => `${(val * 100).toFixed(0)}%`}
                style={{ marginBottom: '16px' }}
              />
            </>
          )}
        </div>
      )}
      
      {/* Reverb Effect Controls */}
      {reverb && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ marginBottom: '8px' }}>
            <Checkbox
              label="Reverb"
              checked={reverb.enabled.value}
              onChange={reverb.enabled.onChange}
            />
          </div>
          
          {reverb.enabled.value && (
            <>
              <Slider
                label="Room Size"
                value={reverb.roomSize.value}
                onChange={reverb.roomSize.onChange}
                min={0}
                max={1.0}
                step={0.1}
                formatValue={(val) => `${(val * 100).toFixed(0)}%`}
                style={{ marginBottom: '8px' }}
              />
              <Slider
                label="Damping"
                value={reverb.damping.value}
                onChange={reverb.damping.onChange}
                min={0}
                max={1.0}
                step={0.1}
                formatValue={(val) => `${(val * 100).toFixed(0)}%`}
                style={{ marginBottom: '8px' }}
              />
              <Slider
                label="Mix"
                value={reverb.mix.value}
                onChange={reverb.mix.onChange}
                min={0}
                max={1.0}
                step={0.1}
                formatValue={(val) => `${(val * 100).toFixed(0)}%`}
                style={{ marginBottom: '16px' }}
              />
            </>
          )}
        </div>
      )}
      
      {/* Distortion Effect Controls */}
      {distortion && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ marginBottom: '8px' }}>
            <Checkbox
              label="Distortion"
              checked={distortion.enabled.value}
              onChange={distortion.enabled.onChange}
            />
          </div>
          
          {distortion.enabled.value && (
            <>
              <Slider
                label="Amount"
                value={distortion.amount.value}
                onChange={distortion.amount.onChange}
                min={0}
                max={1.0}
                step={0.05}
                formatValue={(val) => `${(val * 100).toFixed(0)}%`}
                style={{ marginBottom: '8px' }}
              />
              <div style={{ marginBottom: '8px' }}>
                <label style={{
                  color: 'white',
                  fontSize: '14px',
                  fontFamily: 'system-ui, sans-serif',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Oversample: {distortion.oversample.value}
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px'
                }}>
                  {['none', '2x', '4x'].map(option => (
                    <Button
                      key={option}
                      onClick={() => distortion.oversample.onChange(option)}
                      isActive={distortion.oversample.value === option}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
              <Slider
                label="Mix"
                value={distortion.mix.value}
                onChange={distortion.mix.onChange}
                min={0}
                max={1.0}
                step={0.1}
                formatValue={(val) => `${(val * 100).toFixed(0)}%`}
                style={{ marginBottom: '16px' }}
              />
            </>
          )}
        </div>
      )}
      
      {/* Tremolo Effect Controls */}
      {tremolo && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ marginBottom: '8px' }}>
            <Checkbox
              label="Tremolo"
              checked={tremolo.enabled.value}
              onChange={tremolo.enabled.onChange}
            />
          </div>
          
          {tremolo.enabled.value && (
            <>
              <Slider
                label="Rate"
                value={tremolo.rate.value}
                onChange={tremolo.rate.onChange}
                min={0.1}
                max={20.0}
                step={0.1}
                formatValue={(val) => `${val.toFixed(1)} Hz`}
                style={{ marginBottom: '8px' }}
              />
              <Slider
                label="Depth"
                value={tremolo.depth.value}
                onChange={tremolo.depth.onChange}
                min={0}
                max={1.0}
                step={0.05}
                formatValue={(val) => `${(val * 100).toFixed(0)}%`}
                style={{ marginBottom: '8px' }}
              />
              <Slider
                label="Mix"
                value={tremolo.mix.value}
                onChange={tremolo.mix.onChange}
                min={0}
                max={1.0}
                step={0.1}
                formatValue={(val) => `${(val * 100).toFixed(0)}%`}
                style={{ marginBottom: '16px' }}
              />
            </>
          )}
        </div>
      )}
    </ControlPanel>
  )
}
