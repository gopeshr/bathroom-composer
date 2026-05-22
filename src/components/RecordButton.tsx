import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Upload } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { InstrumentType } from '../store/useStore';
import { AudioRecorder, resampleAudioBuffer } from '../audio/recorder';
import { transcribeAudio } from '../audio/transcriber';
import { LiveVisualizer } from './LiveVisualizer';

const INSTRUMENT_COLORS: Record<InstrumentType, string> = {
  piano: '#3b82f6', // blue
  drums: '#ef4444', // red
  guitar: '#eab308', // orange
  flute: '#10b981', // green
  violin: '#8b5cf6', // purple
  bass: '#f97316', // orange-500
  synth: '#ec4899', // pink
  choir: '#0ea5e9', // emerald
  sax: '#d946ef', // pink-500
  trumpet: '#eab308', // yellow
  marimba: '#14b8a6' // teal
};

export const RecordButton: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const recorderRef = useRef<AudioRecorder | null>(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      setDevices(audioInputs);
      if (audioInputs.length > 0) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
    }).catch(console.error);
  }, []);
  const addTrack = useStore(state => state.addTrack);
  const tracksCount = useStore(state => state.tracks.length);

  const processAudioBuffer = async (audioBuffer: AudioBuffer) => {
    setIsProcessing(true);
    try {
      const notes = await transcribeAudio(audioBuffer, (p) => setProgress(p * 100));
      
      if (notes.length > 0) {
        const instrument: InstrumentType = 'piano'; // default
        addTrack({
          name: `Track ${tracksCount + 1}`,
          instrument,
          notes: notes.map(n => ({
            pitch: n.pitchMidi,
            startTime: n.startTimeSeconds,
            duration: n.durationSeconds,
            velocity: Math.floor(n.amplitude * 127)
          })),
          muted: false,
          solo: false,
          volume: 0.8,
          color: INSTRUMENT_COLORS[instrument]
        });
      } else {
        alert('No notes detected. Try humming louder or longer!');
      }
    } catch (err) {
      console.error('Error during transcription:', err);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleRecordClick = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setAnalyser(null);
      setIsProcessing(true);
      try {
        const audioBuffer = await recorderRef.current!.stopRecording();
        await processAudioBuffer(audioBuffer);
      } catch (err) {
        console.error('Error during recording stop:', err);
      }
    } else {
      // Start recording
      try {
        if (!recorderRef.current) {
          recorderRef.current = new AudioRecorder();
        }
        await recorderRef.current.startRecording(selectedDeviceId || undefined);
        setIsRecording(true);
        setAnalyser(recorderRef.current.analyser);
      } catch (err) {
        console.error('Could not start recording:', err);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      // Resample the uploaded file to 22050Hz Mono
      const resampledBuffer = await resampleAudioBuffer(audioBuffer);
      await processAudioBuffer(resampledBuffer);
    } catch (err) {
      console.error('Failed to process uploaded file:', err);
      alert('Could not process this audio file.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset input
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        {/* Record Button */}
        <button
          onClick={handleRecordClick}
          disabled={isProcessing}
          className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-pulse' 
              : isProcessing
              ? 'bg-surface-border cursor-not-allowed'
              : 'bg-gradient-to-br from-primary-500 to-accent-purple hover:scale-105 shadow-lg'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : isRecording ? (
            <Square className="w-8 h-8 text-white fill-current" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>

        {/* Upload Button */}
        {!isRecording && !isProcessing && (
          <>
            <input 
              type="file" 
              accept="audio/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="glass-button w-14 h-14 flex items-center justify-center hover:scale-105"
              title="Upload Audio File"
            >
              <Upload className="w-6 h-6 text-slate-300" />
            </button>
          </>
        )}
      </div>
      
      {isProcessing && (
        <div className="text-xs text-slate-400 font-medium tracking-wide">
          Processing... {progress.toFixed(0)}%
        </div>
      )}
      {!isProcessing && !isRecording && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs text-slate-400 font-medium tracking-wide">
            Tap to Hum or Upload
          </div>
          {devices.length > 0 && (
            <select 
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="text-xs bg-surface-card border border-surface-border text-slate-300 rounded px-2 py-1 max-w-[150px] truncate"
            >
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      {isRecording && <LiveVisualizer analyser={analyser} />}
    </div>
  );
};
