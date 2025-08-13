import React, { useState, useEffect } from 'react';
import { LessonContent, ViewMode, VocabularyItem, GrammarPoint, LessonData, ToeicPart1Data, ToeicPart2Data, ToeicPart3Data, ToeicPart4Data, ToeicPart5Data, ToeicPart6Data, ToeicPart7Data, ToeicQuestion } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { PlayIcon, PauseIcon, RestartIcon } from './icons';

interface ContentViewProps {
  lessonData: LessonContent | null;
  isLoading: boolean;
  error: string | null;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isSpeaking: boolean;
  playbackRate: number;
  handleToggleSpeak: () => void;
  handlePlaybackRateChange: (rate: number) => void;
  handleRestartSpeak: () => void;
  playAudioSnippet: (text: string) => void;
  playMultiSpeakerAudio: (text: string) => void;
  cancelSpeech: () => void;
}

// =================================================================
// Reading Lesson Components
// =================================================================

const ViewModeTabs: React.FC<{ viewMode: ViewMode; setViewMode: (mode: ViewMode) => void }> = ({ viewMode, setViewMode }) => {
  const tabs = [
    { mode: ViewMode.English, label: 'English & 和訳' },
    { mode: ViewMode.Japanese, label: '和訳のみ' },
    { mode: ViewMode.Vocabulary, label: 'Vocabulary' },
    { mode: ViewMode.Grammar, label: 'Grammar' },
    { mode: ViewMode.Shadowing, label: 'Shadowing' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-2 bg-slate-200 p-2 rounded-lg">
      {tabs.map((tab) => (
        <button key={tab.mode} onClick={() => setViewMode(tab.mode)} className={`px-4 py-2 text-sm sm:text-base font-semibold rounded-md transition-colors whitespace-nowrap ${viewMode === tab.mode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-300'}`}>
          {tab.label}
        </button>
      ))}
    </div>
  );
};

const HighlightedText: React.FC<{ text: string, vocabulary: VocabularyItem[], grammar: GrammarPoint[] }> = ({ text, vocabulary, grammar }) => {
    const allHighlights = [
        ...grammar.map(g => ({ text: g.exampleSentence, type: 'grammar' as const })),
        ...vocabulary.map(v => ({ text: v.word, type: 'vocabulary' as const }))
    ];
    const sortedHighlights = allHighlights.filter(h => h.text && h.text.trim() !== '').sort((a, b) => b.text.length - a.text.length);

    if (sortedHighlights.length === 0) return <p className="text-base lg:text-lg leading-relaxed whitespace-pre-wrap font-serif">{text}</p>;
    
    const highlightMap = new Map<string, 'vocabulary' | 'grammar'>();
    sortedHighlights.forEach(h => { if (!highlightMap.has(h.text)) highlightMap.set(h.text, h.type); });

    const uniqueEscapedHighlights = [...new Set(sortedHighlights.map(h => h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))];
    if (uniqueEscapedHighlights.length === 0) return <p className="text-base lg:text-lg leading-relaxed whitespace-pre-wrap font-serif">{text}</p>;

    const regex = new RegExp(`(${uniqueEscapedHighlights.join('|')})`, 'g');
    const parts = text.split(regex);

    return (
        <p className="text-base lg:text-lg leading-relaxed whitespace-pre-wrap font-serif">
            {parts.filter(part => part).map((part, index) => {
                const highlightType = highlightMap.get(part);
                if (highlightType === 'vocabulary') return <strong key={index} className="text-blue-700 font-bold">{part}</strong>;
                if (highlightType === 'grammar') return <strong key={index} className="text-green-700 font-bold">{part}</strong>;
                return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
        </p>
    );
};

const VocabularyList: React.FC<{ items: VocabularyItem[] }> = ({ items }) => (
    <div className="space-y-4">{items.map((item, index) => (<div key={index} className="bg-white p-4 rounded-lg shadow"><h3 className="text-lg font-bold text-blue-700">{item.word}</h3><p className="text-slate-600 mt-1">{item.meaning}</p><p className="text-slate-500 mt-2 italic">e.g., "{item.example}"</p></div>))}</div>
);

const GrammarList: React.FC<{ items: GrammarPoint[] }> = ({ items }) => (
    <div className="space-y-4">{items.map((item, index) => (<div key={index} className="bg-white p-4 rounded-lg shadow"><h3 className="text-lg font-bold text-green-700">{item.point}</h3><p className="text-slate-600 mt-1">{item.explanation}</p><p className="text-slate-500 mt-2 italic">Text example: "{item.exampleSentence}"</p></div>))}</div>
);

const ShadowingControls: React.FC<{ isSpeaking: boolean; playbackRate: number; onToggleSpeak: () => void; onRateChange: (rate: number) => void; onRestart: () => void; }> = ({ isSpeaking, playbackRate, onToggleSpeak, onRateChange, onRestart }) => {
  const rates = [0.75, 1.0, 1.25];
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 bg-slate-100 p-4 rounded-lg shadow-inner">
      <div className="flex items-center gap-2"><span className="text-base font-semibold text-slate-600">Speed:</span>{rates.map(rate => (<button key={rate} onClick={() => onRateChange(rate)} aria-pressed={playbackRate === rate} className={`px-4 py-2 text-base font-semibold rounded-md transition-all duration-200 border-2 ${playbackRate === rate ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-700 hover:bg-slate-200 border-transparent'}`}>{rate}x</button>))}</div>
      <div className="flex items-center gap-4"><button onClick={onRestart} className="p-3 bg-white rounded-full shadow-md hover:bg-slate-200 transition-colors transform hover:scale-105" aria-label="Restart"><RestartIcon /></button><button onClick={onToggleSpeak} className="p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-transform transform active:scale-95 hover:scale-105" aria-label={isSpeaking ? 'Pause' : 'Play'}>{isSpeaking ? <PauseIcon /> : <PlayIcon />}</button></div>
    </div>
  );
};

const ReadingLessonView: React.FC<ContentViewProps> = ({ lessonData, viewMode, setViewMode, isSpeaking, playbackRate, handleToggleSpeak, handlePlaybackRateChange, handleRestartSpeak }) => {
    if (!lessonData || (lessonData.category !== 'general' && lessonData.category !== 'business' && lessonData.category !== 'daily')) return null;
    const data = lessonData as LessonData;

    const renderContent = () => {
        switch (viewMode) {
          case ViewMode.English: return (<div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6"><div><h3 className="text-xl font-bold mb-3 text-slate-800 border-b-2 border-slate-200 pb-2">Original Text</h3><HighlightedText text={data.englishText} vocabulary={data.vocabulary} grammar={data.grammar}/></div><div><h3 className="text-xl font-bold mb-3 text-slate-800 border-b-2 border-slate-200 pb-2">日本語訳</h3><p className="text-base lg:text-lg leading-relaxed whitespace-pre-wrap">{data.japaneseText}</p></div></div>);
          case ViewMode.Japanese: return <p className="text-lg leading-relaxed whitespace-pre-wrap">{data.japaneseText}</p>;
          case ViewMode.Vocabulary: return <VocabularyList items={data.vocabulary} />;
          case ViewMode.Grammar: return <GrammarList items={data.grammar} />;
          case ViewMode.Shadowing: return (<div><h3 className="text-xl font-bold mb-3 text-slate-800 border-b-2 border-slate-200 pb-2">Shadowing Practice</h3><p className="text-base lg:text-lg leading-relaxed whitespace-pre-wrap font-serif text-center">{data.englishText}</p><ShadowingControls isSpeaking={isSpeaking} playbackRate={playbackRate} onToggleSpeak={handleToggleSpeak} onRateChange={handlePlaybackRateChange} onRestart={handleRestartSpeak} /></div>);
          default: return null;
        }
    };

    return (
        <>
          <div className="mb-6 flex justify-center"><ViewModeTabs viewMode={viewMode} setViewMode={setViewMode} /></div>
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm max-w-6xl mx-auto w-full">{renderContent()}</div>
        </>
    );
};


// =================================================================
// TOEIC Lesson Components
// =================================================================

const ChoiceButton: React.FC<{ choice: string; id: string; selected: boolean; correct?: boolean; showResult: boolean; onSelect: () => void; }> = ({ choice, id, selected, correct, showResult, onSelect }) => {
    const getChoiceColor = () => {
        if (!showResult) return selected ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white';
        if (correct) return 'border-green-500 bg-green-100 text-green-800';
        if (selected) return 'border-red-500 bg-red-100 text-red-800';
        return 'border-slate-300 bg-slate-50 text-slate-500';
    };
    return (<button onClick={onSelect} disabled={showResult} className={`w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 sm:space-x-4 ${getChoiceColor()} ${!showResult && 'hover:border-blue-400'}`}><div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${selected || showResult ? 'text-white' : 'text-slate-500'} ${showResult ? (correct ? 'bg-green-500' : (selected ? 'bg-red-500' : 'bg-slate-400')) : (selected ? 'bg-blue-500' : 'bg-slate-200')}`}>{id}</div><span className="flex-1 text-sm sm:text-base">{choice}</span></button>);
};

const ToeicPart1View: React.FC<{ data: ToeicPart1Data; playAudioSnippet: (text: string) => void; }> = ({ data, playAudioSnippet }) => {
    const [userAnswer, setUserAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
    const [showResult, setShowResult] = useState(false);
    const choices = ['A', 'B', 'C', 'D'];

    return (
        <div className="max-w-4xl mx-auto">
            <img src={data.imageUrl} alt="TOEIC Question" className="rounded-lg shadow-lg mb-6 w-full object-contain" />
            <div className="space-y-3">
                {data.audioScripts.map((script, index) => {
                    const choiceId = choices[index] as 'A' | 'B' | 'C' | 'D';
                    return (<div key={index} className="flex items-center space-x-3"><button onClick={() => playAudioSnippet(script)} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-transform transform active:scale-95"><PlayIcon /></button><ChoiceButton choice={`(${choiceId})`} id={choiceId} selected={userAnswer === choiceId} onSelect={() => setUserAnswer(choiceId)} showResult={showResult} correct={data.correctAnswer === choiceId} /></div>);
                })}
            </div>
            {!showResult && <button onClick={() => setShowResult(true)} disabled={!userAnswer} className="mt-6 w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed">Check Answer</button>}
            {showResult && <div className="mt-6 p-4 bg-blue-50 rounded-lg"><h3 className="font-bold text-blue-800">Explanation</h3><p className="mt-2 text-slate-700 whitespace-pre-wrap">{data.explanation}</p><h4 className="font-bold text-blue-800 mt-4">Scripts:</h4><ul className="list-disc list-inside mt-2 text-slate-600 space-y-1">{data.audioScripts.map((s, i) => <li key={i} className={choices[i] === data.correctAnswer ? 'font-bold' : ''}>({choices[i]}) {s}</li>)}</ul></div>}
        </div>
    );
};

const ToeicPart2View: React.FC<{ data: ToeicPart2Data; playAudioSnippet: (text: string) => void; }> = ({ data, playAudioSnippet }) => {
    const [userAnswer, setUserAnswer] = useState<'A' | 'B' | 'C' | null>(null);
    const [showResult, setShowResult] = useState(false);
    const choices = ['A', 'B', 'C'];
    return (
        <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-lg font-semibold text-slate-600 mb-4">Listen to the question and choose the best response.</h3>
            <button onClick={() => playAudioSnippet(data.questionScript)} className="mb-8 bg-blue-600 text-white rounded-full p-5 shadow-lg hover:bg-blue-700 transition transform hover:scale-105"><PlayIcon /></button>
            <div className="space-y-3 text-left">
                {data.choices.map((choice, index) => {
                    const choiceId = choices[index] as 'A' | 'B' | 'C';
                    return (<ChoiceButton key={index} choice={choice} id={choiceId} selected={userAnswer === choiceId} onSelect={() => setUserAnswer(choiceId)} showResult={showResult} correct={data.correctAnswer === choiceId} />);
                })}
            </div>
            {!showResult && <button onClick={() => setShowResult(true)} disabled={!userAnswer} className="mt-6 w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed">Check Answer</button>}
            {showResult && <div className="mt-6 p-4 bg-blue-50 rounded-lg text-left"><h3 className="font-bold text-blue-800">Explanation & Transcript</h3><p className="mt-2 text-slate-700 whitespace-pre-wrap">{data.explanation}</p><div className="mt-4 p-3 bg-slate-100 rounded"><p className="text-slate-600 whitespace-pre-wrap">{data.transcript}</p></div></div>}
        </div>
    );
};

const ToeicMultiQuestionView: React.FC<{ script: string; questions: ToeicQuestion[]; explanation: string; audioLabel: string; playAudio: (text: string) => void; }> = ({ script, questions, explanation, audioLabel, playAudio }) => {
    const [userAnswers, setUserAnswers] = useState<{[key: number]: string | null}>({});
    const [showResult, setShowResult] = useState(false);
    
    const handleSelect = (qIndex: number, choiceId: string) => {
        if(showResult) return;
        setUserAnswers(prev => ({...prev, [qIndex]: choiceId}));
    };
    const allAnswered = questions.every((_, i) => userAnswers[i] != null);

    return (
        <div className="max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-slate-600 mb-4 text-center">{audioLabel}</h3>
            <div className="text-center mb-8">
                 <button onClick={() => playAudio(script)} className="bg-blue-600 text-white rounded-full p-5 shadow-lg hover:bg-blue-700 transition transform hover:scale-105" aria-label="Play audio">
                    <PlayIcon />
                </button>
            </div>
            
            <div className="space-y-8">
                {questions.map((q, qIndex) => (
                    <div key={qIndex}>
                        <p className="font-semibold mb-3">{`Question ${qIndex + 1}: ${q.question}`}</p>
                        <div className="space-y-3">
                            {q.choices.map((choice, cIndex) => {
                                const choiceId = String.fromCharCode(65 + cIndex) as 'A'|'B'|'C'|'D';
                                return (
                                    <ChoiceButton
                                        key={cIndex}
                                        choice={choice}
                                        id={choiceId}
                                        selected={userAnswers[qIndex] === choiceId}
                                        onSelect={() => handleSelect(qIndex, choiceId)}
                                        showResult={showResult}
                                        correct={q.correctAnswer === choiceId}
                                    />
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {!showResult && (
                <button onClick={() => setShowResult(true)} disabled={!allAnswered} className="mt-8 w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed">
                    Check Answers
                </button>
            )}

            {showResult && (
                <div className="mt-8 p-6 bg-blue-50 rounded-lg text-left shadow-inner">
                    <h3 className="font-bold text-xl text-blue-800">Explanation & Transcript</h3>
                    <p className="mt-3 text-slate-700 whitespace-pre-wrap">{explanation}</p>
                    <div className="mt-4 p-4 bg-slate-100 rounded">
                        <h4 className="font-bold text-slate-800 mb-2">Transcript</h4>
                        <p className="text-slate-600 whitespace-pre-wrap">{script}</p>
                    </div>
                </div>
            )}
        </div>
    );
};


const ToeicPart3View: React.FC<{ data: ToeicPart3Data; playAudio: (text: string) => void; }> = ({ data, playAudio }) => (
    <ToeicMultiQuestionView
        script={data.conversationScript}
        questions={data.questions}
        explanation={data.explanation}
        audioLabel="Listen to the conversation and answer the questions."
        playAudio={playAudio}
    />
);

const ToeicPart4View: React.FC<{ data: ToeicPart4Data; playAudio: (text: string) => void; }> = ({ data, playAudio }) => (
    <ToeicMultiQuestionView
        script={data.talkScript}
        questions={data.questions}
        explanation={data.explanation}
        audioLabel="Listen to the short talk and answer the questions."
        playAudio={playAudio}
    />
);

const ToeicPart5View: React.FC<{ data: ToeicPart5Data; }> = ({ data }) => {
    const [userAnswer, setUserAnswer] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const choices = ['A', 'B', 'C', 'D'];

    return (
        <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-semibold text-slate-600 mb-2 text-center">Complete the sentence.</h3>
            <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md mb-6">
                <p className="text-lg sm:text-xl leading-relaxed text-center font-serif">{data.question}</p>
            </div>
            <div className="space-y-3">
                {data.choices.map((choice, index) => {
                    const choiceId = choices[index] as 'A' | 'B' | 'C' | 'D';
                    return (<ChoiceButton
                        key={index}
                        choice={choice}
                        id={choiceId}
                        selected={userAnswer === choiceId}
                        onSelect={() => setUserAnswer(choiceId)}
                        showResult={showResult}
                        correct={data.correctAnswer === choiceId}
                    />);
                })}
            </div>
            {!showResult && <button onClick={() => setShowResult(true)} disabled={!userAnswer} className="mt-6 w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed">Check Answer</button>}
            {showResult && <div className="mt-6 p-4 bg-blue-50 rounded-lg text-left"><h3 className="font-bold text-blue-800">Explanation</h3><p className="mt-2 text-slate-700 whitespace-pre-wrap">{data.explanation}</p></div>}
        </div>
    );
};

const ToeicPart6View: React.FC<{ data: ToeicPart6Data }> = ({ data }) => {
    const [userAnswers, setUserAnswers] = useState<{ [key: number]: string | null }>({});
    const [showResult, setShowResult] = useState(false);

    const handleSelect = (qNum: number, choiceId: string) => {
        if (showResult) return;
        setUserAnswers(prev => ({ ...prev, [qNum]: choiceId }));
    };
    
    const allAnswered = data.questions.every(q => userAnswers[q.questionNumber] != null);
    
    const getFilledText = () => {
        if (!showResult) return data.text;
        
        let filledText = data.text;
        data.questions.forEach(q => {
            const correctChoice = q.choices[q.correctAnswer.charCodeAt(0) - 65];
            filledText = filledText.replace(`[${q.questionNumber}]`, `__${correctChoice}__`);
        });
        return filledText;
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-slate-600 mb-4 text-center">Read the text and choose the best word or phrase to fill each blank.</h3>
            
            <div className="p-6 bg-white rounded-lg shadow-md mb-8">
                <p className="text-lg leading-relaxed whitespace-pre-wrap font-serif"
                   dangerouslySetInnerHTML={{ __html: getFilledText().replace(/__([^__]+)__/g, '<strong class="text-green-700 font-bold p-1 bg-green-100 rounded">$&</strong>').replace(/__/g, '') }} />
            </div>

            <div className="space-y-8">
                {data.questions.map((q) => (
                    <div key={q.questionNumber}>
                        <p className="font-semibold mb-3">{`Question ${q.questionNumber}`}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.choices.map((choice, cIndex) => {
                                const choiceId = String.fromCharCode(65 + cIndex) as 'A'|'B'|'C'|'D';
                                return (
                                    <ChoiceButton
                                        key={cIndex}
                                        choice={choice}
                                        id={choiceId}
                                        selected={userAnswers[q.questionNumber] === choiceId}
                                        onSelect={() => handleSelect(q.questionNumber, choiceId)}
                                        showResult={showResult}
                                        correct={q.correctAnswer === choiceId}
                                    />
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {!showResult && (
                <button onClick={() => setShowResult(true)} disabled={!allAnswered} className="mt-8 w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed">
                    Check Answers
                </button>
            )}

            {showResult && (
                <div className="mt-8 p-6 bg-blue-50 rounded-lg text-left shadow-inner">
                    <h3 className="font-bold text-xl text-blue-800">Explanation</h3>
                    <p className="mt-3 text-slate-700 whitespace-pre-wrap">{data.explanation}</p>
                </div>
            )}
        </div>
    );
};

const ToeicPart7View: React.FC<{ data: ToeicPart7Data }> = ({ data }) => {
    const [userAnswers, setUserAnswers] = useState<{ [key: number]: string | null }>({});
    const [showResult, setShowResult] = useState(false);

    const handleSelect = (qIndex: number, choiceId: string) => {
        if (showResult) return;
        setUserAnswers(prev => ({ ...prev, [qIndex]: choiceId }));
    };
    const allAnswered = data.questions.every((_, i) => userAnswers[i] != null);
    
    const passages = data.passage.split('---PASSAGE 2---').map(p => p.trim());

    return (
        <div className="max-w-5xl mx-auto">
            <h3 className="text-lg font-semibold text-slate-600 mb-4 text-center">Read the passage(s) and answer the questions.</h3>
            
            <div className="space-y-6">
                {passages.map((p, index) => (
                    <div key={index} className="p-6 bg-white rounded-lg shadow-md">
                        {data.passageType === 'double' && <h4 className="font-bold text-slate-500 mb-2">PASSAGE {index+1}</h4>}
                        <p className="text-base leading-relaxed whitespace-pre-wrap font-serif">{p}</p>
                    </div>
                ))}
            </div>
            
            <div className="space-y-8 mt-8">
                {data.questions.map((q, qIndex) => (
                    <div key={qIndex}>
                        <p className="font-semibold mb-3">{`Question ${qIndex + 1}: ${q.question}`}</p>
                        <div className="space-y-3">
                            {q.choices.map((choice, cIndex) => {
                                const choiceId = String.fromCharCode(65 + cIndex) as 'A' | 'B' | 'C' | 'D';
                                return (
                                    <ChoiceButton
                                        key={cIndex}
                                        choice={choice}
                                        id={choiceId}
                                        selected={userAnswers[qIndex] === choiceId}
                                        onSelect={() => handleSelect(qIndex, choiceId)}
                                        showResult={showResult}
                                        correct={q.correctAnswer === choiceId}
                                    />
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {!showResult && (
                <button onClick={() => setShowResult(true)} disabled={!allAnswered} className="mt-8 w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed">
                    Check Answers
                </button>
            )}

            {showResult && (
                <div className="mt-8 p-6 bg-blue-50 rounded-lg text-left shadow-inner">
                    <h3 className="font-bold text-xl text-blue-800">Explanation</h3>
                    <p className="mt-3 text-slate-700 whitespace-pre-wrap">{data.explanation}</p>
                </div>
            )}
        </div>
    );
};


const ContentView: React.FC<ContentViewProps> = (props) => {
  const { lessonData, isLoading, error, cancelSpeech } = props;

  useEffect(() => {
    // When a new lesson is loaded or component unmounts, stop any ongoing speech.
    return () => {
      cancelSpeech();
    };
  }, [lessonData, cancelSpeech]);
  
  const renderInitialState = () => (
    <div className="text-center text-slate-500 m-auto">
      <h2 className="text-2xl font-semibold">Welcome to your English Learning Hub!</h2>
      <p className="mt-2">Select a lesson from the left to get started.</p>
    </div>
  );
  
  const renderContent = () => {
      if (isLoading) return <LoadingSpinner />;
      if (error) return <div className="text-center text-red-500 font-semibold bg-red-100 p-4 rounded-lg m-auto">{error}</div>;
      if (!lessonData) return renderInitialState();

      switch (lessonData.category) {
          case 'general':
          case 'business':
          case 'daily':
              return <ReadingLessonView {...props} />;
          case 'toeic_part1':
              return <ToeicPart1View data={lessonData} playAudioSnippet={props.playAudioSnippet} />;
          case 'toeic_part2':
              return <ToeicPart2View data={lessonData} playAudioSnippet={props.playAudioSnippet} />;
          case 'toeic_part3':
              return <ToeicPart3View data={lessonData} playAudio={props.playMultiSpeakerAudio} />;
          case 'toeic_part4':
              return <ToeicPart4View data={lessonData} playAudio={props.playMultiSpeakerAudio} />;
          case 'toeic_part5':
              return <ToeicPart5View data={lessonData} />;
          case 'toeic_part6':
              return <ToeicPart6View data={lessonData} />;
          case 'toeic_part7':
              return <ToeicPart7View data={lessonData} />;
          default:
              return <div className="text-center text-red-500 m-auto">Unsupported lesson type.</div>;
      }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100">
        {renderContent()}
    </div>
  );
};

export default ContentView;
