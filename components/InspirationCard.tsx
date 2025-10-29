import React, { useState, useEffect } from 'react';

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
  { quote: "Learn to teach what you learn — teaching is one of the fastest ways to master a subject.", author: "Study Hack" },
  { quote: "It's okay to fail — fail fast, learn fast, and iterate.", author: "Startup Advice" },
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
  const currentImage = images[currentIndex];

  return (
    <div className="w-full h-full min-h-[200px] aspect-square relative border border-solid border-white/20 rounded-2xl overflow-hidden shadow-lg">
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
      {/* This div now covers the left half and applies the blur/background */}
      <div className="w-1/2 h-full p-4 flex flex-col justify-between absolute inset-0 left-0 backdrop-blur-lg bg-black/20 text-gray-200 font-medium font-sans">
        {/* Spinning Gradient Element - moved inside and centered horizontally within this left half */}
        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-purple-500 to-orange-300 animate-spin self-center" style={{ animationDuration: '15s' }} />

        {/* Quote text - now just a container for the text, no longer applying blur/bg */}
        <div className="w-full p-3 flex flex-col rounded-xl relative h-32">
          <div key={currentIndex} className="animate-fade-in absolute inset-0">
            <span className="text-lg font-medium leading-tight">"{currentQuote.quote}"</span>
            <span className="text-sm text-gray-300 mt-2 self-end block text-right">- {currentQuote.author}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspirationCard;
