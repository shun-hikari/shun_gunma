
export type LessonCategory = 'general' | 'business' | 'daily' | 'toeic_part1' | 'toeic_part2' | 'toeic_part3' | 'toeic_part4' | 'toeic_part5' | 'toeic_part6' | 'toeic_part7';

export interface LessonTopic {
  english: string;
  japanese: string;
}

export interface CategorizedLessons {
  general: LessonTopic[];
  business: LessonTopic[];
  daily: LessonTopic[];
  toeic_part1: LessonTopic[];
  toeic_part2: LessonTopic[];
  toeic_part3: LessonTopic[];
  toeic_part4: LessonTopic[];
  toeic_part5: LessonTopic[];
  toeic_part6: LessonTopic[];
  toeic_part7: LessonTopic[];
}

// For General, Business, Daily
export interface VocabularyItem {
  word: string;
  meaning: string;
  example: string;
}

export interface GrammarPoint {
  point: string;
  explanation: string;
  exampleSentence: string;
}

export interface LessonData {
  category: 'general' | 'business' | 'daily';
  englishText: string;
  japaneseText: string;
  vocabulary: VocabularyItem[];
  grammar: GrammarPoint[];
}

// For TOEIC Part 1
export interface ToeicPart1Data {
    category: 'toeic_part1';
    imageUrl: string;
    audioScripts: string[];
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    explanation: string;
}

// For TOEIC Part 2
export interface ToeicPart2Data {
    category: 'toeic_part2';
    questionScript: string;
    choices: string[];
    correctAnswer: 'A' | 'B' | 'C';
    explanation: string;
    transcript: string;
}

// For TOEIC Part 3 & 4
export interface ToeicQuestion {
    question: string;
    choices: string[];
    correctAnswer: 'A' | 'B' | 'C' | 'D';
}

export interface ToeicPart3Data {
    category: 'toeic_part3';
    conversationScript: string;
    questions: ToeicQuestion[];
    explanation: string;
}

export interface ToeicPart4Data {
    category: 'toeic_part4';
    talkScript: string;
    questions: ToeicQuestion[];
    explanation: string;
}

// For TOEIC Part 5
export interface ToeicPart5Data {
    category: 'toeic_part5';
    question: string;
    choices: string[];
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    explanation: string;
}

// For TOEIC Part 6
export interface ToeicPart6Question {
    questionNumber: number;
    choices: string[];
    correctAnswer: 'A' | 'B' | 'C' | 'D';
}

export interface ToeicPart6Data {
    category: 'toeic_part6';
    text: string;
    questions: ToeicPart6Question[];
    explanation: string;
}

// For TOEIC Part 7
export interface ToeicPart7Data {
    category: 'toeic_part7';
    passage: string;
    passageType: 'single' | 'double';
    questions: ToeicQuestion[];
    explanation: string;
}


export type LessonContent = LessonData | ToeicPart1Data | ToeicPart2Data | ToeicPart3Data | ToeicPart4Data | ToeicPart5Data | ToeicPart6Data | ToeicPart7Data;


export enum ViewMode {
  English = 'english',
  Japanese = 'japanese',
  Vocabulary = 'vocabulary',
  Grammar = 'grammar',
  Shadowing = 'shadowing',
}
