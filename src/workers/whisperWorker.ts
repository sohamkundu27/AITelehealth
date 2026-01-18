/**
 * Web Worker for running Whisper transcription using @xenova/transformers
 * This runs heavy ML inference off the main thread to prevent UI blocking.
 */

import { pipeline, type Pipeline } from '@xenova/transformers';

// Message types for worker communication
interface WorkerMessage {
  type: 'init' | 'transcribe';
  audio?: Float32Array;
  sampleRate?: number;
}

interface WorkerResponse {
  type: 'ready' | 'progress' | 'result' | 'error';
  text?: string;
  progress?: number;
  error?: string;
}

let transcriber: Pipeline | null = null;
let isInitializing = false;

// Post message helper with type safety
const postResponse = (response: WorkerResponse) => {
  self.postMessage(response);
};

// Initialize the Whisper model
async function initializeModel() {
  if (transcriber || isInitializing) return;
  
  isInitializing = true;
  
  try {
    console.log('[WhisperWorker] Loading Whisper model...');
    
    // Use whisper-tiny.en for faster loading (~40MB)
    // Alternative: Xenova/whisper-small.en for better accuracy (~150MB)
    transcriber = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny.en',
      {
        progress_callback: (progress: { progress?: number; status?: string }) => {
          if (progress.progress !== undefined) {
            postResponse({ 
              type: 'progress', 
              progress: Math.round(progress.progress) 
            });
          }
        },
      }
    );
    
    console.log('[WhisperWorker] Model loaded successfully');
    postResponse({ type: 'ready' });
  } catch (error: any) {
    console.error('[WhisperWorker] Failed to load model:', error);
    postResponse({ type: 'error', error: error.message || 'Failed to load model' });
  } finally {
    isInitializing = false;
  }
}

// Transcribe audio using the loaded model
async function transcribeAudio(audio: Float32Array, sampleRate: number) {
  if (!transcriber) {
    postResponse({ type: 'error', error: 'Model not initialized' });
    return;
  }
  
  try {
    // Whisper expects 16kHz audio, resample if needed
    let audioData = audio;
    if (sampleRate !== 16000) {
      audioData = resampleAudio(audio, sampleRate, 16000);
    }
    
    console.log('[WhisperWorker] Transcribing audio chunk...');
    
    const result = await transcriber(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: 'english',
      task: 'transcribe',
    });
    
    // Extract text from result
    const text = Array.isArray(result) 
      ? result.map((r: any) => r.text).join(' ')
      : (result as any).text || '';
    
    console.log('[WhisperWorker] Transcription:', text);
    postResponse({ type: 'result', text: text.trim() });
  } catch (error: any) {
    console.error('[WhisperWorker] Transcription error:', error);
    postResponse({ type: 'error', error: error.message || 'Transcription failed' });
  }
}

// Simple linear resampling
function resampleAudio(audio: Float32Array, fromRate: number, toRate: number): Float32Array {
  const ratio = fromRate / toRate;
  const newLength = Math.round(audio.length / ratio);
  const resampled = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, audio.length - 1);
    const t = srcIndex - srcIndexFloor;
    
    resampled[i] = audio[srcIndexFloor] * (1 - t) + audio[srcIndexCeil] * t;
  }
  
  return resampled;
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, audio, sampleRate } = event.data;
  
  switch (type) {
    case 'init':
      await initializeModel();
      break;
      
    case 'transcribe':
      if (audio && sampleRate) {
        await transcribeAudio(audio, sampleRate);
      } else {
        postResponse({ type: 'error', error: 'Missing audio data' });
      }
      break;
      
    default:
      postResponse({ type: 'error', error: `Unknown message type: ${type}` });
  }
};

// Signal that worker is ready
console.log('[WhisperWorker] Worker initialized');
