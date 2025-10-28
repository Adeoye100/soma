import React, { useState, useEffect } from 'react';
import { generateStudyVibeImage } from '../services/geminiService';
import Spinner from './Spinner';
import { BookOpenIcon } from './icons';

const StudyVibeImage: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = await generateStudyVibeImage();
        setImageUrl(url);
      } catch (err) {
        console.error("Failed to generate study vibe image:", err);
        setError("Could not load image.");
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center text-center h-full">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Generating inspiration...</p>
        </div>
      );
    }

    if (error || !imageUrl) {
      return (
        <div className="flex flex-col items-center justify-center text-center h-full p-4">
            <BookOpenIcon className="h-12 w-12 text-primary-400 mb-2" />
            <h3 className="font-semibold text-slate-600 dark:text-slate-300">Personalized Learning Ahead</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Could not load inspirational image.
            </p>
        </div>
      );
    }
    
    return (
        <img src={imageUrl} alt="An inspiring image of diverse students studying together." className="w-full h-full object-cover rounded-lg" />
    );
  };

  return (
    <div className="w-full h-full min-h-[200px] aspect-square bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden">
      {renderContent()}
    </div>
  );
};

export default StudyVibeImage;
