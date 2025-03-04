import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Bot, User, Loader2 } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/ui/button';
import { ChatInput } from '../../components/ui/chat-input';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase } from '../../lib/supabase';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface TallyAISettings {
  id: string;
  openai_api_key: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
}

interface BusinessData {
  debtors: any[];
  creditors: any[];
  invoices: any[];
  bills: any[];
  payments: any[];
  receipts: any[];
  purchases: any[];
  bank_accounts: any[];
  bank_transactions: any[];
  total_receivable: number;
  total_payable: number;
  total_bank_balance: number;
  recent_transactions: any[];
}

export function TallyAIChatPage() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<TallyAISettings | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedBusiness) {
      loadSettings();
      createNewChat();
      loadBusinessData();
    }
  }, [selectedBusiness]);

  const loadBusinessData = async () => {
    if (!selectedBusiness) return;

    try {
      // Fetch debtors with total outstanding
      const { data: debtors } = await supabase
        .from('debtors')
        .select('*')
        .eq('business_id', selectedBusiness.id);

      // Fetch creditors with total outstanding
      const { data: creditors } = await supabase
        .from('creditors')
        .select('*')
        .eq('business_id', selectedBusiness.id);

      // Fetch invoices with items
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('business_id', selectedBusiness.id);

      // Fetch bills with items
      const { data: bills } = await supabase
        .from('bills')
        .select('*, bill_items(*)')
        .eq('business_id', selectedBusiness.id);

      // Fetch payment receipts
      const { data: receipts } = await supabase
        .from('payment_receipts')
        .select('*')
        .eq('business_id', selectedBusiness.id);

      // Fetch payments
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('business_id', selectedBusiness.id);

      // Fetch purchases
      const { data: purchases } = await supabase
        .from('purchases')
        .select('*')
        .eq('business_id', selectedBusiness.id);

      // Fetch bank accounts
      const { data: bank_accounts } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('business_id', selectedBusiness.id);

      // Fetch recent bank transactions
      const { data: bank_transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          bank_account:bank_accounts(*)
        `)
        .eq('business_id', selectedBusiness.id)
        .order('date', { ascending: false })
        .limit(50);

      // Calculate totals
      const total_receivable = (debtors || []).reduce((sum, debtor) => sum + Number(debtor.outstanding_amount), 0);
      const total_payable = (creditors || []).reduce((sum, creditor) => sum + Number(creditor.outstanding_amount), 0);
      const total_bank_balance = (bank_accounts || []).reduce((sum, account) => sum + Number(account.current_balance), 0);

      // Get recent transactions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recent_transactions = (bank_transactions || [])
        .filter(tx => new Date(tx.date) >= thirtyDaysAgo)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setBusinessData({
        debtors: debtors || [],
        creditors: creditors || [],
        invoices: invoices || [],
        bills: bills || [],
        payments: payments || [],
        receipts: receipts || [],
        purchases: purchases || [],
        bank_accounts: bank_accounts || [],
        bank_transactions: bank_transactions || [],
        total_receivable,
        total_payable,
        total_bank_balance,
        recent_transactions,
      });
    } catch (err) {
      console.error('Error loading business data:', err);
    }
  };

  const loadSettings = async () => {
    if (!selectedBusiness) return;

    try {
      const { data, error } = await supabase
        .from('tally_ai_settings')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (err) {
      console.error('Error loading TallyAI settings:', err);
      // Redirect to settings page if no settings found
      navigate('/tally-ai/settings');
    }
  };

  const createNewChat = async () => {
    if (!selectedBusiness) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('tally_ai_chats')
        .insert({
          business_id: selectedBusiness.id,
          user_id: user.id,
          title: 'New Chat',
        })
        .select()
        .single();

      if (error) throw error;
      setCurrentChatId(data.id);
    } catch (err) {
      console.error('Error creating new chat:', err);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('tally_ai_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  useEffect(() => {
    if (currentChatId) {
      loadMessages(currentChatId);
    }
  }, [currentChatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedBusiness || !currentChatId || !settings?.openai_api_key || !businessData) return;

    try {
      setIsLoading(true);

      // Add user message to the chat
      const { data: userMessage, error: userMessageError } = await supabase
        .from('tally_ai_messages')
        .insert({
          chat_id: currentChatId,
          role: 'user',
          content: input,
        })
        .select()
        .single();

      if (userMessageError) throw userMessageError;

      // Update messages state
      setMessages((prev) => [...prev, userMessage]);
      setInput(""); // Clear input after sending

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.openai_api_key}`,
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            {
              role: 'system',
              content: `You are TallyAI, an AI assistant for the accounting platform AccuBooks. You help users analyze their financial data and provide insights. You have access to their business data through the chat interface.

Current business context:
Business Name: ${selectedBusiness.name}
Business ID: ${selectedBusiness.id}

Business Data Summary:
- Total Bank Balance: $${businessData.total_bank_balance.toFixed(2)}
- Total Receivables: $${businessData.total_receivable.toFixed(2)}
- Total Payables: $${businessData.total_payable.toFixed(2)}
- Number of Bank Accounts: ${businessData.bank_accounts.length}
- Number of Recent Transactions: ${businessData.recent_transactions.length}
- Number of Debtors: ${businessData.debtors.length}
- Number of Creditors: ${businessData.creditors.length}
- Number of Active Invoices: ${businessData.invoices.length}
- Number of Active Bills: ${businessData.bills.length}
- Number of Recent Purchases: ${businessData.purchases.length}

Available Data:
1. Bank Accounts: List of all bank accounts with current balances
2. Bank Transactions: Recent banking transactions with details
3. Debtors: List of people/businesses who owe money
4. Creditors: List of people/businesses to whom money is owed
5. Invoices: All invoices with their line items
6. Bills: All bills with their line items
7. Payment Receipts: Records of payments received
8. Payments: Records of payments made
9. Purchases: Records of items/services purchased

You can analyze this data to:
- Calculate financial ratios and metrics
- Track bank balances and cash flow
- Monitor transaction patterns
- Identify unusual banking activity
- Analyze spending patterns
- Identify trends in receivables and payables
- Provide insights on business performance
- Make recommendations for improving financial health
- Suggest cash flow optimization strategies

Please provide accurate and helpful responses to financial queries, explain complex accounting concepts in simple terms, and maintain a professional yet friendly tone.

Raw Business Data:
${JSON.stringify(businessData, null, 2)}`
            },
            ...messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'user', content: input },
          ],
          temperature: settings.temperature,
          max_tokens: settings.max_tokens,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from OpenAI');
      }

      const aiResponse = await response.json();
      const assistantMessage = aiResponse.choices[0].message.content;

      // Add assistant message to the chat
      const { data: botMessage, error: botMessageError } = await supabase
        .from('tally_ai_messages')
        .insert({
          chat_id: currentChatId,
          role: 'assistant',
          content: assistantMessage,
        })
        .select()
        .single();

      if (botMessageError) throw botMessageError;

      // Update messages state
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error('Error processing message:', err);
      // Handle error appropriately
    } finally {
      setIsLoading(false);
    }
  };



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

  return (
    <Layout>
      <div className="relative h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)] bg-gray-50">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-16 bg-white/80 backdrop-blur-lg border-b border-gray-200/80">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/10 to-indigo-500/20">
              <Bot className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">TallyAI</h1>
              {selectedBusiness && (
                <p className="text-sm text-gray-500 truncate max-w-[200px]">{selectedBusiness.name}</p>
              )}
            </div>
          </div>
          <Button
            onClick={() => navigate('/tally-ai/settings')}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </header>

        {/* Chat Container */}
        <div className="relative flex flex-col h-[calc(100%-4rem)]">
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-full text-center p-4 md:p-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/20 flex items-center justify-center mb-6 rotate-3 transform transition-transform hover:rotate-6">
                  <Bot className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Welcome to TallyAI</h2>
                <p className="text-gray-500 max-w-md mb-8">
                  I'm your AI assistant for financial analysis and business insights. How can I help you today?
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                  {[
                    "Show me a summary of my business finances",
                    "Analyze my cash flow trends",
                    "List my top debtors",
                    "Show recent transactions"
                  ].map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(suggestion)}
                      className="group p-4 text-left rounded-2xl border border-gray-200 bg-white hover:border-indigo-200 hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/50 transition-all duration-200 shadow-sm hover:shadow"
                    >
                      <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{suggestion}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-4xl mx-auto">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex items-start gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          message.role === 'user' 
                            ? 'bg-gradient-to-br from-indigo-500/10 to-indigo-500/20' 
                            : 'bg-gradient-to-br from-gray-100 to-gray-200/80'
                        }`}>
                          {message.role === 'user' ? (
                            <User className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Bot className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                        <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`rounded-2xl px-4 py-2.5 ${
                            message.role === 'user'
                              ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                              : 'bg-white border border-gray-200 shadow-sm'
                          }`}>
                            <div className="prose prose-sm max-w-none">
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
                          </div>
                          <span className="text-xs text-gray-400 mt-1 px-1">
                            {formatTimestamp(message.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="animate-fade-in">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200/80">
                        <Bot className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1 max-w-[85%]">
                        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-indigo-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-indigo-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-indigo-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t bg-white/80 backdrop-blur-lg">
            <form onSubmit={handleSendMessage} className="p-4 max-w-4xl mx-auto">
              <div className="relative flex items-end gap-2">
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
                    className="w-full min-h-[44px] max-h-[120px] resize-none rounded-2xl bg-white border border-gray-200 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all placeholder:text-gray-400"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="h-11 px-5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Send'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
} 