import { serve } from 'https://deno.fresh.dev/std@v9.6.2/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@4.28.0';

// Types for request and response
interface AnalysisRequest {
  businessId: string;
  type: 'bank' | 'creditor' | 'debtor' | 'general';
  entityId?: string;
  timeRange: 'week' | 'month' | 'quarter' | 'year';
  customQuery?: string;
}

interface AnalysisResponse {
  success: boolean;
  data?: {
    title: string;
    summary: string;
    details: Array<{
      label: string;
      value: string;
      trend?: {
        value: number;
        label: string;
        positive: boolean;
      };
    }>;
    chart?: {
      labels: string[];
      values: number[];
    };
  };
  error?: string;
}

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 100, // Maximum requests per window
  windowMs: 60 * 60 * 1000, // 1 hour window
};

// Initialize OpenAI configuration
const openaiConfig = new Configuration({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const openai = new OpenAIApi(openaiConfig);

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Rate limiting implementation using Supabase
async function checkRateLimit(userId: string): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT.windowMs);

  try {
    // Get request count for this user in the current window
    const { count } = await supabaseClient
      .from('api_requests')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', windowStart.toISOString());

    return (count ?? 0) < RATE_LIMIT.maxRequests;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return false;
  }
}

// Record API request
async function recordApiRequest(userId: string): Promise<void> {
  try {
    await supabaseClient
      .from('api_requests')
      .insert({
        user_id: userId,
        endpoint: 'openai-analysis',
      });
  } catch (error) {
    console.error('Error recording API request:', error);
  }
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 5000, // 5 seconds
};

// Retry helper function with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  attempt = 1
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (attempt > RETRY_CONFIG.maxRetries) {
      throw error;
    }

    const delay = Math.min(
      RETRY_CONFIG.initialDelay * Math.pow(2, attempt - 1),
      RETRY_CONFIG.maxDelay
    );

    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(operation, attempt + 1);
  }
}

// Main handler function
serve(async (req: Request) => {
  try {
    // CORS headers
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    });

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers }
      );
    }

    // Get authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers }
      );
    }

    // Verify JWT and get user
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers }
      );
    }

    // Check rate limit
    const withinLimit = await checkRateLimit(user.id);
    if (!withinLimit) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers }
      );
    }

    // Parse request body
    const request: AnalysisRequest = await req.json();

    // Validate request
    if (!request.businessId || !request.type || !request.timeRange) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers }
      );
    }

    // Record API request
    await recordApiRequest(user.id);

    // Fetch relevant data from Supabase based on request type
    const data = await retryWithBackoff(async () => {
      const timeRangeMap = {
        week: '7 days',
        month: '30 days',
        quarter: '90 days',
        year: '365 days'
      };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRangeMap[request.timeRange]));

      switch (request.type) {
        case 'bank':
          return await supabaseClient
            .from('transactions')
            .select(`
              *,
              bank_accounts (
                name
              )
            `)
            .eq('business_id', request.businessId)
            .eq('account_id', request.entityId)
            .gte('date', startDate.toISOString());

        case 'creditor':
          return await supabaseClient
            .from('payments')
            .select('*')
            .eq('business_id', request.businessId)
            .eq('creditor_id', request.entityId)
            .gte('payment_date', startDate.toISOString());

        case 'debtor':
          return await supabaseClient
            .from('payment_receipts')
            .select('*')
            .eq('business_id', request.businessId)
            .eq('debtor_id', request.entityId)
            .gte('payment_date', startDate.toISOString());

        case 'general':
          const [transactions, payments, receipts] = await Promise.all([
            supabaseClient
              .from('transactions')
              .select('*')
              .eq('business_id', request.businessId)
              .gte('date', startDate.toISOString()),
            supabaseClient
              .from('payments')
              .select('*')
              .eq('business_id', request.businessId)
              .gte('payment_date', startDate.toISOString()),
            supabaseClient
              .from('payment_receipts')
              .select('*')
              .eq('business_id', request.businessId)
              .gte('payment_date', startDate.toISOString())
          ]);

          return {
            transactions: transactions.data,
            payments: payments.data,
            receipts: receipts.data
          };
      }
    });

    // Generate analysis prompt based on data and request
    let prompt = '';
    if (request.customQuery) {
      prompt = `Analyze the following financial data and answer this question: "${request.customQuery}"\n\n`;
    } else {
      prompt = `Analyze the following financial data for the last ${request.timeRange} and provide insights:\n\n`;
    }

    prompt += `Data: ${JSON.stringify(data, null, 2)}\n\n`;
    prompt += 'Please provide a detailed analysis including:\n';
    prompt += '1. A clear title for the analysis\n';
    prompt += '2. A summary of key findings\n';
    prompt += '3. Detailed metrics with trends where applicable\n';
    prompt += '4. Any relevant charts or visualizations\n';
    prompt += 'Format the response as a JSON object matching the AnalysisResponse type.';

    // Call OpenAI API with retry logic
    const completion = await retryWithBackoff(() =>
      openai.createChatCompletion({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst AI assistant. Analyze the data and provide insights in the requested format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    );

    // Parse and validate OpenAI response
    const response = JSON.parse(completion.data.choices[0].message?.content || '{}');

    return new Response(
      JSON.stringify({ success: true, data: response }),
      { headers }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});