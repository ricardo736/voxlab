/**
 * Gemini API client - uses server proxy in production, direct API in development.
 * In production (Capacitor/Netlify), all calls go through /api/gemini to keep the API key server-side.
 */

interface GeminiRequest {
  prompt: string;
  schema?: Record<string, unknown>;
  model?: string;
}

interface GeminiResponse {
  text: string;
}

const IS_CAPACITOR = typeof (window as any).Capacitor !== 'undefined';
const PROXY_URL = '/api/gemini';

// For Capacitor (mobile), use the hosted Netlify function URL
// Set this to your deployed Netlify URL
const NETLIFY_BASE_URL = ''; // Will be set during build or via env

function getProxyUrl(): string {
  if (IS_CAPACITOR && NETLIFY_BASE_URL) {
    return `${NETLIFY_BASE_URL}${PROXY_URL}`;
  }
  return PROXY_URL;
}

export async function callGemini({ prompt, schema, model = 'gemini-2.0-flash' }: GeminiRequest): Promise<string> {
  const response = await fetch(getProxyUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, schema, model }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  const data: GeminiResponse = await response.json();
  return data.text;
}
