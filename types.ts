// Extend the Window interface for AudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export interface GenerationState {
  isGenerating: boolean;
  stage: 'idle' | 'generating-audio' | 'generating-visuals' | 'complete' | 'error';
  error: string | null;
  progressMessage: string;
}

export interface GeneratedContent {
  audioUrl: string | null;
  imageUrl: string | null;
  narrationText: string;
  visualPrompt: string;
}

export interface IconProps {
  className?: string;
}