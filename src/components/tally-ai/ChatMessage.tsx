import React from 'react';
import { Bot, User } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user';
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} mb-4`}>
      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-indigo-100' : 'bg-gray-100'
      }`}>
        {isUser ? (
          <User className="h-5 w-5 text-indigo-600" />
        ) : (
          <Bot className="h-5 w-5 text-gray-600" />
        )}
      </div>
      
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div className={`rounded-lg px-4 py-2 ${
          isUser 
            ? 'bg-indigo-600 text-white' 
            : 'bg-white border border-gray-200 text-gray-900'
        }`}>
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        {timestamp && (
          <span className="text-xs text-gray-500 mt-1">{timestamp}</span>
        )}
      </div>
    </div>
  );
} 