import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      toast.info('Listening...', {
        description: 'Speak now. Recording will stop automatically.',
      });
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
      toast.success('Voice input captured', {
        description: 'Your message has been transcribed.',
      });
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);

      let errorMessage = 'Failed to capture voice input';

      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          errorMessage = 'Microphone permission denied. Please enable microphone access in your browser settings.';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        case 'aborted':
          errorMessage = 'Recording was stopped.';
          break;
      }

      toast.error('Voice input failed', {
        description: errorMessage,
      });

      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript]);

  const toggleRecording = async () => {
    if (!isSupported) {
      toast.error('Voice input not supported', {
        description: 'Your browser does not support voice input. Please try a different browser.',
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        recognitionRef.current?.start();
      } catch (error) {
        console.error('Microphone access error:', error);
        toast.error('Microphone access denied', {
          description: 'Please enable microphone access in your browser settings to use voice input.',
        });
      }
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant={isRecording ? "default" : "outline"}
        size="icon"
        onClick={toggleRecording}
        disabled={disabled}
        className="relative"
      >
        {isRecording ? (
          <>
            <MicOff className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
            </span>
          </>
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {isRecording && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="flex items-center gap-1">
            <div className="h-1 w-1 bg-destructive rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="h-1.5 w-1.5 bg-destructive rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <div className="h-2 w-2 bg-destructive rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
            <div className="h-1.5 w-1.5 bg-destructive rounded-full animate-pulse" style={{ animationDelay: '450ms' }}></div>
            <div className="h-1 w-1 bg-destructive rounded-full animate-pulse" style={{ animationDelay: '600ms' }}></div>
          </div>
        </div>
      )}
    </div>
  );
}
