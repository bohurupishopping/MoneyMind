import React from 'react';
import { motion } from 'framer-motion';
import { Code, BookOpen, Brain, Sparkles, Lightbulb, Rocket, TrendingUp, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestionProps {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
}

const Suggestion = ({ icon: Icon, title, description, onClick }: SuggestionProps) => (
  <motion.div
    className={cn(
      "group cursor-pointer",
      "p-1.5 sm:p-3",
      "border border-gray-200 dark:border-gray-700/50",
      "rounded-lg",
      "bg-white/50 dark:bg-gray-800/50",
      "hover:bg-white dark:hover:bg-gray-800",
      "transition-all duration-200",
      "hover:shadow-md hover:scale-[1.01]",
      "active:scale-[0.98]"
    )}
    onClick={onClick}
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
        <Icon className="w-4 h-4 text-blue-500" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1">
          {title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  </motion.div>
);

interface WelcomeSectionProps {
  onSuggestionClick: (prompt: string) => void;
  onOpenSEOOptimizer: () => void;
  onOpenStoryRewriter: () => void;
}

export const WelcomeSection = ({
  onSuggestionClick,
  onOpenSEOOptimizer,
  onOpenStoryRewriter
}: WelcomeSectionProps) => {
  const suggestions = [
    {
      icon: Code,
      title: "Code Assistant",
      description: "Help me write, debug, or optimize code",
      prompt: "I need help with coding. Can you assist me with writing clean and efficient code?"
    },
    {
      icon: BookOpen,
      title: "Story Creator",
      description: "Create engaging stories and narratives",
      prompt: "Help me write a creative story with interesting characters and plot."
    },
    {
      icon: Brain,
      title: "Problem Solver",
      description: "Solve complex problems step by step",
      prompt: "I have a complex problem that needs solving. Can you help me break it down?"
    },
    {
      icon: Sparkles,
      title: "Creative Assistant",
      description: "Generate creative ideas and solutions",
      prompt: "I need creative ideas for a project. Can you help brainstorm?"
    },
    {
      icon: TrendingUp,
      title: "SEO Optimizer",
      description: "Optimize content for better visibility",
      prompt: "I need help optimizing my content for search engines."
    },
    {
      icon: PenTool,
      title: "Story Rewriter",
      description: "Refine and polish existing stories",
      prompt: "Help me improve and refine my existing story."
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto px-4 py-8 space-y-6"
    >
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-16 h-16 mx-auto bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center"
        >
          <Rocket className="w-8 h-8 text-blue-500" />
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-gray-900 dark:text-gray-100"
        >
          Welcome! 👋
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-500 dark:text-gray-400 text-sm"
        >
          I'm Feluda AI, your intelligent assistant. How can I help you today?
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2"
      >
        {suggestions.map((suggestion, index) => (
          <Suggestion
            key={index}
            icon={suggestion.icon}
            title={suggestion.title}
            description={suggestion.description}
            onClick={() => {
              if (suggestion.title === "SEO Optimizer") {
                onOpenSEOOptimizer();
              } else if (suggestion.title === "Story Rewriter") {
                onOpenStoryRewriter();
              } else {
                onSuggestionClick(suggestion.prompt);
              }
            }}
          />
        ))}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center"
      >
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Have any questions? I'm here to help! 🕵️‍♂️
        </p>
      </motion.div>
    </motion.div>
  );
}; 