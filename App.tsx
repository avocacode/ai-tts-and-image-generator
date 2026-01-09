import React, { useState, useRef } from 'react';
import { generateNarration, generateImage } from './services/geminiService';
import { GeneratedContent, GenerationState } from './types';
import { PlayIcon, PauseIcon, VideoIcon, SparklesIcon, DownloadIcon, PhotoIcon } from './components/Icons';

const App: React.FC = () => {
  const [narrationInput, setNarrationInput] = useState('');
  const [visualPromptInput, setVisualPromptInput] = useState('');
  
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    stage: 'idle',
    error: null,
    progressMessage: '',
  });

  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Refs for media elements
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleGenerate = async () => {
    // Basic validation
    if (!narrationInput.trim() || !visualPromptInput.trim()) {
      setGenerationState({
        isGenerating: false,
        stage: 'error',
        error: "Please provide both narration text and a visual description.",
        progressMessage: ''
      });
      return;
    }

    setGenerationState({
      isGenerating: true,
      stage: 'generating-audio',
      error: null,
      progressMessage: 'Generating Voiceover (TTS)...'
    });

    try {
      // 1. Generate Audio
      const audioUrl = await generateNarration(narrationInput);

      setGenerationState(prev => ({
        ...prev,
        stage: 'generating-visuals',
        progressMessage: 'Generating 16:9 Visuals with Gemini Flash...'
      }));

      // 2. Generate Image (Horizontal)
      const imageUrl = await generateImage(visualPromptInput);

      // 3. Complete
      setResult({
        audioUrl,
        imageUrl,
        narrationText: narrationInput,
        visualPrompt: visualPromptInput
      });

      setGenerationState({
        isGenerating: false,
        stage: 'complete',
        error: null,
        progressMessage: 'Generation Complete!'
      });

    } catch (error: any) {
      console.error("Generation failed:", error);
      let errorMessage = "An unexpected error occurred.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setGenerationState({
        isGenerating: false,
        stage: 'error',
        error: errorMessage,
        progressMessage: ''
      });
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // Reset to start if finished
        if (audioRef.current.ended) {
            audioRef.current.currentTime = 0;
        }
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const reset = () => {
    setResult(null);
    setGenerationState({
        isGenerating: false,
        stage: 'idle',
        error: null,
        progressMessage: ''
    });
    setNarrationInput('');
    setVisualPromptInput('');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 selection:bg-pink-500 selection:text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-gray-950/80 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="bg-gradient-to-tr from-pink-500 to-rose-500 p-2 rounded-lg">
                    <VideoIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-rose-400">
                    FactVideo<span className="text-white font-light">Creator</span> <span className="text-xs text-gray-500 border border-gray-700 px-2 py-0.5 rounded ml-2">FREE TIER</span>
                </h1>
            </div>
            
            <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs text-green-400 font-mono hidden sm:block">READY</span>
            </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-12">
        
        {/* Intro / Prompt */}
        <section className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                YouTube Fact Videos (16:9)
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                Create engaging, narrated fact videos instantly using Gemini Flash for high-quality images and Gemini TTS for voiceovers. 
                <span className="block text-pink-400 mt-1 font-semibold">Completely Free & Fast.</span>
            </p>
        </section>

        {/* Input Form */}
        {!result && (
        <div className={`space-y-8 transition-opacity duration-500 ${generationState.isGenerating ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            
            {/* Step 1: Narration */}
            <div className="bg-gray-900/50 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-shadow"></div>
                 <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs">1</span>
                    Narration Script
                 </h3>
                 <textarea 
                    value={narrationInput}
                    onChange={(e) => setNarrationInput(e.target.value)}
                    placeholder="Enter the fact or story (e.g., 'Did you know that octopuses have three hearts? Two pump blood to the gills, while the third pumps it to the rest of the body...')"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[120px] resize-none"
                 />
                 <p className="text-right text-xs text-gray-500 mt-2">{narrationInput.length} chars</p>
            </div>

            {/* Step 2: Visuals */}
            <div className="bg-gray-900/50 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-pink-500 group-hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-shadow"></div>
                 <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 text-xs">2</span>
                    Image Visual Prompt
                 </h3>
                 <textarea 
                    value={visualPromptInput}
                    onChange={(e) => setVisualPromptInput(e.target.value)}
                    placeholder="Describe the image scene (e.g., 'A cinematic underwater shot of a majestic octopus with three glowing hearts visible, photorealistic, 8k resolution')"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 min-h-[100px] resize-none"
                 />
            </div>
            
            {/* Error Message */}
            {generationState.error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center">
                    {generationState.error}
                </div>
            )}

            {/* Action Button */}
            <div className="flex justify-center pt-4">
                <button 
                    onClick={handleGenerate}
                    disabled={generationState.isGenerating}
                    className="group relative inline-flex items-center justify-center px-8 py-4 font-semibold text-white transition-all duration-200 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full hover:from-purple-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-600 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto shadow-lg shadow-pink-500/20"
                >
                    {generationState.isGenerating ? (
                        <div className="flex items-center gap-3">
                             <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>{generationState.progressMessage}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5" />
                            <span>Generate Content</span>
                        </div>
                    )}
                </button>
            </div>
        </div>
        )}

        {/* Results Section */}
        {result && (
            <div className="animate-fade-in space-y-8">
                <div className="bg-gray-900 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden">
                    
                    {/* Horizontal 16:9 Player */}
                    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg mx-auto mb-8 border border-white/5">
                         {result.imageUrl ? (
                             <img 
                                src={result.imageUrl}
                                className={`w-full h-full object-cover transition-transform duration-[40s] ease-linear ${isPlaying ? 'scale-125' : 'scale-100'}`}
                                alt="Generated visual"
                             />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">Generation Failed</div>
                         )}

                         {/* Overlay Controls */}
                         <div className="absolute inset-0 bg-black/20 hover:bg-black/10 transition-colors flex items-center justify-center group cursor-pointer" onClick={togglePlay}>
                            <div className="bg-white/10 backdrop-blur-md p-6 rounded-full group-hover:scale-110 transition-transform shadow-2xl">
                                {isPlaying ? <PauseIcon className="w-10 h-10 text-white" /> : <PlayIcon className="w-10 h-10 text-white ml-1" />}
                            </div>
                         </div>
                    </div>

                    {/* Controls & Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                             <div>
                                <h3 className="text-purple-400 text-sm font-bold uppercase tracking-wider mb-2">Narration Script</h3>
                                <div className="p-4 bg-gray-800/50 rounded-xl border border-white/5 text-gray-300 italic leading-relaxed h-[150px] overflow-y-auto custom-scrollbar">
                                    "{result.narrationText}"
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 flex flex-col justify-between">
                             <div>
                                <h3 className="text-pink-400 text-sm font-bold uppercase tracking-wider mb-2">Visual Prompt</h3>
                                <div className="p-4 bg-gray-800/50 rounded-xl border border-white/5 text-gray-400 text-sm">
                                    {result.visualPrompt}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                {/* Download Helper */}
                                <div className="flex gap-2">
                                     <a 
                                        href={result.imageUrl || '#'} 
                                        download="generated-image.png"
                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors"
                                    >
                                        <PhotoIcon className="w-4 h-4" /> Save Image
                                    </a>
                                    
                                    <a 
                                        href={result.audioUrl || '#'} 
                                        download="generated-audio.wav"
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors ${!result.audioUrl ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        <DownloadIcon className="w-4 h-4" /> Save Audio
                                    </a>
                                </div>
                                <button 
                                    onClick={reset}
                                    className="w-full py-3 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white transition-colors text-sm"
                                >
                                    Create Another Video
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Hidden Audio Player */}
                    {result.audioUrl && (
                        <audio 
                            ref={audioRef} 
                            src={result.audioUrl} 
                            onEnded={handleAudioEnded}
                        />
                    )}
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;