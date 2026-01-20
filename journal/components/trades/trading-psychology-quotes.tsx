"use client";

import { useState, useEffect } from "react";

const psychologyQuotes = [
  {
    quote: "The goal of a successful trader is to make the best trades. Money is secondary.",
    author: "Alexander Elder",
    category: "Risk Management",
  },
  {
    quote: "Risk comes from not knowing what you're doing.",
    author: "Warren Buffett",
    category: "Risk Management",
  },
  {
    quote: "The most important thing is preserving your capital and staying in the game.",
    author: "Van Tharp",
    category: "Risk Management",
  },
  {
    quote: "Cut your losses short and let your winners run.",
    author: "Jesse Livermore",
    category: "Risk Management",
  },
  {
    quote: "It's not about being right or wrong, but about how much money you make when you're right and how much you don't lose when you're wrong.",
    author: "George Soros",
    category: "Risk Management",
  },
  {
    quote: "The biggest risk is not taking any risk. In a world that's changing really quickly, the only strategy that is guaranteed to fail is not taking risks.",
    author: "Mark Zuckerberg",
    category: "Psychology",
  },
  {
    quote: "Trading is 90% psychology and 10% methodology.",
    author: "Unknown",
    category: "Psychology",
  },
  {
    quote: "The markets can remain irrational longer than you can remain solvent.",
    author: "John Maynard Keynes",
    category: "Risk Management",
  },
  {
    quote: "Patience is the trader's best friend. Wait for the right setup.",
    author: "Price Action Trading",
    category: "Psychology",
  },
  {
    quote: "Never risk more than 2% of your account on a single trade.",
    author: "Risk Management Rule",
    category: "Risk Management",
  },
  {
    quote: "The best traders don't have the best strategies, they have the best risk management.",
    author: "Unknown",
    category: "Risk Management",
  },
  {
    quote: "Control your emotions or they will control you.",
    author: "Trading Psychology",
    category: "Psychology",
  },
  {
    quote: "Plan your trade and trade your plan.",
    author: "Trading Wisdom",
    category: "Psychology",
  },
  {
    quote: "The market doesn't care about your feelings. It's your job to manage your emotions.",
    author: "Trading Psychology",
    category: "Psychology",
  },
  {
    quote: "Success in trading is about consistency, not perfection.",
    author: "Trading Psychology",
    category: "Psychology",
  },
];

export function TradingPsychologyQuotes() {
  const [currentQuote, setCurrentQuote] = useState(psychologyQuotes[0]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * psychologyQuotes.length);
      setCurrentQuote(psychologyQuotes[randomIndex]);
    }, 15000); // Change quote every 15 seconds

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
              {currentQuote.category}
            </span>
          </div>
          <p className="text-gray-800 text-sm italic mb-1">
            "{currentQuote.quote}"
          </p>
          <p className="text-gray-600 text-xs">— {currentQuote.author}</p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="ml-4 text-gray-400 hover:text-gray-600 transition"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
