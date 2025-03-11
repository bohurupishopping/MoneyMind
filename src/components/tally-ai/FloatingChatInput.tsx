import React, { useEffect } from 'react';
import { Button } from '../ui/button';
import { ChatInput } from '../ui/chat-input';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { InputSection, InputWrapper, MotionDiv } from './TallyAIChatStyles';

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

  // Auto-resize the textarea based on content
  useEffect(() => {
    // We'll handle the auto-resize differently since we can't directly access the textarea
    // This is a placeholder for the functionality
    // In a real implementation, you might need to modify the ChatInput component to accept a ref
  }, [input]);

  return (
    <InputSection>
      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        <form onSubmit={onSubmit} className="w-full">
          <InputWrapper>
            <div className="flex items-center justify-center w-8 h-8 text-indigo-500">
              <Sparkles className="w-4 h-4" />
            </div>
            
            <div className="flex-1">
              <ChatInput
                value={input || ''}
                onChange={onInputChange}
                placeholder="Ask TallyAI..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit(e);
                  }
                }}
                className="w-full min-h-[44px] max-h-[120px] resize-none rounded-full bg-transparent border-0 px-3 py-2 focus:outline-none placeholder:text-gray-400 placeholder:opacity-70 focus:placeholder:opacity-50 transition-colors"
                autoComplete="off"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-9 aspect-square rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:scale-95 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </InputWrapper>
        </form>
      </MotionDiv>
    </InputSection>
  );
}