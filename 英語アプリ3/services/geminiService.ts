import { GoogleGenAI, Type } from "@google/genai";
import { LessonContent, LessonCategory, LessonData, ToeicPart1Data, ToeicPart2Data, ToeicPart3Data, ToeicPart4Data, ToeicPart5Data, ToeicPart6Data, ToeicPart7Data, ToeicQuestion } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schemas for different lesson types
const readingLessonSchema = (category: 'general' | 'business' | 'daily') => {
    let description: string;
    switch (category) {
        case 'business':
            description = "An English dialogue of about 150-200 words on the given topic, between two or more people (e.g., using 'Speaker A:', 'Speaker B:'). Suitable for a TOEIC 700 level learner. It must include some common business English expressions.";
            break;
        case 'daily':
            description = "An English dialogue of about 150-200 words on the given topic, between two or more people (e.g., using 'Speaker A:', 'Speaker B:'). Suitable for a TOEIC 700 level learner. It must include some common daily conversational expressions.";
            break;
        default: // 'general'
            description = "An English passage of about 150-200 words on the given topic, suitable for a TOEIC 700 level learner. It must include some common English expressions or idioms.";
            break;
    }
    return {
      type: Type.OBJECT,
      properties: {
        englishText: { type: Type.STRING, description },
        japaneseText: { type: Type.STRING, description: "A full and natural-sounding Japanese translation." },
        vocabulary: {
          type: Type.ARRAY, description: "A list of exactly 10 important vocabulary words or idioms.",
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              meaning: { type: Type.STRING, description: "Japanese meaning." },
              example: { type: Type.STRING, description: "An English example sentence." },
            },
            required: ["word", "meaning", "example"],
          },
        },
        grammar: {
          type: Type.ARRAY, description: "A list of exactly 10 grammar points.",
          items: {
            type: Type.OBJECT,
            properties: {
              point: { type: Type.STRING },
              explanation: { type: Type.STRING, description: "Japanese explanation." },
              exampleSentence: { type: Type.STRING, description: "The exact sentence from the English passage." },
            },
            required: ["point", "explanation", "exampleSentence"],
          },
        },
      },
      required: ["englishText", "japaneseText", "vocabulary", "grammar"],
    };
};

const toeicPart1Schema = {
    type: Type.OBJECT,
    properties: {
        imagePrompt: { type: Type.STRING, description: "A detailed, realistic prompt for an AI image generator to create a photograph for a TOEIC Part 1 question. Describe a clear scene with people and objects." },
        audioScripts: {
            type: Type.ARRAY, description: "Exactly 4 short, descriptive English sentences (A, B, C, D) about the image. One is correct, three are incorrect.",
            items: { type: Type.STRING }
        },
        correctAnswer: { type: Type.STRING, description: "The correct choice: 'A', 'B', 'C', or 'D'." },
        explanation: { type: Type.STRING, description: "A brief Japanese explanation of why the answer is correct and others are not." }
    },
    required: ["imagePrompt", "audioScripts", "correctAnswer", "explanation"]
};

const toeicPart2Schema = {
    type: Type.OBJECT,
    properties: {
        questionScript: { type: Type.STRING, description: "A short English question or statement for TOEIC Part 2." },
        choices: {
            type: Type.ARRAY, description: "Exactly 3 short English sentences (A, B, C) as possible responses.",
            items: { type: Type.STRING }
        },
        correctAnswer: { type: Type.STRING, description: "The correct choice: 'A', 'B', or 'C'." },
        explanation: { type: Type.STRING, description: "A brief Japanese explanation of why the answer is correct." },
        transcript: { type: Type.STRING, description: "The full transcript including the question and all three choices, each on a new line." }
    },
    required: ["questionScript", "choices", "correctAnswer", "explanation", "transcript"]
};

const toeicQuestionSchema = {
    type: Type.OBJECT,
    properties: {
        question: { type: Type.STRING, description: "The question about the audio." },
        choices: { type: Type.ARRAY, description: "Exactly 4 answer choices (A, B, C, D).", items: { type: Type.STRING } },
        correctAnswer: { type: Type.STRING, description: "The correct choice: 'A', 'B', 'C', or 'D'." },
    },
    required: ["question", "choices", "correctAnswer"],
};

const toeicPart3Schema = {
    type: Type.OBJECT,
    properties: {
        conversationScript: { type: Type.STRING, description: "A conversation transcript between 2 or 3 people for TOEIC Part 3. Use 'M:', 'W:', 'M2:' to denote speakers." },
        questions: {
            type: Type.ARRAY, description: "Exactly 3 questions about the conversation.",
            items: toeicQuestionSchema,
        },
        explanation: { type: Type.STRING, description: "A brief Japanese explanation for all questions." },
    },
    required: ["conversationScript", "questions", "explanation"],
};

const toeicPart4Schema = {
    type: Type.OBJECT,
    properties: {
        talkScript: { type: Type.STRING, description: "A short talk/monologue transcript for TOEIC Part 4. Use 'M:' or 'W:' to denote the speaker." },
        questions: {
            type: Type.ARRAY, description: "Exactly 3 questions about the talk.",
            items: toeicQuestionSchema,
        },
        explanation: { type: Type.STRING, description: "A brief Japanese explanation for all questions." },
    },
    required: ["talkScript", "questions", "explanation"],
};

const toeicPart5Schema = {
    type: Type.OBJECT,
    properties: {
        question: { type: Type.STRING, description: "A sentence with a blank (e.g., '-------') for a TOEIC Part 5 question." },
        choices: {
            type: Type.ARRAY, description: "Exactly 4 word or phrase choices (A, B, C, D) to fill the blank.",
            items: { type: Type.STRING }
        },
        correctAnswer: { type: Type.STRING, description: "The correct choice: 'A', 'B', 'C', or 'D'." },
        explanation: { type: Type.STRING, description: "A detailed Japanese explanation of why the answer is correct, focusing on the grammar point." }
    },
    required: ["question", "choices", "correctAnswer", "explanation"]
};

const toeicPart6QuestionSchema = {
    type: Type.OBJECT,
    properties: {
        questionNumber: { type: Type.INTEGER, description: "The number of the question in the text, starting from 1." },
        choices: { type: Type.ARRAY, description: "Exactly 4 word/phrase choices (A, B, C, D).", items: { type: Type.STRING } },
        correctAnswer: { type: Type.STRING, description: "The correct choice: 'A', 'B', 'C', or 'D'." },
    },
    required: ["questionNumber", "choices", "correctAnswer"]
};

const toeicPart6Schema = {
    type: Type.OBJECT,
    properties: {
        text: { type: Type.STRING, description: "A text passage for TOEIC Part 6 (e.g., an email, memo) with 4 blanks, marked as [1], [2], [3], [4]." },
        questions: {
            type: Type.ARRAY, description: "Exactly 4 questions corresponding to the blanks.",
            items: toeicPart6QuestionSchema
        },
        explanation: { type: Type.STRING, description: "A comprehensive Japanese explanation covering all questions." }
    },
    required: ["text", "questions", "explanation"]
};

const toeicPart7Schema = {
    type: Type.OBJECT,
    properties: {
        passage: { type: Type.STRING, description: "A text passage for TOEIC Part 7 (e.g., email, article, ad). For double passages, separate them with '---PASSAGE 2---'." },
        passageType: { type: Type.STRING, description: "'single' or 'double'." },
        questions: {
            type: Type.ARRAY, description: "Between 2 and 5 questions about the passage(s).",
            items: toeicQuestionSchema,
        },
        explanation: { type: Type.STRING, description: "A comprehensive Japanese explanation for all questions." },
    },
    required: ["passage", "passageType", "questions", "explanation"]
};


// Main function to generate content
export const generateLessonContent = async (topic: string, category: LessonCategory): Promise<LessonContent> => {
    try {
        switch (category) {
            case 'general':
            case 'business':
            case 'daily':
                return await generateReadingLesson(topic, category);
            case 'toeic_part1':
                return await generateToeicPart1(topic);
            case 'toeic_part2':
                return await generateToeicPart2(topic);
            case 'toeic_part3':
                return await generateToeicPart3(topic);
            case 'toeic_part4':
                return await generateToeicPart4(topic);
            case 'toeic_part5':
                return await generateToeicPart5(topic);
            case 'toeic_part6':
                return await generateToeicPart6(topic);
            case 'toeic_part7':
                return await generateToeicPart7(topic);
            default:
                throw new Error(`Unsupported category: ${category}`);
        }
    } catch (e) {
        console.error(`Failed to generate content for ${category} - ${topic}`, e);
        throw new Error("Received invalid data from the AI. Please try again.");
    }
};

async function generateReadingLesson(topic: string, category: 'general' | 'business' | 'daily'): Promise<LessonData> {
    let prompt: string;
    if (category === 'business') {
        prompt = `Generate a business English conversation lesson on "${topic}". Format as a dialogue. Target: TOEIC 700.`;
    } else if (category === 'daily') {
        prompt = `Generate a daily English conversation lesson on "${topic}". Format as a dialogue. Target: TOEIC 700.`;
    } else {
        prompt = `Generate an English reading passage on "${topic}". Target: TOEIC 700.`;
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { 
            responseMimeType: "application/json", 
            responseSchema: readingLessonSchema(category), 
            temperature: 0.8,
            thinkingConfig: { thinkingBudget: 0 } 
        },
    });
    
    const lesson = JSON.parse(response.text.trim()) as Omit<LessonData, 'category'>;
    return { ...lesson, category };
}

async function generateToeicPart1(topic: string): Promise<ToeicPart1Data> {
    const prompt = `Create a TOEIC Part 1 style question based on the theme: "${topic}". Provide a detailed image prompt for an AI image generator, 4 descriptive statements (A, B, C, D), the correct answer, and a Japanese explanation.`;
    
    // 1. Generate text content
    const textResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { 
            responseMimeType: "application/json", 
            responseSchema: toeicPart1Schema, 
            temperature: 0.9,
            thinkingConfig: { thinkingBudget: 0 } 
        },
    });
    const content = JSON.parse(textResponse.text.trim());

    // 2. Generate image
    const imageResponse = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: content.imagePrompt,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '4:3' },
    });

    const base64ImageBytes: string = imageResponse.generatedImages[0].image.imageBytes;
    const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

    return {
        category: 'toeic_part1',
        imageUrl,
        audioScripts: content.audioScripts,
        correctAnswer: content.correctAnswer,
        explanation: content.explanation,
    };
}

async function generateToeicPart2(topic: string): Promise<ToeicPart2Data> {
    const prompt = `Create a TOEIC Part 2 style question-response item based on the theme: "${topic}". Provide the question/statement, 3 responses (A, B, C), the correct answer, a Japanese explanation, and a full transcript.`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { 
            responseMimeType: "application/json", 
            responseSchema: toeicPart2Schema, 
            temperature: 0.9,
            thinkingConfig: { thinkingBudget: 0 } 
        },
    });
    const content = JSON.parse(response.text.trim());
    return { ...content, category: 'toeic_part2' };
}

async function generateToeicPart3(topic: string): Promise<ToeicPart3Data> {
    const prompt = `Create a TOEIC Part 3 style conversation and 3 related questions. The theme is "${topic}". Provide a full transcript, 3 questions with 4 choices each, correct answers, and a Japanese explanation.`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { 
            responseMimeType: "application/json", 
            responseSchema: toeicPart3Schema, 
            temperature: 0.9,
            thinkingConfig: { thinkingBudget: 0 } 
        },
    });
    const content = JSON.parse(response.text.trim());
    return { ...content, category: 'toeic_part3' };
}

async function generateToeicPart4(topic: string): Promise<ToeicPart4Data> {
    const prompt = `Create a TOEIC Part 4 style short talk and 3 related questions. The theme is "${topic}". Provide a full transcript, 3 questions with 4 choices each, correct answers, and a Japanese explanation.`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { 
            responseMimeType: "application/json", 
            responseSchema: toeicPart4Schema, 
            temperature: 0.9,
            thinkingConfig: { thinkingBudget: 0 }
        },
    });
    const content = JSON.parse(response.text.trim());
    return { ...content, category: 'toeic_part4' };
}

async function generateToeicPart5(topic: string): Promise<ToeicPart5Data> {
    const prompt = `Create a TOEIC Part 5 style sentence completion question. The theme is "${topic}". Provide the sentence with a blank, 4 choices, the correct answer, and a detailed Japanese explanation.`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { 
            responseMimeType: "application/json", 
            responseSchema: toeicPart5Schema, 
            temperature: 0.9,
            thinkingConfig: { thinkingBudget: 0 } 
        },
    });
    const content = JSON.parse(response.text.trim());
    return { ...content, category: 'toeic_part5' };
}

async function generateToeicPart6(topic: string): Promise<ToeicPart6Data> {
    const prompt = `Create a TOEIC Part 6 style text completion exercise. The theme is "${topic}". Provide a text with 4 numbered blanks like [1], [2], etc., and 4 corresponding questions with choices, correct answers, and a comprehensive Japanese explanation for all.`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { 
            responseMimeType: "application/json", 
            responseSchema: toeicPart6Schema, 
            temperature: 0.9,
            thinkingConfig: { thinkingBudget: 0 } 
        },
    });
    const content = JSON.parse(response.text.trim());
    return { ...content, category: 'toeic_part6' };
}

async function generateToeicPart7(topic: string): Promise<ToeicPart7Data> {
    const prompt = `Create a TOEIC Part 7 style reading comprehension exercise. The theme is "${topic}". Provide one or two passages, a set of 2-5 questions with choices, correct answers, and a comprehensive Japanese explanation.`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { 
            responseMimeType: "application/json", 
            responseSchema: toeicPart7Schema, 
            temperature: 0.9,
            thinkingConfig: { thinkingBudget: 0 }
        },
    });
    const content = JSON.parse(response.text.trim());
    return { ...content, category: 'toeic_part7' };
}
