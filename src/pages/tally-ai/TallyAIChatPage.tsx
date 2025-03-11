import React, { useRef, useEffect, memo, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Bot, User, RefreshCw } from 'lucide-react';
import { Layout } from '../../components/Layout';
import ReactMarkdown from 'react-markdown';
import { useTallyAIChat } from '../../hooks/useTallyAIChat';
import {
  ChatContainer,
  Header,
  ChatSection,
  MessagesContainer,
  Avatar,
  MessageBubble,
  SuggestionButton,
  EmptyStateContainer,
  EmptyStateIcon,
  LoadingDots,
  Dot,
  SuggestionGrid,
  ActionButton,
  MotionDiv
} from '../../components/tally-ai/TallyAIChatStyles';

import { FloatingChatInput } from '../../components/tally-ai/FloatingChatInput';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { cn } from '../../lib/utils';

const SUGGESTIONS = [
  "Show me a summary of my business finances",
  "Analyze my cash flow trends",
  "List my top debtors",
  "Show recent transactions",
  "Identify expense patterns",
  "Forecast revenue for next quarter"
];

// Update type definitions for the code component props to match ReactMarkdown's types
type CodeComponentProps = {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

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
  <MotionDiv 
    className={cn(
      "flex w-full items-start space-x-2 sm:space-x-3",
      message.role === 'user' ? 'justify-end flex-row-reverse space-x-reverse sm:space-x-reverse' : 'justify-start'
    )}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Avatar 
      isUser={message.role === 'user'}
      className={cn(
        "flex-shrink-0 rounded-full w-8 h-8 sm:w-10 sm:h-10",
        message.role === 'user' 
          ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white' 
          : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700'
      )}
    >
      {message.role === 'user' ? (
        <User className="w-4 h-4 sm:w-5 sm:h-5" />
      ) : (
        <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
      )}
    </Avatar>
    <div className={cn(
      "flex flex-col max-w-[85%] sm:max-w-[75%] space-y-1",
      message.role === 'user' ? 'items-end' : 'items-start'
    )}>
      <MessageBubble 
        isUser={message.role === 'user'}
        className={cn(
          "rounded-2xl px-4 py-2 sm:px-5 sm:py-3",
          message.role === 'user' 
            ? 'bg-indigo-600 text-white' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        )}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-3 last:mb-0 text-sm sm:text-base">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-3 text-sm sm:text-base">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 text-sm sm:text-base">{children}</ol>,
              li: ({ children }) => <li className="mb-1 text-sm sm:text-base">{children}</li>,
              code: ({ inline, className, children, ...props }: CodeComponentProps) => {
                return !inline ? (
                  <pre className={cn(
                    "rounded-lg p-3 text-xs sm:text-sm font-mono",
                    message.role === 'user' 
                      ? 'bg-indigo-700/50' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  )}>
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code 
                    className={cn(
                      "rounded px-1.5 py-0.5 text-xs sm:text-sm font-mono",
                      message.role === 'user' 
                        ? 'bg-indigo-700/50' 
                        : 'bg-gray-200 dark:bg-gray-700'
                    )} 
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </MessageBubble>
      <span className={cn(
        "text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 px-2",
        message.role === 'user' ? 'text-right' : 'text-left'
      )}>
        {formatTimestamp(message.created_at)}
      </span>
    </div>
  </MotionDiv>
));

Message.displayName = 'Message';

const LoadingMessage = memo(() => (
  <MotionDiv
    className="flex w-full items-start space-x-2 sm:space-x-3 justify-start"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <Avatar 
      isUser={false}
      className="flex-shrink-0 rounded-full w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700"
    >
      <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
    </Avatar>
    <MessageBubble 
      isUser={false}
      className="rounded-2xl px-4 py-2 sm:px-5 sm:py-3 bg-gray-100 dark:bg-gray-800"
    >
      <LoadingDots className="flex items-center space-x-1 sm:space-x-2">
        <Dot delay="0ms" className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full" />
        <Dot delay="150ms" className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full" />
        <Dot delay="300ms" className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full" />
      </LoadingDots>
    </MessageBubble>
  </MotionDiv>
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
  
  const [, setIsMobileView] = useState(window.innerWidth < 640);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 640);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleClearChat = useCallback(() => {
    // This is a placeholder - you would need to implement this function in your useTallyAIChat hook
    // For now, we'll just navigate to refresh the page
    navigate(0);
  }, [navigate]);

  const rowVirtualizer = useWindowVirtualizer({
    count: messages.length,
    estimateSize: () => 100,
    overscan: 5,
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
        <Header className="sticky top-0 z-10 backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30 shadow-lg ring-2 ring-white/80 dark:ring-gray-900/80">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">TallyAI</h1>
              {selectedBusiness && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate max-w-[150px] sm:max-w-[200px] opacity-80">{selectedBusiness.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <ActionButton 
                onClick={handleClearChat} 
                title="New Chat"
                className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </ActionButton>
            )}
            <ActionButton 
              onClick={() => navigate('/tally-ai/settings')} 
              title="Settings"
              className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </ActionButton>
          </div>
        </Header>

        <ChatSection className="flex-1 overflow-hidden relative">
          <MessagesContainer 
            ref={parentRef}
            className="h-full overflow-y-auto px-4 py-6 space-y-6"
          >
            {messages.length === 0 ? (
              <EmptyStateContainer className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
                <MotionDiv
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="max-w-2xl mx-auto"
                >
                  <EmptyStateIcon className="mb-6">
                    <Bot className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600 dark:text-indigo-400" />
                  </EmptyStateIcon>
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Welcome to TallyAI
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8 sm:mb-10 text-sm sm:text-base">
                    I'm your AI assistant for financial analysis and business insights. How can I help you today?
                  </p>
                  <SuggestionGrid className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    {SUGGESTIONS.map((suggestion, index) => (
                      <MotionDiv
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <SuggestionButton
                          onClick={() => setInput(suggestion)}
                          className="w-full p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                        >
                          <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">
                            {suggestion}
                          </p>
                        </SuggestionButton>
                      </MotionDiv>
                    ))}
                  </SuggestionGrid>
                </MotionDiv>
              </EmptyStateContainer>
            ) : (
              <div 
                className="relative w-full will-change-transform"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              >
                {virtualMessages}
                {isLoading && <LoadingMessage />}
                <div ref={messagesEndRef} className="h-16" />
              </div>
            )}
          </MessagesContainer>
        </ChatSection>
        
        <div className="sticky bottom-0 z-10 bg-gradient-to-t from-white dark:from-gray-900 pt-4 pb-6">
          <FloatingChatInput
            input={input}
            isLoading={isLoading}
            onInputChange={(e) => setInput(e.target.value)}
            onSubmit={handleSendMessage}
          />
        </div>
      </ChatContainer>
    </Layout>
  );
}