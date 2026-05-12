import React, { useState, useEffect } from 'react';
import GlassCard from './GlassCard';
const quotes = [
  { quote: "Education is the passport to the future — prepare for it today.", author: "Malcolm X" },
  { quote: "When something is important enough, you do it even if the odds are not in your favor.", author: "Elon Musk" },
  { quote: "You have to fight to reach your dream. You have to sacrifice and work hard for it.", author: "Lionel Messi" },
  { quote: "Your past does not disqualify you from your future — keep moving forward.", author: "Enoch Adeboye" },
  { quote: "Start small, ship fast, and iterate — motion beats perfection.", author: "Sam Altman" },
  { quote: "Break big tasks into tiny, repeatable habits and compound progress every day.", author: "Life Hack" },
  { quote: "Learning is a lifelong process; master fundamentals and the rest follows.", author: "Education Tip" },
  { quote: "Don't be afraid to take big risks when necessary — you'll regret missed chances more than failed attempts.", author: "Elon Musk" },
  { quote: "Focus, practice, and a love for the game — the rest is built from discipline.", author: "Lionel Messi" },
  { quote: "Read widely, build simple things, and ship — the world rewards makers.", author: "Sam Altman" },
  { quote: "Small, steady improvements compound into huge gains over time.", author: "Atomic Habit" },
  { quote: "Use your time like a currency: spend on learning, building, and relationships that scale.", author: "Productivity Tip" },
  { quote: "Learn to teach what you learn — teaching is one of the fastest ways to master a subject.", author: "Study Tip" },
  { quote: "It's okay to fail — fail fast, learn fast, and iterate.", author: "Startup Advice" },
  { quote: "Simplicity is the Ultimate Sophistication", author: "Leonardo Davinci" },
  { quote: "Wisdom is the principal thing; therefore get wisdom", author: "Proverbs 4:7" },

];

const images = [
    '/img/1.jpg',
    '/img/2.jpg',
    '/img/3.jpg',
    '/img/4.jpg',
    '/img/5.jpg',
    '/img/6.jpg',
    '/img/7.jpg',
    '/img/8.jpg',
    '/img/9.jpg',
    '/img/10.jpg'
];

const InspirationCard: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => (prevIndex + 1) % Math.min(images.length, quotes.length));
    }, 5000); // Change image and quote every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const currentQuote = quotes[currentIndex];

  return (
    <GlassCard className="w-full h-full min-h-[280px] sm:min-h-[320px] aspect-[4/5] relative border border-solid border-white/20 rounded-2xl overflow-hidden shadow-lg">
      {/* Background Image Carousel */}
      {images.map((img, index) => (
        <img
          key={img}
          src={img}
          alt="Inspirational background"
          className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}

      {/* Foreground Blurry Layer with Quote */}
      {/* This div now covers the appropriate portion and applies the blur/background */}
      <div className="w-full sm:w-1/2 h-full p-3 sm:p-4 flex flex-col justify-start sm:justify-center absolute inset-0 left-0 backdrop-blur-lg bg-black/20 text-gray-200 font-medium font-sans">
        {/* Spinning Gradient Element - moved inside and sized responsively */}
        <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-purple-500 to-orange-300 animate-spin self-center flex-shrink-0" style={{ animationDuration: '15s' }} />

        {/* Quote text - now just a container for the text, no longer applying blur/bg */}
        <div className="w-full px-2 sm:p-3 flex flex-col rounded-xl relative h-24 sm:h-40 mt-2 sm:mt-4">
          <div key={currentIndex} className="animate-fade-in absolute inset-0 flex flex-col justify-between">
            <span className="text-sm sm:text-lg font-medium leading-tight">"{currentQuote.quote}"</span>
            <span className="text-xs sm:text-sm text-gray-300 text-right">- {currentQuote.author}</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default InspirationCard;
