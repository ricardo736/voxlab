const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const ALLOWED_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
const MAX_PROMPT_LENGTH = 10000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });

export default async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: "Service unavailable" }, 500);
  }

  try {
    const { prompt, schema, model } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return jsonResponse({ error: "Missing or empty required field: prompt" }, 400);
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return jsonResponse(
        { error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters` },
        400
      );
    }

    if (!model || typeof model !== "string") {
      return jsonResponse({ error: "Missing required field: model" }, 400);
    }

    if (!ALLOWED_MODELS.includes(model)) {
      return jsonResponse({ error: "Invalid model specified" }, 400);
    }

    // Build the Gemini API request
    const geminiUrl = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`;

    const body: Record<string, unknown> = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    if (schema) {
      body.generationConfig = {
        responseMimeType: "application/json",
        responseSchema: schema,
      };
    }

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!geminiResponse.ok) {
      console.error(`Gemini API error: ${geminiResponse.status}`, await geminiResponse.text());
      return jsonResponse({ error: "AI service error" }, 502);
    }

    const data = await geminiResponse.json();

    // Extract the text from Gemini's response format
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("Empty Gemini response", JSON.stringify(data));
      return jsonResponse({ error: "No content returned from AI service" }, 502);
    }

    return jsonResponse({ text }, 200);
  } catch (error) {
    console.error("Gemini function error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
};
