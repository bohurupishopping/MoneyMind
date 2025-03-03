import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, 
  Search, 
  BarChart3, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Building2,
  Users,
  CreditCard,
  Send,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card } from '../../components/shared/Card';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase } from '../../lib/supabase';

type InsightType = 'bank' | 'creditor' | 'debtor' | 'general';
type TimeRange = 'week' | 'month' | 'quarter' | 'year';

type InsightQuery = {
  type: InsightType;
  entityId?: string;
  timeRange: TimeRange;
  customQuery?: string;
};

type InsightResult = {
  title: string;
  summary: string;
  details: {
    label: string;
    value: string;
    trend?: {
      value: number;
      label: string;
      positive: boolean;
    };
  }[];
  chart?: {
    labels: string[];
    values: number[];
  };
};

type Message = {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
};

export function TallyAIPage() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<InsightQuery>({
    type: 'general',
    timeRange: 'month'
  });
  const [customQuery, setCustomQuery] = useState('');
  const [insights, setInsights] = useState<InsightResult | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hi! I'm TallyAI, your financial analysis assistant. Ask me anything about your business finances and I'll help you understand the numbers. For example, you can ask:\n\n- How much did we spend last month?\n- What's our cash flow trend?\n- Who are our top paying customers?\n- Show me a summary of recent transactions",
      timestamp: new Date()
    }
  ]);
  
  // Lists for dropdowns
  const [bankAccounts, setBankAccounts] = useState<{ id: string; name: string }[]>([]);
  const [creditors, setCreditors] = useState<{ id: string; name: string }[]>([]);
  const [debtors, setDebtors] = useState<{ id: string; name: string }[]>([]);
  
  useEffect(() => {
    if (selectedBusiness) {
      fetchEntities();
    }
  }, [selectedBusiness]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const fetchEntities = async () => {
    if (!selectedBusiness) return;
    
    try {
      // Fetch bank accounts
      const { data: bankData } = await supabase
        .from('bank_accounts')
        .select('id, name')
        .eq('business_id', selectedBusiness.id);
      
      setBankAccounts(bankData || []);
      
      // Fetch creditors
      const { data: creditorData } = await supabase
        .from('creditors')
        .select('id, name')
        .eq('business_id', selectedBusiness.id);
      
      setCreditors(creditorData || []);
      
      // Fetch debtors
      const { data: debtorData } = await supabase
        .from('debtors')
        .select('id, name')
        .eq('business_id', selectedBusiness.id);
      
      setDebtors(debtorData || []);
    } catch (err) {
      console.error('Error fetching entities:', err);
    }
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customQuery.trim() || !selectedBusiness) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: customQuery,
      timestamp: new Date()
    };
    
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true
    };
    
    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setCustomQuery('');
    
    try {
      const response = await generateInsights({
        ...query,
        customQuery: userMessage.content
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessage.id 
            ? {
                ...msg,
                content: formatResponse(response.data),
                loading: false
              }
            : msg
        )
      );
      
      setInsights(response.data);
    } catch (err: any) {
      console.error('Error generating insights:', err);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessage.id 
            ? {
                ...msg,
                content: "I'm sorry, I couldn't analyze that right now. Please try again.",
                loading: false
              }
            : msg
        )
      );
      setError('Failed to generate insights. Please try again.');
    }
  };
  
  const formatResponse = (data: InsightResult): string => {
    let response = `${data.title}\n\n${data.summary}\n\n`;
    
    data.details.forEach(detail => {
      response += `${detail.label}: ${detail.value}`;
      if (detail.trend) {
        response += ` (${detail.trend.positive ? '↑' : '↓'} ${detail.trend.value}% ${detail.trend.label})`;
      }
      response += '\n';
    });
    
    return response;
  };
  
  const generateInsights = async (queryParams: InsightQuery) => {
    if (!selectedBusiness) return { error: 'No business selected' };
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          businessId: selectedBusiness.id,
          ...queryParams
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error calling OpenAI function:', err);
      return { error: 'Failed to generate insights' };
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!selectedBusiness) {
    return (
      <Layout>
        <div className="text-center p-6">
          <p className="text-gray-500">Please select or create a business to continue.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="TallyAI"
        subtitle="AI-Powered Financial Insights"
        actionIcon={<Brain className="h-4 w-4 mr-1" />}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Chat Interface */}
          <Card className="flex flex-col h-[calc(100vh-13rem)]">
            {/* Messages Area */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.type === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {message.loading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Analyzing...</span>
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                    )}
                    <div className={`text-xs mt-1 ${message.type === 'user' ? 'text-indigo-200' : 'text-gray-500'}`}>
                      {format(message.timestamp, 'HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input Area */}
            <div className="border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="Ask about your finances..."
                  className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!customQuery.trim() || loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </Card>
        </div>
        
        <div className="space-y-6">
          {/* Analysis Settings */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Analysis Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Analysis Type
                  </label>
                  <select
                    value={query.type}
                    onChange={(e) => setQuery({ ...query, type: e.target.value as InsightType })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="general">General Business Overview</option>
                    <option value="bank">Bank Account Analysis</option>
                    <option value="creditor">Creditor Analysis</option>
                    <option value="debtor">Debtor Analysis</option>
                  </select>
                </div>
                
                {query.type !== 'general' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select {query.type === 'bank' ? 'Account' : query.type === 'creditor' ? 'Creditor' : 'Debtor'}
                    </label>
                    <select
                      value={query.entityId || ''}
                      onChange={(e) => setQuery({ ...query, entityId: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Select --</option>
                      {query.type === 'bank' && bankAccounts.map(account => (
                        <option key={account.id} value={account.id}>{account.name}</option>
                      ))}
                      {query.type === 'creditor' && creditors.map(creditor => (
                        <option key={creditor.id} value={creditor.id}>{creditor.name}</option>
                      ))}
                      {query.type === 'debtor' && debtors.map(debtor => (
                        <option key={debtor.id} value={debtor.id}>{debtor.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Range
                  </label>
                  <select
                    value={query.timeRange}
                    onChange={(e) => setQuery({ ...query, timeRange: e.target.value as TimeRange })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="quarter">Last 90 Days</option>
                    <option value="year">Last 365 Days</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Quick Questions */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Quick Questions</h3>
              
              <div className="space-y-2">
                <button
                  onClick={() => setCustomQuery("What's our total income this month?")}
                  className="w-full text-left p-2 hover:bg-gray-50 rounded-md text-sm text-gray-700"
                >
                  What's our total income this month?
                </button>
                <button
                  onClick={() => setCustomQuery("Show me our biggest expenses")}
                  className="w-full text-left p-2 hover:bg-gray-50 rounded-md text-sm text-gray-700"
                >
                  Show me our biggest expenses
                </button>
                <button
                  onClick={() => setCustomQuery("Who are our top paying customers?")}
                  className="w-full text-left p-2 hover:bg-gray-50 rounded-md text-sm text-gray-700"
                >
                  Who are our top paying customers?
                </button>
                <button
                  onClick={() => setCustomQuery("What's our cash flow trend?")}
                  className="w-full text-left p-2 hover:bg-gray-50 rounded-md text-sm text-gray-700"
                >
                  What's our cash flow trend?
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}