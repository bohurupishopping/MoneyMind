import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Paperclip, Mic, CornerDownLeft } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { Button } from '@/components/ui/button';
import { ChatMessageList } from '@/components/ui/chat-message-list';
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from '@/components/ui/chat-bubble';
import { ChatInput } from '@/components/ui/chat-input';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase } from '../../lib/supabase';

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
        .from('bank_transactions')
        .select(`
          *,
          bank_account:bank_accounts(*)
        `)
        .eq('business_id', selectedBusiness.id)
        .order('transaction_date', { ascending: false })
        .limit(50);

      // Calculate totals
      const total_receivable = (debtors || []).reduce((sum, debtor) => sum + Number(debtor.outstanding_amount), 0);
      const total_payable = (creditors || []).reduce((sum, creditor) => sum + Number(creditor.outstanding_amount), 0);
      const total_bank_balance = (bank_accounts || []).reduce((sum, account) => sum + Number(account.current_balance), 0);

      // Get recent transactions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recent_transactions = (bank_transactions || [])
        .filter(tx => new Date(tx.transaction_date) >= thirtyDaysAgo)
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

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

  const handleAttachFile = () => {
    // Implement file attachment functionality
  };

  const handleMicrophoneClick = () => {
    // Implement voice input functionality
  };

  return (
    <Layout>
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">TallyAI Chat</h1>
          <button
            onClick={() => navigate('/tally-ai/settings')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>

        <div className="flex-1 bg-background rounded-lg border shadow-sm flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <ChatMessageList>
              {messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  variant={message.role === 'user' ? 'sent' : 'received'}
                >
                  <ChatBubbleAvatar
                    className="h-8 w-8 shrink-0"
                    src={
                      message.role === 'user'
                        ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop"
                        : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&q=80&crop=faces&fit=crop"
                    }
                    fallback={message.role === 'user' ? "US" : "AI"}
                  />
                  <ChatBubbleMessage
                    variant={message.role === 'user' ? 'sent' : 'received'}
                  >
                    {message.content}
                  </ChatBubbleMessage>
                </ChatBubble>
              ))}

              {isLoading && (
                <ChatBubble variant="received">
                  <ChatBubbleAvatar
                    className="h-8 w-8 shrink-0"
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&q=80&crop=faces&fit=crop"
                    fallback="AI"
                  />
                  <ChatBubbleMessage isLoading />
                </ChatBubble>
              )}
            </ChatMessageList>
          </div>

          <div className="p-4 border-t">
            <form
              onSubmit={handleSendMessage}
              className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring p-1"
            >
              <ChatInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask TallyAI about your business finances..."
                className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center p-3 pt-0 justify-between">
                <div className="flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={handleAttachFile}
                  >
                    <Paperclip className="size-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={handleMicrophoneClick}
                  >
                    <Mic className="size-4" />
                  </Button>
                </div>
                <Button type="submit" size="sm" className="ml-auto gap-1.5" disabled={isLoading || !input.trim()}>
                  Send Message
                  <CornerDownLeft className="size-3.5" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
} 