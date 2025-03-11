import React, { useRef, useEffect, memo, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Bot, User } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/ui/button';
import ReactMarkdown from 'react-markdown';
import { useTallyAIChat } from '../../hooks/useTallyAIChat';
import {
  ChatContainer,
  Header,
  ChatSection,
  MessagesContainer,
  MessageWrapper,
  Avatar,
  MessageBubble,
  SuggestionButton,
  EmptyStateContainer,
  EmptyStateIcon,
  LoadingDots,
  Dot
} from '../../components/tally-ai/TallyAIChatStyles';

import { FloatingChatInput } from '../../components/tally-ai/FloatingChatInput';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

const SUGGESTIONS = [
  "Show me a summary of my business finances",
  "Analyze my cash flow trends",
  "List my top debtors",
  "Show recent transactions"
];

// Memoized message component for better performance
const Message = memo(({ message, formatTimestamp }: { 
  message: { 
    id: string;
    role: string;
    content: string;
    created_at: string;
  };
  formatTimestamp: (timestamp: string) => string;
}) => (
  <div className="flex w-full animate-fade-in" style={{ justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
    <MessageWrapper>
      <Avatar isUser={message.role === 'user'}>
        {message.role === 'user' ? (
          <User className="w-3 h-3 sm:w-4 sm:h-4" />
        ) : (
          <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
        )}
      </Avatar>
      <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-[85vw] sm:max-w-[75vw] md:max-w-[65vw]`}>
        <MessageBubble isUser={message.role === 'user'}>
          <div className="prose prose-sm max-w-none break-words">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                code: ({ children }) => (
                  <code className="bg-black/5 rounded px-1 py-0.5">{children}</code>
                )
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </MessageBubble>
        <span className="text-[10px] sm:text-xs text-gray-400 mt-1 px-1 opacity-80">
          {formatTimestamp(message.created_at)}
        </span>
      </div>
    </MessageWrapper>
  </div>
));

Message.displayName = 'Message';

const LoadingMessage = memo(() => (
  <MessageWrapper>
    <Avatar isUser={false}>
      <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
    </Avatar>
    <MessageBubble isUser={false}>
      <LoadingDots>
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </LoadingDots>
    </MessageBubble>
  </MessageWrapper>
));

LoadingMessage.displayName = 'LoadingMessage';

export function TallyAIChatPage() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    isLoading,
    input,
    setInput,
    sendMessage,
    selectedBusiness
  } = useTallyAIChat();

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return date.toLocaleDateString();
  }, []);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await sendMessage(input);
  }, [input, sendMessage]);

  const rowVirtualizer = useWindowVirtualizer({
    count: messages.length,
    estimateSize: () => 100,
    overscan: 5,
    scrollingDelay: 50,
  });

  const virtualMessages = useMemo(() => {
    if (messages.length === 0) return null;

    return rowVirtualizer.getVirtualItems().map((virtualRow) => {
      const message = messages[virtualRow.index];
      return (
        <div
          key={message.id}
          data-index={virtualRow.index}
          ref={rowVirtualizer.measureElement}
          style={{
            transform: `translateY(${virtualRow.start}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
          }}
        >
          <Message
            message={message}
            formatTimestamp={formatTimestamp}
          />
        </div>
      );
    });
  }, [messages, rowVirtualizer, formatTimestamp]);

  return (
    <Layout>
      <ChatContainer>
        <Header>
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:bg-indigo-900/30 shadow-md ring-2 ring-white/80">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight">TallyAI</h1>
              {selectedBusiness && (
                <p className="text-xs sm:text-sm text-gray-500 truncate max-w-[150px] sm:max-w-[200px] opacity-80">{selectedBusiness.name}</p>
              )}
            </div>
          </div>
          <Button
            onClick={() => navigate('/tally-ai/settings')}
            variant="ghost"
            size="sm"
            className="text-gray-600 rounded-full p-2 h-9 w-9 flex items-center justify-center"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </Header>

        <ChatSection>
          <MessagesContainer ref={parentRef}>
            {messages.length === 0 ? (
              <EmptyStateContainer>
                <EmptyStateIcon>
                  <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 dark:text-indigo-400" />
                </EmptyStateIcon>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">Welcome to TallyAI</h2>
                <p className="text-gray-500 max-w-md mb-6 sm:mb-8 text-sm sm:text-base">
                  I'm your AI assistant for financial analysis and business insights. How can I help you today?
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {SUGGESTIONS.map((suggestion, index) => (
                    <SuggestionButton
                      key={index}
                      onClick={() => setInput(suggestion)}
                    >
                      <p className="text-xs sm:text-sm font-medium text-gray-900 flex items-center gap-2">
                        {suggestion}
                      </p>
                    </SuggestionButton>
                  ))}
                </div>
              </EmptyStateContainer>
            ) : (
              <div 
                className="relative w-full will-change-transform"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              >
                {virtualMessages}
                {isLoading && <LoadingMessage />}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </MessagesContainer>
        </ChatSection>
        
        <FloatingChatInput
          input={input}
          isLoading={isLoading}
          onInputChange={(e) => setInput(e.target.value)}
          onSubmit={handleSendMessage}
        />
      </ChatContainer>
    </Layout>
  );
}