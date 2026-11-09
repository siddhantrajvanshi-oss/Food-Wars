import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  X,
  Radio,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { Recipe } from '../types';
import { safeFetchJson } from '../utils/api';

interface LiveVoiceAssistantProps {
  recipe: Recipe;
  isOpen: boolean;
  onClose: () => void;
}

type ConnectionState = 'Connecting' | 'Listening' | 'Speaking' | 'Idle';

export const LiveVoiceAssistant: React.FC<LiveVoiceAssistantProps> = ({
  recipe,
  isOpen,
  onClose,
}) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('Connecting');
  const [isMicActive, setIsMicActive] = useState<boolean>(true);
  const [transcript, setTranscript] = useState<string>('');
  const [mentorSpokenText, setMentorSpokenText] = useState<string>(
    `Hello chef! I'm your hands-free culinary mentor for ${recipe.dishName}. Keep your hands on the utensils—ask me anything as you cook!`
  );
  const [audioLevel, setAudioLevel] = useState<number>(30);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Speech Synthesis and Recognition / WebSocket
  useEffect(() => {
    if (!isOpen) return;

    setConnectionState('Connecting');
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    // Connect WebSocket
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('Listening');
        speakText(
          `Stove mentor active for ${recipe.dishName}. How is your heat level looking right now?`
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'text_response' && data.text) {
            setMentorSpokenText(data.text);
            setConnectionState('Speaking');
            speakText(data.text);
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onerror = () => {
        // Fallback to local browser Web Speech
        setConnectionState('Listening');
      };
    } catch (err) {
      console.warn('WebSocket init note:', err);
      setConnectionState('Listening');
    }

    // Initialize Web Speech Recognition if available in browser
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);

          // If speech is final, query the mentor
          if (event.results[event.results.length - 1].isFinal) {
            handleUserSpokenQuery(currentTranscript);
          }
        };

        recognition.onerror = (e: any) => {
          if (e.error !== 'no-speech') {
            console.warn('Speech recognition notice:', e.error);
          }
        };

        recognition.onend = () => {
          if (isMicActive && isOpen) {
            try {
              recognition.start();
            } catch (e) {
              // Ignore already started error
            }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('Could not start recognition:', e);
      }
    }

    // Visualizer simulation loop
    const updateVisualizer = () => {
      setAudioLevel(Math.floor(Math.random() * 40) + 20);
      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    };
    animationFrameRef.current = requestAnimationFrame(updateVisualizer);

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (recognitionRef.current) recognitionRef.current.abort();
      if (synthRef.current) synthRef.current.cancel();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isOpen, recipe.dishName]);

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    try {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onstart = () => setConnectionState('Speaking');
      utterance.onend = () => setConnectionState('Listening');
      synthRef.current.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      setConnectionState('Listening');
    }
  };

  const handleUserSpokenQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setConnectionState('Connecting');

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            text: queryText,
            dishContext: `${recipe.dishName} (${recipe.culturalOrigin})`,
          })
        );
      } else {
        // Fallback to REST endpoint
        const data = await safeFetchJson<{ advice: string }>('/api/troubleshoot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dishName: recipe.dishName,
            question: queryText,
          }),
        });
        const mentorAnswer = data.advice || 'Keep stirring steadily and adjust your heat.';
        setMentorSpokenText(mentorAnswer);
        setConnectionState('Speaking');
        speakText(mentorAnswer);
      }
    } catch (e) {
      console.error(e);
      setMentorSpokenText('Lower your heat a notch and taste for seasoning. Keep going!');
      speakText('Lower your heat a notch and taste for seasoning. Keep going!');
    }
  };

  const toggleMic = () => {
    if (isMicActive) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsMicActive(false);
      setConnectionState('Idle');
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // ignore
        }
      }
      setIsMicActive(true);
      setConnectionState('Listening');
    }
  };

  const triggerPresetPrompt = (prompt: string) => {
    setTranscript(prompt);
    handleUserSpokenQuery(prompt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="card-shell w-full max-w-2xl bg-white p-6 md:p-8 space-y-6 shadow-2xl border-2 border-[#2F5D50]/20 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-[#E2DBD0] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#E7EFEA] flex items-center justify-center text-[#2F5D50]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#1C2B24]">
                Hands-Free Live Kitchen Mentor
              </h3>
              <p className="text-xs text-[#4C6055]">
                Real-time voice assistance for {recipe.dishName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#4C6055] hover:text-[#1C2B24] hover:bg-[#F5F1E8] transition-colors cursor-pointer"
            aria-label="Close live mentor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mandatory Reassurance Callout */}
        <div className="p-3 rounded-lg bg-[#E7EFEA] border border-[#CFE2D7] flex items-center gap-2.5 text-xs text-[#2F5D50] font-medium">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <span>
            Zero penalty guarantee: Asking questions or requesting mid-cook adjustments will{' '}
            <strong className="underline">never</strong> reduce your challenge score.
          </span>
        </div>

        {/* Live Status Indicator */}
        <div className="flex flex-col items-center justify-center py-6 space-y-4 bg-[#FAF8F3] rounded-xl border border-[#E2DBD0]">
          {/* Animated Pulsing Rings */}
          <div className="relative flex items-center justify-center">
            <div
              className={`absolute w-32 h-32 rounded-full transition-all duration-300 ${
                connectionState === 'Speaking'
                  ? 'bg-[#2F5D50]/20 animate-ping'
                  : connectionState === 'Listening'
                  ? 'bg-[#C97B4A]/20 animate-pulse'
                  : 'bg-stone-200'
              }`}
            />
            <div
              className={`absolute w-24 h-24 rounded-full transition-all duration-300 ${
                connectionState === 'Speaking'
                  ? 'bg-[#2F5D50]/30'
                  : connectionState === 'Listening'
                  ? 'bg-[#C97B4A]/30'
                  : 'bg-stone-100'
              }`}
            />
            <div
              className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-md transition-colors ${
                connectionState === 'Speaking'
                  ? 'bg-[#2F5D50] text-white'
                  : connectionState === 'Listening'
                  ? 'bg-[#C97B4A] text-white'
                  : 'bg-stone-300 text-stone-600'
              }`}
            >
              {connectionState === 'Speaking' ? (
                <Volume2 className="w-8 h-8 animate-bounce" />
              ) : isMicActive ? (
                <Mic className="w-8 h-8" />
              ) : (
                <MicOff className="w-8 h-8" />
              )}
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="text-center space-y-1">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                connectionState === 'Speaking'
                  ? 'bg-[#2F5D50] text-white'
                  : connectionState === 'Listening'
                  ? 'bg-[#C97B4A] text-white'
                  : connectionState === 'Connecting'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-stone-200 text-stone-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              Status: {connectionState}
            </span>
            <p className="text-xs text-[#4C6055]">
              {connectionState === 'Listening' && 'Speak naturally — the mentor is listening to your stove.'}
              {connectionState === 'Speaking' && 'Mentor is giving culinary advice...'}
              {connectionState === 'Connecting' && 'Synchronizing audio stream with kitchen assistant...'}
              {connectionState === 'Idle' && 'Microphone paused. Click unmute below.'}
            </p>
          </div>
        </div>

        {/* Spoken Response & Transcript Display */}
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-white border border-[#E2DBD0] shadow-inner space-y-2">
            <div className="text-[11px] uppercase font-bold tracking-wider text-[#2F5D50] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Mentor Spoken Response:
            </div>
            <p className="text-sm text-[#1C2B24] font-medium leading-relaxed italic">
              &ldquo;{mentorSpokenText}&rdquo;
            </p>
          </div>

          {transcript && (
            <div className="text-xs text-[#4C6055] px-2 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#C97B4A]" />
              <span>
                Heard: <strong className="text-[#1C2B24]">&ldquo;{transcript}&rdquo;</strong>
              </span>
            </div>
          )}
        </div>

        {/* Quick Voice Prompt Buttons for Quick Hands-Free Testing */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#4C6055]">
            Quick Stove Asks:
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              'My pan is smoking, what should I do?',
              'How do I know the onions are soft enough?',
              'Can I substitute vegetable oil for butter?',
              'Should I add more salt right now?',
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => triggerPresetPrompt(preset)}
                className="text-xs bg-[#FAF8F3] hover:bg-[#F5F1E8] text-[#1C2B24] border border-[#E2DBD0] rounded-md px-2.5 py-1.5 transition-colors cursor-pointer text-left"
              >
                &ldquo;{preset}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Controls Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E2DBD0]">
          <button
            type="button"
            onClick={toggleMic}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors ${
              isMicActive
                ? 'bg-[#FAF8F3] text-[#1C2B24] border border-[#D9CFBE] hover:bg-[#ECE5D8]'
                : 'bg-[#2F5D50] text-white hover:bg-[#24493e]'
            }`}
          >
            {isMicActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isMicActive ? 'Pause Mic' : 'Resume Mic'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="btn-primary py-2 px-5 text-sm cursor-pointer"
          >
            Return to Recipe Checklist
          </button>
        </div>
      </div>
    </div>
  );
};
