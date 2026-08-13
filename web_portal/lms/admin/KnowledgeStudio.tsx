import React, { useState, useEffect } from 'react';
import api from '../core/api';
import './KnowledgeStudio.css';

type Tab = 'articles' | 'playground' | 'settings';

interface AssistantSettings {
  enableLLMFallback: boolean;
  llmProvider: 'openai' | 'gemini' | 'anthropic' | null;
  llmDailyLimit: number;
  llmMonthlyBudgetInr: number;
  enableSlashCommands: boolean;
  enableContext: boolean;
  enableSuggestions: boolean;
  defaultLanguage: string;
}

export const KnowledgeStudio = () => {
  const [activeTab, setActiveTab] = useState<Tab>('articles');
  const [articles, setArticles] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);

  // Playground state
  const [query, setQuery] = useState('');
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Health state
  const [health, setHealth] = useState<any>(null);

  // Settings state
  const [settings, setSettings] = useState<AssistantSettings>({
    enableLLMFallback: false,
    llmProvider: null,
    llmDailyLimit: 1000,
    llmMonthlyBudgetInr: 500,
    enableSlashCommands: true,
    enableContext: true,
    enableSuggestions: true,
    defaultLanguage: 'en',
  });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (activeTab === 'articles') fetchArticles();
    if (activeTab === 'settings') fetchSettings();
    if (activeTab === 'playground') fetchHealth();
  }, [activeTab]);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchArticles = async () => {
    try {
      const [articlesRes, colsRes] = await Promise.all([
        api.get('/api/kb/articles'),
        api.get('/api/kb/collections'),
      ]);
      setArticles(articlesRes.data.data || []);
      setCollections(colsRes.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/kb/settings');
      const s = res.data.data;
      setSettings({
        enableLLMFallback: s.enableLLMFallback ?? false,
        llmProvider: s.llmProvider ?? null,
        llmDailyLimit: s.llmDailyLimit ?? 1000,
        llmMonthlyBudgetInr: s.llmMonthlyBudgetInr ?? 500,
        enableSlashCommands: s.enableSlashCommands ?? true,
        enableContext: s.enableContext ?? true,
        enableSuggestions: s.enableSuggestions ?? true,
        defaultLanguage: s.defaultLanguage ?? 'en',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await api.get('/api/assistant/health');
      setHealth(res.data.data);
    } catch {
      setHealth({ status: 'error', kb: 'error', llm: 'disabled', provider: null });
    }
  };

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleTestQuery = async () => {
    setPreviewLoading(true);
    setPreviewResult(null);
    try {
      const res = await api.post('/api/assistant/preview', { query });
      setPreviewResult(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setPreviewLoading(false);
    }
  };

  const publishArticle = async (id: string) => {
    try {
      await api.put(`/api/kb/articles/${id}`, { status: 'published' });
      fetchArticles();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    setSettingsSaved(false);
    try {
      const payload: any = { ...settings };
      // Only send API key if the admin actually typed one
      if (apiKeyInput.trim()) {
        payload[`${settings.llmProvider}ApiKey`] = apiKeyInput.trim();
      }
      await api.put('/api/kb/settings', payload);
      setSettingsSaved(true);
      setApiKeyInput('');
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSettingsSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="knowledge-studio">
      <div className="studio-header">
        <h1>Knowledge Studio & Assistant CMS</h1>
        <div className="studio-tabs">
          {(['articles', 'playground', 'settings'] as Tab[]).map(tab => (
            <button
              key={tab}
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'articles' && '📚 Knowledge Base'}
              {tab === 'playground' && '🧪 Playground'}
              {tab === 'settings' && '⚙️ Assistant Settings'}
            </button>
          ))}
        </div>
      </div>

      <div className="studio-content">

        {/* ── ARTICLES TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'articles' && (
          <div className="articles-manager">
            <div className="actions-bar">
              <button className="btn-primary">Create Article</button>
              <button className="btn-secondary">Manage Collections</button>
              {articles.length === 0 && (
                <span className="empty-hint">
                  ℹ️ No articles yet. Create and publish articles to power the chatbot.
                </span>
              )}
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Title (EN)</th>
                  <th>Category</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-row">No knowledge base articles found.</td>
                  </tr>
                ) : (
                  articles.map(a => (
                    <tr key={a.id}>
                      <td>{a.translations?.en?.title}</td>
                      <td>{a.category}</td>
                      <td>v{a.version}</td>
                      <td>
                        <span className={`status-badge ${a.status}`}>{a.status}</span>
                      </td>
                      <td>{a.priority}</td>
                      <td>
                        <button className="btn-text">Edit</button>
                        {a.status !== 'published' && (
                          <button className="btn-text publish" onClick={() => publishArticle(a.id)}>
                            Publish
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── PLAYGROUND TAB ───────────────────────────────────────────────── */}
        {activeTab === 'playground' && (
          <div className="assistant-playground">
            {/* Health Status Bar */}
            {health && (
              <div className={`health-bar health-${health.status}`}>
                <span className="health-item">
                  🗄️ Knowledge Base: <strong>{health.kb}</strong>
                </span>
                <span className="health-item">
                  🤖 LLM: <strong>{health.llm}</strong>
                  {health.provider && ` (${health.provider})`}
                  {health.llmLatencyMs && ` — ${health.llmLatencyMs}ms`}
                </span>
                <span className="health-item">
                  🕐 {new Date(health.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )}

            <div className="playground-panel">
              <h3>Simulate Student Query</h3>
              <p className="playground-hint">
                Tests the full 9-tier pipeline: Slash → Intent → KB → Context → Universal Search → Log → LLM (if enabled)
              </p>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="e.g. 'Where are my history notes?' or '/courses'"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTestQuery()}
                />
                <button onClick={handleTestQuery} disabled={previewLoading || !query.trim()}>
                  {previewLoading ? 'Testing…' : 'Test'}
                </button>
              </div>

              {previewResult && (
                <div className="diagnostics-board">
                  <h4>Pipeline Diagnostics</h4>
                  <div className="metrics">
                    <div className="metric">
                      <label>Matched Tier:</label>
                      <span>{previewResult.diagnostics?.matchedVia}</span>
                    </div>
                    <div className="metric">
                      <label>Confidence:</label>
                      <span>{previewResult.diagnostics?.confidence}%</span>
                    </div>
                    <div className="metric">
                      <label>Latency:</label>
                      <span>{previewResult.diagnostics?.latencyMs}ms</span>
                    </div>
                    <div className="metric">
                      <label>Engine:</label>
                      <span>{previewResult.diagnostics?.engineVersion || 'v1'}</span>
                    </div>
                    <div className="metric">
                      <label>LLM Active:</label>
                      <span>{previewResult.diagnostics?.llmEnabled ? `✅ ${previewResult.diagnostics?.llmProvider}` : '❌ disabled'}</span>
                    </div>
                  </div>

                  <h4>Response Payload</h4>
                  <pre className="json-viewer">
                    {JSON.stringify(previewResult.response, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="settings-panel">
            <h2 className="settings-title">Assistant Settings</h2>

            {/* General */}
            <section className="settings-section">
              <h3>General</h3>
              <div className="settings-row">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.enableSlashCommands}
                    onChange={e => setSettings(s => ({ ...s, enableSlashCommands: e.target.checked }))}
                  />
                  Enable slash commands (/help, /courses, /live…)
                </label>
              </div>
              <div className="settings-row">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.enableContext}
                    onChange={e => setSettings(s => ({ ...s, enableContext: e.target.checked }))}
                  />
                  Enable course context (auto-filter KB articles by active course)
                </label>
              </div>
              <div className="settings-row">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.enableSuggestions}
                    onChange={e => setSettings(s => ({ ...s, enableSuggestions: e.target.checked }))}
                  />
                  Enable suggestion chips
                </label>
              </div>
              <div className="settings-row">
                <label className="settings-label">Default language</label>
                <select
                  value={settings.defaultLanguage}
                  onChange={e => setSettings(s => ({ ...s, defaultLanguage: e.target.value }))}
                  className="settings-select"
                >
                  <option value="en">English</option>
                  <option value="ta">Tamil</option>
                </select>
              </div>
            </section>

            {/* LLM Fallback */}
            <section className="settings-section llm-section">
              <h3>
                🤖 LLM Fallback (Tier 9)
                <span className="tier-badge">Optional</span>
              </h3>
              <p className="section-desc">
                The chatbot works 100% without an LLM using Firestore Knowledge Base.
                Enable LLM only as a last-resort fallback for unanswered questions.
                <br />
                <strong>Note:</strong> The system env var <code>ENABLE_LLM_FALLBACK</code> must also be <code>true</code> for LLM to activate.
              </p>

              <div className="settings-row toggle-row">
                <label className="toggle-label">
                  <div className={`toggle-switch ${settings.enableLLMFallback ? 'on' : 'off'}`}>
                    <input
                      type="checkbox"
                      checked={settings.enableLLMFallback}
                      onChange={e => setSettings(s => ({ ...s, enableLLMFallback: e.target.checked }))}
                    />
                    <span className="toggle-slider" />
                  </div>
                  Enable LLM fallback
                </label>
                {settings.enableLLMFallback && (
                  <span className="llm-warning">⚠️ API costs apply when enabled</span>
                )}
              </div>

              {settings.enableLLMFallback && (
                <div className="llm-config">
                  {/* Provider */}
                  <div className="settings-row">
                    <label className="settings-label">Provider</label>
                    <div className="radio-group">
                      {(['openai', 'gemini', 'anthropic'] as const).map(p => (
                        <label key={p} className="radio-label">
                          <input
                            type="radio"
                            name="llmProvider"
                            value={p}
                            checked={settings.llmProvider === p}
                            onChange={() => setSettings(s => ({ ...s, llmProvider: p }))}
                          />
                          {p === 'openai' && '🟢 OpenAI (GPT-3.5-Turbo)'}
                          {p === 'gemini' && '🔵 Google Gemini (Flash)'}
                          {p === 'anthropic' && '🟠 Anthropic (Claude Haiku)'}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="settings-row">
                    <label className="settings-label">
                      API Key
                      <span className="key-hint"> (write-only — existing key masked)</span>
                    </label>
                    <input
                      type="password"
                      className="settings-input"
                      placeholder="sk-… or AIza… (leave blank to keep existing)"
                      value={apiKeyInput}
                      onChange={e => setApiKeyInput(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  {/* Rate Limits */}
                  <div className="settings-row">
                    <label className="settings-label">Daily request limit</label>
                    <input
                      type="number"
                      className="settings-input settings-input-sm"
                      value={settings.llmDailyLimit}
                      min={1}
                      max={10000}
                      onChange={e => setSettings(s => ({ ...s, llmDailyLimit: parseInt(e.target.value) || 1000 }))}
                    />
                    <span className="input-suffix">requests / day</span>
                  </div>

                  <div className="settings-row">
                    <label className="settings-label">Max monthly budget</label>
                    <span className="currency-prefix">₹</span>
                    <input
                      type="number"
                      className="settings-input settings-input-sm"
                      value={settings.llmMonthlyBudgetInr}
                      min={0}
                      onChange={e => setSettings(s => ({ ...s, llmMonthlyBudgetInr: parseInt(e.target.value) || 0 }))}
                    />
                    <span className="input-suffix">/ month (informational)</span>
                  </div>
                </div>
              )}
            </section>

            {/* Save */}
            <div className="settings-footer">
              <button
                className="btn-primary btn-save"
                onClick={handleSaveSettings}
                disabled={settingsSaving}
              >
                {settingsSaving ? 'Saving…' : '💾 Save Settings'}
              </button>
              {settingsSaved && <span className="save-success">✅ Settings saved!</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


