const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export default async (req: Request) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "API key not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { prompt, schema, model } = await req.json();

    if (!prompt || !model) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: prompt, model" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
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
      const errorText = await geminiResponse.text();
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${geminiResponse.status}`, details: errorText }),
        { status: geminiResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await geminiResponse.json();

    // Extract the text from Gemini's response format
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return new Response(
        JSON.stringify({ error: "No content in Gemini response" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ text }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
