import React from 'react';
import { Button } from '../ui/button';
import { ChatInput } from '../ui/chat-input';
import { Loader2, Send } from 'lucide-react';
import { InputSection, InputWrapper } from './TallyAIChatStyles';

interface FloatingChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function FloatingChatInput({
  input,
  isLoading,
  onInputChange,
  onSubmit
}: FloatingChatInputProps) {
  return (
    <InputSection>
      <form onSubmit={onSubmit} className="w-full">
        <InputWrapper>
          <div className="flex-1">
            <ChatInput
              value={input || ''}
              onChange={onInputChange}
              placeholder="Ask TallyAI"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
              className="w-full min-h-[40px] sm:min-h-[44px] max-h-[100px] resize-none rounded-full bg-transparent border-0 px-3 py-2 focus:outline-none placeholder:text-gray-400 placeholder:opacity-70 focus:placeholder:opacity-50 transition-colors"
              autoComplete="off"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="h-8 sm:h-9 aspect-square rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:scale-95 transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </Button>
        </InputWrapper>
      </form>
    </InputSection>
  );
}