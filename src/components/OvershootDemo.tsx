import { useRef, useEffect, useCallback } from 'react';
import { useSession } from '../contexts/SessionContext';

/**
 * Silent comprehension monitor using Gemini API.
 * Runs in background every 10 seconds - NO UI rendered.
 * Logs results to session context for post-call notes.
 */
export function OvershootDemo() {
  const intervalRef = useRef<number | null>(null);
  const isAnalyzingRef = useRef(false);
  const session = useSession();

  const analyzeComprehension = useCallback(async () => {
    if (isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;
    
    try {
      const response = await fetch('/api/analyze-comprehension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observation: 'attentive, nodding' }),
      });
      
      const data = await response.json();
      
      // Log to session context silently
      session.addConfusionEvent({
        state: data.state,
        visualEvidence: data.evidence || 'attentive, nodding',
        confidence: data.confidence || 'MEDIUM',
      });
      
      console.log('[Comprehension] State:', data.state, '| Confidence:', data.confidence);
    } catch (err) {
      console.error('[Comprehension] Analysis failed:', err);
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [session]);

  // Auto-start on mount, run every 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      analyzeComprehension();
      intervalRef.current = window.setInterval(analyzeComprehension, 10000);
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [analyzeComprehension]);

  // No UI - runs silently in background
  return null;
}
