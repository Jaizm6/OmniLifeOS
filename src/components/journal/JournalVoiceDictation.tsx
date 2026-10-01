import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Volume2,
  Sparkles,
  AlertCircle,
  Check,
  RefreshCw,
  Globe,
  Radio,
  CornerDownLeft,
} from 'lucide-react';
import { SoundEngine } from '../../utils/audio';

// Type definitions for Web Speech API
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface ISpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): ISpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    webkitAudioContext?: typeof AudioContext;
  }
}

interface JournalVoiceDictationProps {
  onAppendContent: (text: string) => void;
  onSetTitle?: (title: string) => void;
  currentContent: string;
  soundEngine?: SoundEngine;
  autoStart?: boolean;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'es-ES', label: 'Español' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { code: 'ja-JP', label: '日本語 (Japanese)' },
  { code: 'zh-CN', label: '中文 (Chinese)' },
  { code: 'pt-BR', label: 'Português' },
];

export const JournalVoiceDictation: React.FC<JournalVoiceDictationProps> = ({
  onAppendContent,
  onSetTitle,
  soundEngine,
  autoStart = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [targetField, setTargetField] = useState<'content' | 'title'>('content');
  const [selectedLang, setSelectedLang] = useState(() => {
    const navLang = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
    const match = SUPPORTED_LANGUAGES.find(l => l.code.toLowerCase() === navLang.toLowerCase());
    return match ? match.code : 'en-US';
  });
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [volumeBars, setVolumeBars] = useState<number[]>([15, 20, 15, 25, 15, 30, 20, 15]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [autoPunctuation, setAutoPunctuation] = useState(true);

  // References
  const recognitionRef = useRef<ISpeechRecognitionInstance | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isIntentionallyListeningRef = useRef(false);

  // Check speech recognition support
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsSupported(false);
    }
  }, []);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Convert spoken punctuation commands
  const processSpokenPunctuation = (text: string): string => {
    if (!autoPunctuation) return text;

    let processed = text;
    // Common spoken punctuation patterns
    processed = processed.replace(/\b(period|full stop)\b/gi, '.');
    processed = processed.replace(/\bcomma\b/gi, ',');
    processed = processed.replace(/\bquestion mark\b/gi, '?');
    processed = processed.replace(/\bexclamation mark\b|\bexclamation point\b/gi, '!');
    processed = processed.replace(/\bnew line\b|\bnewline\b/gi, '\n');
    processed = processed.replace(/\bnew paragraph\b/gi, '\n\n');
    processed = processed.replace(/\bcolon\b/gi, ':');
    processed = processed.replace(/\bsemicolon\b/gi, ';');
    processed = processed.replace(/\bopen quote\b|\bopen quotes\b/gi, '"');
    processed = processed.replace(/\bclose quote\b|\bclose quotes\b/gi, '"');

    // Clean up spacing around punctuation
    processed = processed.replace(/\s+([.,!?:;])/g, '$1');
    return processed;
  };

  // Stop audio visualizer and release media stream
  const stopAudioVisualizer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
    setVolumeBars([15, 20, 15, 25, 15, 30, 20, 15]);
  }, []);

  // Start real-time audio visualizer via microphone API
  const startAudioVisualizer = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 255) * 160));
        setAudioLevel(normalized);

        // Generate 8 dynamic visualizer heights
        const bars: number[] = [];
        const step = Math.floor(bufferLength / 8);
        for (let i = 0; i < 8; i++) {
          const val = dataArray[i * step] || 0;
          const height = Math.max(15, Math.min(100, Math.round((val / 255) * 100)));
          bars.push(height);
        }
        setVolumeBars(bars);

        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (err: unknown) {
      console.warn('Microphone audio visualizer error:', err);
    }
  };

  // Commit text to either content or title
  const commitDictatedText = useCallback((rawText: string) => {
    if (!rawText.trim()) return;
    const formatted = processSpokenPunctuation(rawText.trim());

    if (targetField === 'title' && onSetTitle) {
      onSetTitle(formatted);
    } else {
      onAppendContent(formatted);
    }
  }, [targetField, onSetTitle, onAppendContent, autoPunctuation]);

  // Stop dictation
  const stopListening = useCallback(() => {
    isIntentionallyListeningRef.current = false;
    setIsListening(false);
    setInterimText('');

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors if already idle
      }
      recognitionRef.current = null;
    }

    stopAudioVisualizer();
    soundEngine?.playClick?.();
  }, [stopAudioVisualizer, soundEngine]);

  // Start dictation
  const startListening = async () => {
    setErrorMessage(null);

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setErrorMessage(
        'Speech Recognition is not available in your current browser. For the best voice dictation experience, use Google Chrome, Microsoft Edge, or Safari.'
      );
      return;
    }

    try {
      // Request microphone permission and start audio meter
      await startAudioVisualizer();
      soundEngine?.playSuccessChime?.();

      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        isIntentionallyListeningRef.current = true;
        setRecordingSeconds(0);

        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';

          if (result.isFinal) {
            finalChunk += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        if (finalChunk.trim()) {
          commitDictatedText(finalChunk);
        }

        setInterimText(interim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        console.warn('Speech recognition error:', event.error, event.message);

        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser bar.');
          stopListening();
        } else if (event.error === 'no-speech') {
          // Normal pause in speech, keep listening if user intended
          if (isIntentionallyListeningRef.current) {
            return;
          }
        } else if (event.error === 'network') {
          setErrorMessage('Network connection lost during speech recognition.');
        } else {
          setErrorMessage(`Microphone error: ${event.error}.`);
        }
      };

      recognition.onend = () => {
        // If user didn't explicitly press Stop, auto-restart to provide uninterrupted continuous dictation
        if (isIntentionallyListeningRef.current) {
          try {
            recognition.start();
          } catch {
            // If already restarting or errored, reset
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: unknown) {
      console.error('Failed to start speech recognition:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to access microphone. Please ensure microphone permissions are allowed.'
      );
      stopListening();
    }
  };

  // Auto-start if prop specified
  useEffect(() => {
    if (autoStart && isSupported && !isListening) {
      startListening();
    }
    return () => {
      stopListening();
    };
  }, [autoStart]);

  // Handle language change while listening
  const handleLanguageChange = (newLang: string) => {
    setSelectedLang(newLang);
    if (isListening) {
      stopListening();
      setTimeout(() => {
        startListening();
      }, 200);
    }
  };

  // Helper to insert quick punctuation
  const handleInsertPunctuation = (symbol: string) => {
    onAppendContent(symbol + ' ');
    soundEngine?.playClick?.();
  };

  return (
    <div className="w-full rounded-2xl bg-linear-to-r from-indigo-50/90 via-purple-50/80 to-amber-50/70 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-amber-950/20 border border-indigo-200/80 dark:border-indigo-900/50 p-3.5 space-y-3 transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              isListening
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse'
                : 'bg-indigo-600 text-white shadow-xs'
            }`}
          >
            {isListening ? <Radio className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>Voice-to-Text Dictation</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  Microphone API
                </span>
              </span>
              {isListening && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Recording {formatTime(recordingSeconds)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Speak freely — your voice is transcribed live into your journal entry.
            </p>
          </div>
        </div>

        {/* Dictation Action Buttons */}
        <div className="flex items-center gap-1.5">
          {!isListening ? (
            <button
              type="button"
              onClick={startListening}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition active:scale-95 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Start Dictating</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopListening}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Recording</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Waveform / Audio Visualizer Bar when listening */}
      {isListening && (
        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-indigo-500 animate-pulse shrink-0" />
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Audio Waveform:
            </span>
          </div>

          {/* Equalizer Frequency Bars */}
          <div className="flex items-center gap-1.5 h-6 flex-1 max-w-[200px] justify-center">
            {volumeBars.map((height, idx) => (
              <span
                key={idx}
                className="w-1.5 rounded-full bg-linear-to-t from-indigo-500 via-purple-500 to-rose-500 transition-all duration-75"
                style={{
                  height: `${height}%`,
                  minHeight: '4px',
                  opacity: Math.max(0.3, height / 100),
                }}
              />
            ))}
          </div>

          <div className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
            {audioLevel > 15 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Voice Detected</span>
            ) : (
              <span>Listening...</span>
            )}
          </div>
        </div>
      )}

      {/* Live Interim Speech Preview */}
      {interimText && (
        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 shadow-xs flex items-start gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-semibold text-purple-600 dark:text-purple-400 mr-1.5">
              Transcribing:
            </span>
            <span className="text-slate-700 dark:text-slate-300 italic font-medium">
              "{interimText}"
            </span>
          </div>
        </div>
      )}

      {/* Error Message notice if mic permission denied or unsupported */}
      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
            <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90 mt-0.5">
              Tip: Allow microphone permissions in browser site settings and ensure your microphone is plugged in.
            </p>
          </div>
        </div>
      )}

      {/* Configuration & Quick Tools Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-indigo-100 dark:border-indigo-900/40 text-xs">
        {/* Target Destination: Reflection Content vs Entry Title */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Dictate to:
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setTargetField('content')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
                targetField === 'content'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
              }`}
            >
              Reflection Body
            </button>
            {onSetTitle && (
              <button
                type="button"
                onClick={() => setTargetField('title')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition ${
                  targetField === 'title'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                }`}
              >
                Entry Title
              </button>
            )}
          </div>
        </div>

        {/* Language selector & Auto-punctuation */}
        <div className="flex items-center gap-2">
          {/* Language selector */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <Globe className="w-3 h-3 text-slate-400" />
            <select
              value={selectedLang}
              onChange={e => handleLanguageChange(e.target.value)}
              className="bg-transparent text-[11px] font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map(l => (
                <option key={l.code} value={l.code} className="text-slate-800 bg-white dark:bg-slate-800">
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Auto punctuation toggle */}
          <label className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoPunctuation}
              onChange={e => setAutoPunctuation(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-600 rounded"
            />
            <span>Spoken Punctuation</span>
          </label>
        </div>
      </div>

      {/* Spoken Punctuation / Quick Punctuation Insertion Pills */}
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        <span className="text-[10px] font-semibold text-slate-400">Quick Punctuation:</span>
        {[
          { label: 'Period .', symbol: '.' },
          { label: 'Comma ,', symbol: ',' },
          { label: 'Question ?', symbol: '?' },
          { label: 'Exclamation !', symbol: '!' },
          { label: '↵ New Line', symbol: '\n' },
          { label: 'Bullet -', symbol: '\n- ' },
        ].map(item => (
          <button
            key={item.label}
            type="button"
            onClick={() => handleInsertPunctuation(item.symbol)}
            className="px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
