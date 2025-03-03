import React, { useRef } from 'react';
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, Trash2 } from 'lucide-react';
import { ExtendedMessage } from '@/types/conversation';
import { MessageContent } from './MessageContent';
import { LoadingMessage } from './LoadingMessage';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';

type MessageRole = 'user' | 'assistant';

const messageStyles: Record<MessageRole, string> = {
  user: 'text-foreground',
  assistant: 'text-foreground'
};

interface MessageContainerProps {
  messages: ExtendedMessage[];
  searchQuery: string;
  filteredMessages: ExtendedMessage[];
  copiedIndex: number | null;
  copyToClipboard: (content: string, index: number) => void;
  isLoading: boolean;
  isTyping: boolean;
  onClearChat: () => void;
}

export const MessageContainer = React.memo(({ 
  messages,
  searchQuery,
  filteredMessages,
  copiedIndex,
  copyToClipboard,
  isLoading,
  isTyping,
  onClearChat
}: MessageContainerProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  useScrollToBottom(messages, messagesEndRef, isTyping);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin py-3 container mx-auto max-w-full lg:max-w-5xl px-4 md:px-8">
      <div className="flex justify-end mb-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={onClearChat}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear chat
        </Button>
      </div>

      <div className="space-y-4">
        {(searchQuery ? filteredMessages : messages).map((message, index) => (
          <div
            key={message.id || `message-${index}`}
            className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex items-start gap-2 w-full max-w-full lg:max-w-4xl ${
                message.role === 'user' ? 'flex-row-reverse ml-auto' : 'mr-auto'
              }`}
            >
              <Avatar className="h-7 w-7 mt-0.5 flex-shrink-0">
                <AvatarImage
                  src={message.role === 'user' ? "/assets/pritam-img.png" : "/assets/ai-icon.png"}
                  alt={message.role === 'user' ? "User" : "AI"}
                />
              </Avatar>

              <div className={`prose prose-sm prose-zinc dark:prose-invert max-w-none ${
                messageStyles[message.role]
              }`}>
                <MessageContent
                  message={message}
                  index={index}
                  copiedIndex={copiedIndex}
                  onCopy={copyToClipboard}
                />
              </div>
            </div>
          </div>
        ))}
        {isTyping && <LoadingMessage ref={loadingRef} />}
      </div>
      <div ref={messagesEndRef} className="h-px" />
    </div>
  );
});

MessageContainer.displayName = 'MessageContainer';
