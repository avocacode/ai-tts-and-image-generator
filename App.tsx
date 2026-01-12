import React, { useState, useRef } from 'react';
import { generateNarration, generateImage } from './services/geminiService';
import { GeneratedContent, GenerationState, GenerationMode } from './types';
import { PlayIcon, PauseIcon, VideoIcon, SparklesIcon, DownloadIcon, PhotoIcon } from './components/Icons';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [narrationInput, setNarrationInput] = useState('');
  const [visualPromptInput, setVisualPromptInput] = useState('');
  const [speakingRate, setSpeakingRate] = useState(1.0);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('both');

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

  React.useEffect(() => {
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setShowKeyInput(true);
    }
  }, []);

  const saveApiKey = (key: string) => {
    localStorage.setItem('GEMINI_API_KEY', key);
    setApiKey(key);
    setShowKeyInput(false);
  };

  const removeApiKey = () => {
    localStorage.removeItem('GEMINI_API_KEY');
    setApiKey('');
    setShowKeyInput(true);
  };

  const handleGenerate = async () => {
    // Basic validation
    if (!apiKey) {
      setShowKeyInput(true);
      return;
    }

    const needsNarration = generationMode === 'both' || generationMode === 'narration';
    const needsImage = generationMode === 'both' || generationMode === 'image';

    if (needsNarration && !narrationInput.trim()) {
      setGenerationState({
        isGenerating: false,
        stage: 'error',
        error: "Please provide narration text.",
        progressMessage: ''
      });
      return;
    }

    if (needsImage && !visualPromptInput.trim()) {
      setGenerationState({
        isGenerating: false,
        stage: 'error',
        error: "Please provide a visual description.",
        progressMessage: ''
      });
      return;
    }

    setGenerationState({
      isGenerating: true,
      stage: needsNarration ? 'generating-audio' : 'generating-visuals',
      error: null,
      progressMessage: needsNarration ? 'Generating Voiceover (TTS)...' : 'Generating Visuals...'
    });

    try {
      let audioUrl = null;
      let imageUrl = null;

      // 1. Generate Audio if needed
      if (needsNarration) {
        audioUrl = await generateNarration(narrationInput, apiKey, speakingRate, selectedVoice);

        if (needsImage) {
          setGenerationState(prev => ({
            ...prev,
            stage: 'generating-visuals',
            progressMessage: 'Generating 16:9 Visuals with Gemini Flash...'
          }));
        }
      }

      // 2. Generate Image if needed
      if (needsImage) {
        imageUrl = await generateImage(visualPromptInput, apiKey);
      }

      // 3. Complete
      setResult({
        audioUrl,
        imageUrl,
        narrationText: narrationInput,
        visualPrompt: visualPromptInput,
        mode: generationMode
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
    <div className="min-h-screen bg-gray-950 text-gray-100 selection:bg-pink-500 selection:text-white pb-20 relative">

      {/* API Key Modal */}
      {showKeyInput && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-white">Setup API Key</h2>
            <p className="text-gray-400 mb-6">
              To use this free tool, please provide your own Google Gemini API Key.
              It will be stored locally in your browser.
            </p>
            <input
              type="password"
              placeholder="Paste Gemini API Key here..."
              className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white mb-4 focus:outline-none focus:border-pink-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveApiKey((e.target as HTMLInputElement).value);
                }
              }}
              onChange={(e) => {
                // Optional: could validate format on change
              }}
              autoFocus
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                saveApiKey(input.value);
              }}
              className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              Save & Continue
            </button>
            <div className="mt-4 text-center">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-sm text-pink-400 hover:text-pink-300 underline">
                Get a free API Key here
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-gray-950/80 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-pink-500 to-rose-500 p-2 rounded-lg">
              <VideoIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-rose-400">
              FactVideo<span className="text-white font-light">Creator</span> <span className="text-xs text-gray-500 border border-gray-700 px-2 py-0.5 rounded ml-2">BYOK</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {apiKey ? (
              <button onClick={removeApiKey} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                Change API Key
              </button>
            ) : null}
            <div className="flex items-center gap-2">
              <span className={`flex h-2 w-2 relative`}>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${apiKey ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </span>
              <span className={`text-xs font-mono hidden sm:block ${apiKey ? 'text-green-400' : 'text-red-400'}`}>
                {apiKey ? 'Generic Ready' : 'NO KEY'}
              </span>
            </div>
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
          </p>
        </section>

        {/* Mode Selection */}
        <section className="flex justify-center">
          <div className="bg-gray-900/50 p-1 rounded-xl border border-white/5 flex gap-1">
            <button
              onClick={() => setGenerationMode('both')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${generationMode === 'both' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Both
            </button>
            <button
              onClick={() => setGenerationMode('narration')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${generationMode === 'narration' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Narration Only
            </button>
            <button
              onClick={() => setGenerationMode('image')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${generationMode === 'image' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Image Only
            </button>
          </div>
        </section>

        {/* Input Form */}
        {!result && (
          <div className={`space-y-8 transition-opacity duration-500 ${generationState.isGenerating ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>

            {/* Step 1: Narration */}
            {(generationMode === 'both' || generationMode === 'narration') && (
              <div className="bg-gray-900/50 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden group animate-fade-in">
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4">
                  <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider whitespace-nowrap">Speed: {speakingRate}x</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={speakingRate}
                      onChange={(e) => setSpeakingRate(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500">{narrationInput.length} chars</p>
                </div>

                {/* Voice Selection */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                  {(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'] as const).map((voice) => (
                    <button
                      key={voice}
                      onClick={() => setSelectedVoice(voice)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${selectedVoice === voice
                          ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                          : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/20 hover:text-white'
                        }`}
                    >
                      {voice}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Visuals */}
            {(generationMode === 'both' || generationMode === 'image') && (
              <div className="bg-gray-900/50 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden group animate-fade-in">
                <div className="absolute top-0 left-0 w-1 h-full bg-pink-500 group-hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-shadow"></div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 text-xs">{generationMode === 'both' ? '2' : '1'}</span>
                  Image Visual Prompt
                </h3>
                <textarea
                  value={visualPromptInput}
                  onChange={(e) => setVisualPromptInput(e.target.value)}
                  placeholder="Describe the image scene (e.g., 'A cinematic underwater shot of a majestic octopus with three glowing hearts visible, photorealistic, 8k resolution')"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 min-h-[100px] resize-none"
                />
              </div>
            )}

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

              {/* Horizontal 16:9 Player / Image Display */}
              {result.imageUrl ? (
                <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg mx-auto mb-8 border border-white/5">
                  <img
                    src={result.imageUrl}
                    className={`w-full h-full object-cover transition-transform duration-[40s] ease-linear ${isPlaying ? 'scale-125' : 'scale-100'}`}
                    alt="Generated visual"
                  />

                  {/* Overlay Controls for Audio */}
                  {result.audioUrl && (
                    <div className="absolute inset-0 bg-black/20 hover:bg-black/10 transition-colors flex items-center justify-center group cursor-pointer" onClick={togglePlay}>
                      <div className="bg-white/10 backdrop-blur-md p-6 rounded-full group-hover:scale-110 transition-transform shadow-2xl">
                        {isPlaying ? <PauseIcon className="w-10 h-10 text-white" /> : <PlayIcon className="w-10 h-10 text-white ml-1" />}
                      </div>
                    </div>
                  )}
                </div>
              ) : result.audioUrl ? (
                <div className="w-full aspect-video bg-gray-800 rounded-xl flex flex-col items-center justify-center gap-6 mb-8 border border-white/5 bg-gradient-to-br from-gray-800 to-gray-900">
                  <div className="bg-purple-500/20 p-8 rounded-full">
                    <VideoIcon className="w-16 h-16 text-purple-400" />
                  </div>
                  <button
                    onClick={togglePlay}
                    className="flex items-center gap-3 bg-white text-gray-900 px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-colors"
                  >
                    {isPlaying ? <><PauseIcon className="w-5 h-5" /> Pause Audio</> : <><PlayIcon className="w-5 h-5" /> Play Audio</>}
                  </button>
                </div>
              ) : null}

              {/* Controls & Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {result.narrationText && (
                    <div>
                      <h3 className="text-purple-400 text-sm font-bold uppercase tracking-wider mb-2">Narration Script</h3>
                      <div className="p-4 bg-gray-800/50 rounded-xl border border-white/5 text-gray-300 italic leading-relaxed h-[150px] overflow-y-auto custom-scrollbar">
                        "{result.narrationText}"
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6 flex flex-col justify-between">
                  {result.visualPrompt && (
                    <div>
                      <h3 className="text-pink-400 text-sm font-bold uppercase tracking-wider mb-2">Visual Prompt</h3>
                      <div className="p-4 bg-gray-800/50 rounded-xl border border-white/5 text-gray-400 text-sm">
                        {result.visualPrompt}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    {/* Download Helper */}
                    <div className="flex gap-2">
                      {result.imageUrl && (
                        <a
                          href={result.imageUrl}
                          download="generated-image.png"
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors"
                        >
                          <PhotoIcon className="w-4 h-4" /> Save Image
                        </a>
                      )}

                      {result.audioUrl && (
                        <a
                          href={result.audioUrl}
                          download="generated-audio.wav"
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors"
                        >
                          <DownloadIcon className="w-4 h-4" /> Save Audio
                        </a>
                      )}
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