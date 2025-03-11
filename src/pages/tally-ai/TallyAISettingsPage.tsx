import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase } from '../../lib/supabase';
import { Bot, Save, ArrowLeft, Key, Thermometer, Hash } from 'lucide-react';
import { MotionDiv } from '../../components/tally-ai/TallyAIChatStyles';

interface TallyAISettings {
  id: string;
  openai_api_key: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
}

const AVAILABLE_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Most Capable)' },
  { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo (Faster)' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Balanced)' },
];

export function TallyAISettingsPage() {
  const navigate = useNavigate();
  const { selectedBusiness } = useBusiness();
  const [settings, setSettings] = useState<TallyAISettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (selectedBusiness) {
      loadSettings();
    }
  }, [selectedBusiness]);

  const loadSettings = async () => {
    if (!selectedBusiness) return;

    try {
      const { data, error } = await supabase
        .from('tally_ai_settings')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Settings don't exist yet, create with defaults
        const defaultSettings = {
          business_id: selectedBusiness.id,
          model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 2000,
        };

        const { data: newData, error: createError } = await supabase
          .from('tally_ai_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newData);
      } else if (error) {
        throw error;
      } else {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error loading TallyAI settings:', err);
    }
  };

  const handleSave = async () => {
    if (!selectedBusiness || !settings) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('tally_ai_settings')
        .upsert({
          ...settings,
          business_id: selectedBusiness.id,
        });

      if (error) throw error;
      navigate('/tally-ai');
    } catch (err) {
      console.error('Error saving TallyAI settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 dark:bg-indigo-900/30 shadow-md ring-2 ring-white/80 dark:ring-gray-900/80">
              <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">TallyAI Settings</h1>
          </div>
          <button
            onClick={() => navigate('/tally-ai')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Chat</span>
          </button>
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6 shadow-sm"
        >
          <div className="space-y-6">
            <MotionDiv
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-500" />
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  OpenAI API Key
                </label>
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.openai_api_key || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, openai_api_key: e.target.value })
                  }
                  placeholder="sk-..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:border-indigo-500 dark:focus:border-indigo-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get your API key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                >
                  OpenAI's dashboard
                </a>
              </p>
            </MotionDiv>

            <MotionDiv
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-500" />
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Model
                </label>
              </div>
              <select
                value={settings.model}
                onChange={(e) =>
                  setSettings({ ...settings, model: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:border-indigo-500 dark:focus:border-indigo-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors"
              >
                {AVAILABLE_MODELS.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </MotionDiv>

            <MotionDiv
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-indigo-500" />
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Temperature (Creativity: 0 = Focused, 1 = Creative)
                </label>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    temperature: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-indigo-600 dark:accent-indigo-400"
              />
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Focused</span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400">{settings.temperature}</span>
                <span>Creative</span>
              </div>
            </MotionDiv>

            <MotionDiv
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-indigo-500" />
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Max Tokens (Response Length)
                </label>
              </div>
              <input
                type="number"
                min="100"
                max="4000"
                step="100"
                value={settings.max_tokens}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_tokens: parseInt(e.target.value, 10),
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 focus:border-indigo-500 dark:focus:border-indigo-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Maximum length of the AI's response (100-4000)
              </p>
            </MotionDiv>
          </div>

          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
            className="pt-4"
          >
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 disabled:opacity-50 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Settings
                </>
              )}
            </button>
          </MotionDiv>
        </MotionDiv>
      </div>
    </Layout>
  );
} 