import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useBusiness } from '../contexts/BusinessContext';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface TallyAISettings {
  id: string;
  openai_api_key: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
}

export interface BusinessData {
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

export function useTallyAIChat() {
  const { selectedBusiness } = useBusiness();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<TallyAISettings | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [input, setInput] = useState("");

  const loadBusinessData = useCallback(async () => {
    if (!selectedBusiness) return;

    try {
      const { data: debtors } = await supabase
        .from('debtors')
        .select('*')
        .eq('business_id', selectedBusiness.id);

      const { data: creditors } = await supabase
        .from('creditors')
        .select('*')
        .eq('business_id', selectedBusiness.id);

      const { data: invoices } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('business_id', selectedBusiness.id);

      const { data: bills } = await supabase
        .from('bills')
        .select('*, bill_items(*)')
        .eq('business_id', selectedBusiness.id);

      const { data: receipts } = await supabase
        .from('payment_receipts')
        .select('*')
        .eq('business_id', selectedBusiness.id);

      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('business_id', selectedBusiness.id);

      const { data: purchases } = await supabase
        .from('purchases')
        .select('*')
        .eq('business_id', selectedBusiness.id);

      const { data: bank_accounts } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('business_id', selectedBusiness.id);

      const { data: bank_transactions } = await supabase
        .from('transactions')
        .select(`*, bank_account:bank_accounts(*)`)
        .eq('business_id', selectedBusiness.id)
        .order('date', { ascending: false })
        .limit(50);

      const total_receivable = (debtors || []).reduce((sum, debtor) => sum + Number(debtor.outstanding_amount), 0);
      const total_payable = (creditors || []).reduce((sum, creditor) => sum + Number(creditor.outstanding_amount), 0);
      const total_bank_balance = (bank_accounts || []).reduce((sum, account) => sum + Number(account.current_balance), 0);

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
  }, [selectedBusiness]);

  const loadSettings = useCallback(async () => {
    if (!selectedBusiness) return;

    try {
      const { data, error } = await supabase
        .from('tally_ai_settings')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .single();

      if (error) throw error;
      setSettings(data);
      return data;
    } catch (err) {
      console.error('Error loading TallyAI settings:', err);
      return null;
    }
  }, [selectedBusiness]);

  const createNewChat = useCallback(async () => {
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
      return data.id;
    } catch (err) {
      console.error('Error creating new chat:', err);
      return null;
    }
  }, [selectedBusiness]);

  const loadMessages = useCallback(async (chatId: string) => {
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
  }, []);

  const sendMessage = async (input: string) => {
    if (!input.trim() || !selectedBusiness || !currentChatId || !settings?.openai_api_key || !businessData) return;

    try {
      setIsLoading(true);

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

      setMessages((prev) => [...prev, userMessage]);
      setInput("");

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
              content: `You are TallyAI, an AI assistant for the accounting platform AccuBooks. You help users analyze their financial data and provide insights.

Current business context:
${JSON.stringify({ selectedBusiness, businessData }, null, 2)}`
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

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error('Error processing message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusiness) {
      loadSettings();
      createNewChat();
      loadBusinessData();
    }
  }, [selectedBusiness, loadSettings, createNewChat, loadBusinessData]);

  useEffect(() => {
    if (currentChatId) {
      loadMessages(currentChatId);
    }
  }, [currentChatId, loadMessages]);

  return {
    messages,
    isLoading,
    settings,
    businessData,
    input,
    setInput,
    sendMessage,
    selectedBusiness
  };
} 