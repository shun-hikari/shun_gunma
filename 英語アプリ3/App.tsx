
import React, { useState, useCallback, useEffect } from 'react';
import { LessonContent, ViewMode, LessonTopic, LessonCategory } from './types';
import { CATEGORIZED_LESSONS } from './constants';
import { generateLessonContent } from './services/geminiService';
import LessonSelector from './components/LessonSelector';
import ContentView from './components/ContentView';
import { MenuIcon } from './components/icons';

/**
 * Splits text into smaller, manageable chunks for the Web Speech API.
 * This prevents errors caused by text being too long for the browser's speech engine.
 * @param text The text to split.
 * @returns An array of strings, where each string is a chunk.
 */
const chunkText = (text: string): string[] => {
    if (!text) return [];
    // This regex splits text into sentences or lines, which is safer for speech synthesis.
    const chunks = text.match(/[^.!?]+(?:[.!?]+["']?|\n|$)|\S+/g) || [];
    return chunks.map(c => c.trim()).filter(c => c.length > 0);
};


const getBestEnglishVoices = (availableVoices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] => {
    const englishVoices = availableVoices.filter(v => v.lang.startsWith('en-'));
    if (englishVoices.length === 0) return [];

    const qualityTiers: { [key: string]: number } = {
        // Tier 1: Often network-based, highest quality
        'google': 10,
        'siri': 10,
        'microsoft david': 9,
        'microsoft zira': 9,
        'microsoft mark': 9,
        'natural': 8,
        'aria': 8,

        // Tier 2: High-quality local voices
        'alex': 7,
        'daniel': 6,
        'samantha': 5,

        // Tier 3: Default/generic
        'english': 1,
    };

    const scoredVoices = englishVoices.map(voice => {
        const name = voice.name.toLowerCase();
        const networkBonus = voice.localService === false ? 15 : 0;
        
        let qualityScore = 0;
        for (const [key, score] of Object.entries(qualityTiers)) {
            if (name.includes(key)) {
                qualityScore = score;
                break;
            }
        }
        
        const finalScore = networkBonus + qualityScore;
        return { voice, score: finalScore };
    });

    scoredVoices.sort((a, b) => b.score - a.score);
    
    return scoredVoices.map(item => item.voice);
};


const App: React.FC = () => {
  const [selectedLesson, setSelectedLesson] = useState<{ index: number; topic: LessonTopic; category: LessonCategory } | null>(null);
  const [lessonData, setLessonData] = useState<LessonContent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.English);
  
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Effect to check for speech synthesis support and load voices.
  useEffect(() => {
    if ('speechSynthesis' in window) {
      setSpeechSupported(true);
      const loadVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null; // Cleanup
        window.speechSynthesis.cancel();
      };
    } else {
      setSpeechSupported(false);
      console.warn("Speech Synthesis not supported by this browser.");
    }
  }, []);

  const cancelSpeech = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const handleSelectLesson = useCallback(async (index: number, topic: LessonTopic, category: LessonCategory) => {
    if (isLoading) return;
    
    cancelSpeech();

    setSelectedLesson({ index, topic, category });
    setLessonData(null);
    setIsLoading(true);
    setError(null);
    setViewMode(ViewMode.English);

    try {
      const content = await generateLessonContent(topic.english, category);
       if (content.category === 'business' || content.category === 'daily') {
         content.englishText = content.englishText.replace(/(?<!^)(Speaker [A-Z]:|M:|W:|M2:)/g, '\n\n$1').trim();
       } else if (content.category === 'toeic_part3') {
         content.conversationScript = content.conversationScript.replace(/(?<!^)(M:|W:|M2:)/g, '\n\n$1').trim();
       } else if (content.category === 'toeic_part4') {
         content.talkScript = content.talkScript.replace(/(?<!^)(M:|W:|M2:)/g, '\n\n$1').trim();
       }
      setLessonData(content);
    } catch (err) {
      console.error(err);
      setError('Failed to generate lesson content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, cancelSpeech]);
  
  const playAudioSnippet = useCallback((text: string, rate: number = 1.0) => {
    if (!speechSupported) {
      console.error("Speech synthesis not supported.");
      setError("Audio playback is not available on this browser.");
      return;
    }
     if (voices.length === 0) {
        console.warn("No voices loaded yet. Speech might not work.");
    }

    cancelSpeech();

    const chunks = chunkText(text);

    if (chunks.length === 0) {
        setIsSpeaking(false);
        return;
    }

    const bestVoices = getBestEnglishVoices(voices);
    const preferredVoice = bestVoices.length > 0 ? bestVoices[0] : null;

    const utterances = chunks.map(chunk => {
        const u = new SpeechSynthesisUtterance(chunk);
        if (preferredVoice) {
            u.voice = preferredVoice;
            u.lang = preferredVoice.lang;
        } else {
            u.lang = 'en-US';
        }
        u.rate = rate;
        u.onerror = (event: SpeechSynthesisErrorEvent) => {
            console.error('SpeechSynthesisUtterance error:', event.error, 'on text:', `"${chunk}"`);
            setIsSpeaking(false);
            setError(`Audio playback error: ${event.error}. Please try another browser if the issue persists.`);
        };
        return u;
    });
    
    utterances[0].onstart = () => setIsSpeaking(true);
    utterances[utterances.length - 1].onend = () => setIsSpeaking(false);

    setTimeout(() => {
        utterances.forEach(u => window.speechSynthesis.speak(u));
    }, 50);

  }, [voices, speechSupported, setError, cancelSpeech]);

  const playMultiSpeakerAudio = useCallback((text: string, rate: number = 1.0) => {
    if (!speechSupported) {
        setError("Audio playback is not available on this browser.");
        return;
    }
    if (voices.length === 0) {
        console.warn("No voices loaded yet. Speech might not work.");
    }
    
    cancelSpeech();
    
    const dialogueParts = text.split(/(?=\n\n(?:Speaker [A-Z]|M:|W:|M2:))/g).map(s => s.trim()).filter(Boolean);

    if (dialogueParts.length <= 1) {
        const cleanedText = text.replace(/(Speaker [A-Z]:|M:|W:|M2:)\s*/g, ' ').trim();
        playAudioSnippet(cleanedText, rate);
        return;
    }
    
    const utterances: SpeechSynthesisUtterance[] = [];
    const speakerVoiceMap = new Map<string, SpeechSynthesisVoice>();
    
    const preferredVoices = getBestEnglishVoices(voices);

    if (preferredVoices.length === 0) {
      setError("No English voices found for audio playback.");
      return;
    }

    let voiceIndex = 0;

    for (const part of dialogueParts) {
        const match = part.match(/^(?:Speaker [A-Z]|M|W|M2):/);
        const speaker = match ? match[0] : 'Narrator';
        const line = match ? part.substring(match[0].length).trim() : part.trim();
        
        if (!line) continue;

        if (!speakerVoiceMap.has(speaker)) {
            speakerVoiceMap.set(speaker, preferredVoices[voiceIndex % preferredVoices.length]);
            voiceIndex++;
        }

        const voice = speakerVoiceMap.get(speaker);
        const lineChunks = chunkText(line);

        for (const chunk of lineChunks) {
            const utterance = new SpeechSynthesisUtterance(chunk);
            if (voice) {
                utterance.voice = voice;
                utterance.lang = voice.lang;
            }
            utterance.rate = rate;
            utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
                 console.error('SpeechSynthesisUtterance error:', event.error, 'on text:', `"${chunk}"`);
                 setIsSpeaking(false);
                 setError(`Audio playback error: ${event.error}. Please try another browser if the issue persists.`);
            };
            utterances.push(utterance);
        }
    }
    
    if (utterances.length > 0) {
        utterances[0].onstart = () => setIsSpeaking(true);
        utterances[utterances.length - 1].onend = () => setIsSpeaking(false);
        
        setTimeout(() => {
            utterances.forEach(u => window.speechSynthesis.speak(u));
        }, 50);
    } else {
        setIsSpeaking(false);
    }
  }, [voices, speechSupported, setError, playAudioSnippet, cancelSpeech]);
  
  const getSpeechText = useCallback(() => {
    if (!lessonData) return '';
    switch(lessonData.category) {
      case 'general':
      case 'business':
      case 'daily':
        return lessonData.englishText;
      case 'toeic_part3':
        return lessonData.conversationScript;
      case 'toeic_part4':
        return lessonData.talkScript;
      default:
        return '';
    }
  }, [lessonData]);

  const handleToggleSpeak = useCallback(() => {
    if (isSpeaking) {
      cancelSpeech();
    } else {
      const textToSpeak = getSpeechText();
      if(textToSpeak) {
        if (lessonData?.category === 'business' || lessonData?.category === 'daily' || lessonData?.category === 'toeic_part3' || lessonData?.category === 'toeic_part4') {
          playMultiSpeakerAudio(textToSpeak, playbackRate);
        } else {
          playAudioSnippet(textToSpeak, playbackRate);
        }
      }
    }
  }, [isSpeaking, getSpeechText, playMultiSpeakerAudio, playAudioSnippet, playbackRate, lessonData, cancelSpeech]);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    setPlaybackRate(rate);
    
    if (window.speechSynthesis.speaking) {
        const textToSpeak = getSpeechText();
        if(textToSpeak) {
          if (lessonData?.category === 'business' || lessonData?.category === 'daily' || lessonData?.category === 'toeic_part3' || lessonData?.category === 'toeic_part4') {
            playMultiSpeakerAudio(textToSpeak, rate);
          } else {
            playAudioSnippet(textToSpeak, rate);
          }
        }
    }
  }, [getSpeechText, lessonData, playMultiSpeakerAudio, playAudioSnippet]);

  const handleRestartSpeak = useCallback(() => {
    const textToSpeak = getSpeechText();
      if(textToSpeak) {
        if (lessonData?.category === 'business' || lessonData?.category === 'daily' || lessonData?.category === 'toeic_part3' || lessonData?.category === 'toeic_part4') {
          playMultiSpeakerAudio(textToSpeak, playbackRate);
        } else {
          playAudioSnippet(textToSpeak, playbackRate);
        }
      }
  }, [getSpeechText, playMultiSpeakerAudio, playAudioSnippet, playbackRate, lessonData]);


  return (
    <div 
      className="relative min-h-screen lg:flex bg-slate-100 text-slate-800"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
       {/* Overlay for mobile */}
       {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          aria-hidden="true"
        ></div>
      )}

      <LessonSelector
        categorizedTopics={CATEGORIZED_LESSONS}
        selectedLesson={selectedLesson}
        onSelectLesson={handleSelectLesson}
        isLoading={isLoading}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white shadow-md p-4 flex items-center gap-4 z-10">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-1 text-slate-600 hover:text-slate-900"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-700 truncate">
              {selectedLesson ? `${selectedLesson.topic.japanese}` : 'Select a lesson to begin'}
            </h1>
            {selectedLesson && (
              <p className="text-xs sm:text-sm text-slate-500 mt-1 truncate">{`#${selectedLesson.index + 1}: ${selectedLesson.topic.english}`}</p>
            )}
          </div>
        </header>
        <ContentView
          lessonData={lessonData}
          isLoading={isLoading}
          error={error}
          viewMode={viewMode}
          setViewMode={setViewMode}
          isSpeaking={isSpeaking}
          playbackRate={playbackRate}
          handleToggleSpeak={handleToggleSpeak}
          handlePlaybackRateChange={handlePlaybackRateChange}
          handleRestartSpeak={handleRestartSpeak}
          playAudioSnippet={(text) => playAudioSnippet(text, playbackRate)}
          playMultiSpeakerAudio={(text) => playMultiSpeakerAudio(text, playbackRate)}
          cancelSpeech={cancelSpeech}
        />
      </main>
    </div>
  );
};

export default App;
