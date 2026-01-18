import { useState, useEffect, useRef, useCallback } from 'react';

interface WhisperState {
  transcript: string[];
  isLoading: boolean;
  isModelReady: boolean;
  modelProgress: number;
  error: string | null;
}

interface WorkerResponse {
  type: 'ready' | 'progress' | 'result' | 'error';
  text?: string;
  progress?: number;
  error?: string;
}

/**
 * Hook for local in-browser Whisper transcription using @xenova/transformers.
 * Transcription runs in a Web Worker to prevent UI blocking.
 * 
 * @param audioTrack - Optional MediaStreamTrack for audio (will use default mic if not provided)
 * @returns WhisperState with transcript array and status flags
 */
export function useLocalWhisper(audioTrack?: MediaStreamTrack): WhisperState {
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recordingRef = useRef<boolean>(false);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const silenceTimeoutRef = useRef<number | null>(null);
  
  // VAD settings
  const SILENCE_THRESHOLD = 0.01; // Volume threshold for speech detection
  const SILENCE_DURATION = 1500; // ms of silence before considering speech ended
  const MIN_SPEECH_DURATION = 500; // ms minimum recording to transcribe
  
  // Initialize Web Worker
  useEffect(() => {
    // Create worker from URL (Vite handles the import)
    const workerUrl = new URL('../workers/whisperWorker.ts', import.meta.url);
    workerRef.current = new Worker(workerUrl, { type: 'module' });
    
    workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, text, progress, error: workerError } = event.data;
      
      switch (type) {
        case 'ready':
          console.log('[useLocalWhisper] Model ready');
          setIsModelReady(true);
          setIsLoading(false);
          break;
          
        case 'progress':
          if (progress !== undefined) {
            console.log(`[useLocalWhisper] Loading: ${progress}%`);
            setModelProgress(progress);
          }
          break;
          
        case 'result':
          if (text && text.trim()) {
            console.log('[useLocalWhisper] Transcription:', text);
            setTranscript(prev => [...prev, text.trim()]);
          }
          setIsLoading(false);
          break;
          
        case 'error':
          console.error('[useLocalWhisper] Worker error:', workerError);
          setError(workerError || 'Transcription failed');
          setIsLoading(false);
          break;
      }
    };
    
    workerRef.current.onerror = (event) => {
      console.error('[useLocalWhisper] Worker error:', event);
      setError('Worker failed to load');
    };
    
    // Initialize the model
    setIsLoading(true);
    workerRef.current.postMessage({ type: 'init' });
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);
  
  // Set up audio capture and VAD
  useEffect(() => {
    if (!isModelReady) return;
    
    let isMounted = true;
    
    const setupAudio = async () => {
      try {
        let stream: MediaStream;
        
        if (audioTrack) {
          // Use provided audio track
          stream = new MediaStream([audioTrack]);
        } else {
          // Request microphone access
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            } 
          });
        }
        
        if (!isMounted) return;
        
        // Set up Web Audio API
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
        
        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        sourceRef.current.connect(analyserRef.current);
        
        // Create script processor for audio capture
        const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        analyserRef.current.connect(processor);
        processor.connect(audioContextRef.current.destination);
        
        processor.onaudioprocess = (event) => {
          const inputData = event.inputBuffer.getChannelData(0);
          const volume = getVolume(inputData);
          
          if (volume > SILENCE_THRESHOLD) {
            // Speech detected
            if (!recordingRef.current) {
              console.log('[useLocalWhisper] Speech started');
              recordingRef.current = true;
              audioBufferRef.current = [];
            }
            
            // Store audio data
            audioBufferRef.current.push(new Float32Array(inputData));
            
            // Reset silence timeout
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current);
            }
            
            silenceTimeoutRef.current = window.setTimeout(() => {
              if (recordingRef.current) {
                finishRecording();
              }
            }, SILENCE_DURATION);
          }
        };
        
        console.log('[useLocalWhisper] Audio setup complete');
      } catch (err: any) {
        console.error('[useLocalWhisper] Audio setup failed:', err);
        if (isMounted) {
          setError(err.message || 'Failed to access microphone');
        }
      }
    };
    
    setupAudio();
    
    return () => {
      isMounted = false;
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isModelReady, audioTrack]);
  
  // Calculate RMS volume of audio buffer
  const getVolume = (buffer: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  };
  
  // Finish recording and send to worker for transcription
  const finishRecording = useCallback(() => {
    recordingRef.current = false;
    
    if (audioBufferRef.current.length === 0) return;
    
    // Calculate total length
    const totalLength = audioBufferRef.current.reduce((sum, buf) => sum + buf.length, 0);
    
    // Check minimum duration
    const sampleRate = audioContextRef.current?.sampleRate || 16000;
    const durationMs = (totalLength / sampleRate) * 1000;
    
    if (durationMs < MIN_SPEECH_DURATION) {
      console.log('[useLocalWhisper] Recording too short, skipping');
      audioBufferRef.current = [];
      return;
    }
    
    // Combine all buffers
    const combinedBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const buffer of audioBufferRef.current) {
      combinedBuffer.set(buffer, offset);
      offset += buffer.length;
    }
    
    // Clear buffer
    audioBufferRef.current = [];
    
    console.log(`[useLocalWhisper] Sending ${durationMs.toFixed(0)}ms audio for transcription`);
    setIsLoading(true);
    
    // Send to worker
    workerRef.current?.postMessage({
      type: 'transcribe',
      audio: combinedBuffer,
      sampleRate,
    });
  }, []);
  
  return {
    transcript,
    isLoading,
    isModelReady,
    modelProgress,
    error,
  };
}
