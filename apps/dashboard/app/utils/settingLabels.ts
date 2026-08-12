/**
 * Map platform credential keys to Settings-facing labels.
 * Never surface raw "env variable" wording in the dashboard.
 */
const SETTING_LABELS: Record<string, string> = {
  META_APP_ID: 'Meta App ID',
  META_APP_SECRET: 'Meta App Secret',
  GOOGLE_CLIENT_ID: 'Google Client ID',
  GOOGLE_CLIENT_SECRET: 'Google Client Secret',
  GOOGLE_ADS_DEVELOPER_TOKEN: 'Google Ads developer token',
  NANGO_SECRET_KEY: 'Nango secret key',
  OPENAI_API_KEY: 'OpenAI API key',
  ANTHROPIC_API_KEY: 'Anthropic API key',
  GEMINI_API_KEY: 'Gemini API key',
  GOOGLE_API_KEY: 'Google AI API key',
}

export function settingLabel(key: string): string {
  if (SETTING_LABELS[key]) return SETTING_LABELS[key]!
  return key
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
