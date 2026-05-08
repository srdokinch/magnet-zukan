const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DenoLike = {
  env: { get: (name: string) => string | undefined };
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

const deno = (globalThis as typeof globalThis & { Deno?: DenoLike }).Deno;

type SuggestTagsRequest = {
  imageBase64?: string;
  mimeType?: string;
};

type HuggingFaceCaptionResponse = Array<{ generated_text?: string }> | { error?: string };

const keywordTagMap: Array<{ tag: string; keywords: string[] }> = [
  { tag: "陶器", keywords: ["ceramic", "pottery", "porcelain", "mug", "cup", "plate"] },
  { tag: "地中海", keywords: ["mediterranean", "coast", "seaside", "harbor", "island"] },
  { tag: "青色", keywords: ["blue", "azure", "navy", "sky blue"] },
  { tag: "海", keywords: ["sea", "ocean", "beach", "shore", "wave"] },
  { tag: "街並み", keywords: ["street", "town", "city", "building", "architecture"] },
  { tag: "風景", keywords: ["landscape", "mountain", "nature", "sunset", "view"] },
  { tag: "食べ物", keywords: ["food", "dish", "meal", "dessert", "restaurant"] },
  { tag: "動物", keywords: ["animal", "cat", "dog", "bird", "fish"] },
  { tag: "旅行", keywords: ["travel", "trip", "vacation", "tourism", "souvenir"] },
  { tag: "カラフル", keywords: ["colorful", "vivid", "bright"] },
];

const normalizeCaption = (caption: string) => caption.toLowerCase().replace(/\s+/g, " ").trim();

const toSuggestedTags = (caption: string) => {
  const normalized = normalizeCaption(caption);
  const tags = keywordTagMap
    .filter(({ keywords }) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(({ tag }) => tag);

  const uniqueTags = Array.from(new Set(tags));
  return uniqueTags.slice(0, 3);
};

const decodeBase64 = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

if (!deno) {
  throw new Error("Deno runtime is required for suggest-tags function.");
}

deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const huggingFaceApiKey = deno.env.get("HUGGING_FACE_API_KEY");
  if (!huggingFaceApiKey) {
    return new Response(JSON.stringify({ error: "HUGGING_FACE_API_KEY is not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: SuggestTagsRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const imageBase64 = body.imageBase64?.trim();
  const mimeType = body.mimeType?.trim() || "image/jpeg";

  if (!imageBase64) {
    return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const imageBytes = decodeBase64(imageBase64);
    const response = await fetch(
      "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${huggingFaceApiKey}`,
          "Content-Type": mimeType,
        },
        body: imageBytes,
      },
    );

    const result = (await response.json()) as HuggingFaceCaptionResponse;
    if (!response.ok) {
      const errorMessage = "error" in result ? result.error : "Failed to suggest tags";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const caption = Array.isArray(result) ? result[0]?.generated_text ?? "" : "";
    const tags = toSuggestedTags(caption);
    return new Response(JSON.stringify({ tags, caption }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
