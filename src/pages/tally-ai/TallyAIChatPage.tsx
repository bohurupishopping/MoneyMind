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
          : 'bg-gradient-to-br from-gray-100 to-gray-200'
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
            : 'bg-gray-100 text-gray-900'
        )}
      >
        <div className="prose prose-sm max-w-none break-words">
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
                      : 'bg-gray-200'
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
                        : 'bg-gray-200'
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
      <span className="text-[10px] sm:text-xs text-gray-500 px-2">
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
      className="flex-shrink-0 rounded-full w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-gray-100 to-gray-200"
    >
      <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
    </Avatar>
    <MessageBubble 
      isUser={false}
      className="rounded-2xl px-4 py-2 sm:px-5 sm:py-3 bg-gray-100"
    >
      <LoadingDots className="flex items-center space-x-1 sm:space-x-2">
        <Dot delay="0ms" className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gray-400 rounded-full" />
        <Dot delay="150ms" className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gray-400 rounded-full" />
        <Dot delay="300ms" className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gray-400 rounded-full" />
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
      // Use requestAnimationFrame to ensure DOM updates are complete
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: messages.length <= 1 ? 'auto' : 'smooth',
          block: 'end'
        });
      });
    }
  }, [messages.length]);

  // Improved scroll handling
  useEffect(() => {
    const timeoutId = setTimeout(scrollToBottom, 100); // Add a small delay to ensure content is rendered
    return () => clearTimeout(timeoutId);
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
        <Header className="sticky top-0 z-10 backdrop-blur-lg bg-gray-50/80 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 shadow-lg ring-2 ring-gray-50">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight">TallyAI</h1>
              {selectedBusiness && (
                <p className="text-xs sm:text-sm text-gray-500 truncate max-w-[150px] sm:max-w-[200px] opacity-80">{selectedBusiness.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <ActionButton 
                onClick={handleClearChat} 
                title="New Chat"
                className="hover:bg-gray-100 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </ActionButton>
            )}
            <ActionButton 
              onClick={() => navigate('/tally-ai/settings')} 
              title="Settings"
              className="hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </ActionButton>
          </div>
        </Header>

        <ChatSection className="flex-1 h-[calc(100vh-4rem)] overflow-hidden">
          <MessagesContainer 
            ref={parentRef}
            className="h-full overflow-y-auto px-4 py-4 space-y-4"
          >
            {messages.length === 0 ? (
              <EmptyStateContainer className="h-full flex flex-col items-center justify-center px-4 py-8 text-center">
                <MotionDiv
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-full max-w-xl mx-auto"
                >
                  <EmptyStateIcon className="mb-4">
                    <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
                  </EmptyStateIcon>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    Welcome to TallyAI
                  </h2>
                  <p className="text-gray-500 max-w-md mx-auto mb-6 text-sm">
                    I'm your AI assistant for financial analysis and business insights.
                  </p>
                  <SuggestionGrid className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
                    {SUGGESTIONS.map((suggestion, index) => (
                      <MotionDiv
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <SuggestionButton
                          onClick={() => setInput(suggestion)}
                          className="w-full p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                        >
                          <p className="text-sm font-medium text-gray-900 line-clamp-2">
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
                className="relative w-full will-change-transform min-h-full"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              >
                {virtualMessages}
                {isLoading && <LoadingMessage />}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </MessagesContainer>
        </ChatSection>
        
        <div className="sticky bottom-0 z-10 bg-gradient-to-t from-gray-50 pt-2 pb-4">
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