import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useBusiness } from '../../contexts/BusinessContext';
import { supabase } from '../../lib/supabase';
import { Bot, Save, ArrowLeft } from 'lucide-react';

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

  // Memoize loadSettings to prevent it from changing on every render
  const loadSettings = useCallback(async () => {
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
  }, [selectedBusiness]);

  useEffect(() => {
    if (selectedBusiness) {
      loadSettings();
    }
  }, [selectedBusiness, loadSettings]);

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
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Bot className="h-8 w-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">TallyAI Settings</h1>
          </div>
          <button
            onClick={() => navigate('/tally-ai')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chat
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenAI API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={settings.openai_api_key || ''}
                onChange={(e) =>
                  setSettings({ ...settings, openai_api_key: e.target.value })
                }
                placeholder="sk-..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Get your API key from{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800"
              >
                OpenAI's dashboard
              </a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <select
              value={settings.model}
              onChange={(e) =>
                setSettings({ ...settings, model: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature (Creativity: 0 = Focused, 1 = Creative)
            </label>
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
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>Focused</span>
              <span>{settings.temperature}</span>
              <span>Creative</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Tokens (Response Length)
            </label>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Maximum length of the AI's response (100-4000)
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
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
          </div>
        </div>
      </div>
    </Layout>
  );
}