import React, { useState } from 'react';
import { LessonTopic, LessonCategory, CategorizedLessons } from '../types';
import { CloseIcon } from './icons';

interface LessonSelectorProps {
  categorizedTopics: CategorizedLessons;
  selectedLesson: { index: number; topic: LessonTopic; category: LessonCategory } | null;
  onSelectLesson: (index: number, topic: LessonTopic, category: LessonCategory) => void;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const LessonSelector: React.FC<LessonSelectorProps> = ({ categorizedTopics, selectedLesson, onSelectLesson, isLoading, isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<LessonCategory>('general');

  const topics = categorizedTopics[activeCategory];

  const categoryTabs: { id: LessonCategory, label: string }[] = [
      { id: 'general', label: 'General' },
      { id: 'business', label: 'Business' },
      { id: 'daily', label: 'Daily' },
      { id: 'toeic_part1', label: 'Part 1' },
      { id: 'toeic_part2', label: 'Part 2' },
      { id: 'toeic_part3', label: 'Part 3' },
      { id: 'toeic_part4', label: 'Part 4' },
      { id: 'toeic_part5', label: 'Part 5' },
      { id: 'toeic_part6', label: 'Part 6' },
      { id: 'toeic_part7', label: 'Part 7' },
  ];
  
  const handleSelect = (index: number, topic: LessonTopic, category: LessonCategory) => {
    onSelectLesson(index, topic, category);
    onClose();
  };

  return (
    <aside 
      className={`bg-white h-full flex flex-col shadow-lg border-r border-slate-200 transition-transform duration-300 ease-in-out lg:static lg:transform-none lg:w-80 lg:shrink-0 fixed inset-y-0 left-0 z-30 w-80 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="p-4 border-b border-slate-200">
        <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold text-slate-800">Lessons</h2>
            <button onClick={onClose} className="lg:hidden p-1 text-slate-500 hover:text-slate-800" aria-label="Close menu">
                <CloseIcon />
            </button>
        </div>
        <div className="flex flex-wrap gap-1 bg-slate-200 rounded-lg p-1">
            {categoryTabs.map(tab => (
                 <button 
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id)}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors whitespace-nowrap px-2 ${activeCategory === tab.id ? 'bg-white text-blue-600 shadow' : 'text-slate-600 hover:bg-slate-300'}`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-slate-200">
          {topics.map((topic, index) => {
            const isSelected = selectedLesson?.category === activeCategory && selectedLesson?.index === index;
            const isThisLessonLoading = isLoading && isSelected;
            
            return (
              <li key={`${activeCategory}-${index}`}>
                <button
                  onClick={() => handleSelect(index, topic, activeCategory)}
                  disabled={isThisLessonLoading}
                  className={`w-full text-left p-4 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                    isSelected ? 'bg-blue-100' : 'hover:bg-slate-50'
                  } ${isLoading && !isThisLessonLoading ? 'cursor-wait' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className={`pt-1 text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>{index + 1}.</span>
                      <div className="flex-1">
                        <p className={`font-semibold ${isSelected ? 'text-blue-800' : 'text-slate-800'}`}>{topic.english}</p>
                        <p className={`text-sm ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>{topic.japanese}</p>
                      </div>
                    </div>
                    {isThisLessonLoading && (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin ml-2"></div>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  );
};

export default LessonSelector;
