import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Bot, User, Loader2, Send, ArrowRight } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/ui/button';
import { ChatInput } from '../../components/ui/chat-input';
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
  InputSection,
  InputWrapper,
  SuggestionButton,
  EmptyStateContainer,
  EmptyStateIcon,
  LoadingDots,
  Dot
} from '../../components/tally-ai/TallyAIChatStyles';

const SUGGESTIONS = [
  "Show me a summary of my business finances",
  "Analyze my cash flow trends",
  "List my top debtors",
  "Show recent transactions"
];

export function TallyAIChatPage() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    isLoading,
    input,
    setInput,
    sendMessage,
    selectedBusiness
  } = useTallyAIChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTimestamp = (timestamp: string) => {
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
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await sendMessage(input);
  };

  return (
    <Layout>
      <ChatContainer>
        <Header>
          <div className="flex items-center space-x-3 animate-fade-in-up">
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
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 transition-all duration-200 rounded-full p-2 h-9 w-9 flex items-center justify-center"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </Header>

        <ChatSection>
          <MessagesContainer>
            {messages.length === 0 ? (
              <EmptyStateContainer>
                <EmptyStateIcon>
                  <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 dark:text-indigo-400" />
                </EmptyStateIcon>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>Welcome to TallyAI</h2>
                <p className="text-gray-500 max-w-md mb-6 sm:mb-8 text-sm sm:text-base animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                  I'm your AI assistant for financial analysis and business insights. How can I help you today?
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                  {SUGGESTIONS.map((suggestion, index) => (
                    <SuggestionButton
                      key={index}
                      onClick={() => setInput(suggestion)}
                    >
                      <p className="text-xs sm:text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1" />
                        {suggestion}
                      </p>
                    </SuggestionButton>
                  ))}
                </div>
              </EmptyStateContainer>
            ) : (
              <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto px-2 sm:px-4">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <MessageWrapper style={{ animationDelay: `${index * 0.05}s` }} className="transform transition-all duration-300 hover:translate-y-[-2px]">
                      <Avatar isUser={message.role === 'user'}>
                        {message.role === 'user' ? (
                          <User className="w-3 h-3 sm:w-4 sm:h-4" />
                        ) : (
                          <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                      </Avatar>
                      <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <MessageBubble isUser={message.role === 'user'}>
                          <div className="prose prose-sm max-w-none overflow-hidden">
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
                        <span className="text-[10px] sm:text-xs text-gray-400 mt-1 px-1 opacity-80 transition-opacity duration-200 hover:opacity-100">
                          {formatTimestamp(message.created_at)}
                        </span>
                      </div>
                    </MessageWrapper>
                  </div>
                ))}

                {isLoading && (
                  <div className="animate-fade-in transform transition-all duration-300">
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
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </MessagesContainer>

          <InputSection>
            <form onSubmit={handleSendMessage}>
              <InputWrapper>
                <div className="flex-1">
                  <ChatInput
                    value={input}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                    placeholder="Ask TallyAI about your business finances..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    className="w-full min-h-[40px] sm:min-h-[44px] max-h-[100px] sm:max-h-[120px] resize-none rounded-2xl bg-transparent border-0 px-3 sm:px-4 py-2 sm:py-3 focus:outline-none transition-all placeholder:text-gray-400 placeholder:opacity-70 focus:placeholder:opacity-50"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="h-9 sm:h-11 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 shadow-md transform hover:translate-y-[-1px] active:translate-y-[1px]"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <>
                      <span className="hidden sm:inline">Send</span>
                      <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </>
                  )}
                </Button>
              </InputWrapper>
            </form>
          </InputSection>
        </ChatSection>
      </ChatContainer>
    </Layout>
  );
}