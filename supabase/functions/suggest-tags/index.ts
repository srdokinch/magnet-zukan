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

type HuggingFaceImageClassificationResponse = Array<{ label?: string; score?: number }>;
type DeepLTranslationResponse = { translations?: Array<{ text?: string }> };

const HF_IMAGE_CLASSIFICATION_MODEL_ID = "google/vit-base-patch16-224";
const HF_IMAGE_CLASSIFICATION_URL = `https://router.huggingface.co/hf-inference/models/${HF_IMAGE_CLASSIFICATION_MODEL_ID}`;
const DEFAULT_DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";
const MAX_SUGGESTED_TAGS = 3;
const MAX_IMAGE_LABELS = 5;
const MIN_IMAGE_LABEL_SCORE = 0.001;
const MAX_TAG_LENGTH = 12;
const FALLBACK_TAGS = ["陶器", "地中海", "青色"];

const isDebugAiTagsEnabled = () => deno?.env.get("DEBUG_AI_TAGS")?.trim() === "true";

const normalizeImageLabels = (response: unknown) => {
  if (!Array.isArray(response)) {
    return [];
  }

  return (response as HuggingFaceImageClassificationResponse)
    .map((item) => ({
      label: typeof item.label === "string" ? item.label.trim() : "",
      score: typeof item.score === "number" ? item.score : 0,
    }))
    .filter((item) => item.label.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_IMAGE_LABELS);
};

const toTranslationInput = (rawLabel: string) => {
  const normalized = rawLabel
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)[0];
  return normalized ?? rawLabel.trim();
};

const parseJsonBody = (rawBody: string, contentType: string | null, serviceName: string): unknown => {
  const normalizedType = contentType?.toLowerCase() ?? "";
  const shouldParseJson =
    normalizedType.includes("application/json") ||
    normalizedType.includes("application/problem+json");
  if (!shouldParseJson) {
    return { error: `Non-JSON response from ${serviceName}: ${rawBody.slice(0, 200)}` };
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return { error: `Invalid JSON response from ${serviceName}: ${rawBody.slice(0, 200)}` };
  }
};

const extractDeepLTexts = (body: unknown) => {
  if (typeof body !== "object" || body === null) {
    return [];
  }
  const translations = (body as DeepLTranslationResponse).translations;
  if (!Array.isArray(translations)) {
    return [];
  }
  return translations
    .map((item) => (typeof item.text === "string" ? item.text : ""))
    .filter((text) => text.length > 0);
};

const normalizeCandidateTag = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[。！？!?,]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isSentenceLikeTag = (tag: string) => {
  if (tag.length >= 6 && /[はがをにでへと]/u.test(tag)) {
    return true;
  }
  if (/[.。]/u.test(tag)) {
    return true;
  }
  if (/[:：]/u.test(tag)) {
    return true;
  }
  return false;
};

const validateAndNormalizeTags = (raw: string[]) => {
  const unique = new Set<string>();
  for (const candidate of raw) {
    const normalized = normalizeCandidateTag(candidate);
    if (!normalized) {
      continue;
    }
    if (normalized.length > MAX_TAG_LENGTH || isSentenceLikeTag(normalized)) {
      continue;
    }
    unique.add(normalized);
    if (unique.size >= MAX_SUGGESTED_TAGS) {
      break;
    }
  }
  return Array.from(unique);
};

const resolveDeepLApiUrl = () => deno?.env.get("DEEPL_API_URL")?.trim() || DEFAULT_DEEPL_API_URL;

const toErrorPreview = (result: unknown, rawBody: string) => {
  if (typeof result === "object" && result !== null && "error" in result) {
    const errorValue = (result as { error?: unknown }).error;
    if (typeof errorValue === "string") {
      return errorValue.slice(0, 200);
    }
    if (typeof errorValue === "object" && errorValue !== null) {
      if ("message" in errorValue && typeof (errorValue as { message?: unknown }).message === "string") {
        return String((errorValue as { message: string }).message).slice(0, 200);
      }
      return JSON.stringify(errorValue).slice(0, 200);
    }
  }
  return rawBody.slice(0, 200);
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
  const deepLApiKey = deno.env.get("DEEPL_API_KEY");
  if (!deepLApiKey) {
    return new Response(JSON.stringify({ error: "DEEPL_API_KEY is not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const deepLApiUrl = resolveDeepLApiUrl();

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
  const includeDebugInfo = isDebugAiTagsEnabled();

  if (!imageBase64) {
    return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const imageClassificationResponse = await fetch(
      HF_IMAGE_CLASSIFICATION_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${huggingFaceApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: imageBase64,
          parameters: {
            top_k: MAX_IMAGE_LABELS,
          },
          options: {
            wait_for_model: true,
          },
        }),
      },
    );

    const imageResponseContentType = imageClassificationResponse.headers.get("content-type");
    const imageRawBody = await imageClassificationResponse.text();
    const imageResult = parseJsonBody(imageRawBody, imageResponseContentType, "Hugging Face");
    if (!imageClassificationResponse.ok) {
      const errorMessage =
        typeof imageResult === "object" && imageResult !== null && "error" in imageResult
          ? String((imageResult as { error?: unknown }).error ?? "Failed to classify image")
          : "Failed to classify image";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: imageClassificationResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageLabels = normalizeImageLabels(imageResult);
    if (imageLabels.length === 0) {
      return new Response(
        JSON.stringify({
          tags: FALLBACK_TAGS,
          scores: FALLBACK_TAGS.map((tag) => ({ tag, score: 0 })),
          ...(includeDebugInfo
            ? {
                debug: {
                  imageLabels: [],
                  deepl: {
                    apiUrl: deepLApiUrl,
                    labelInputs: [],
                    status: 0,
                    errorPreview: "",
                    rawPreview: "",
                    translatedTexts: [],
                    usedFallback: true,
                  },
                },
              }
            : {}),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const labelInputs = imageLabels
      .filter((item) => item.score >= MIN_IMAGE_LABEL_SCORE)
      .map((item) => ({ input: toTranslationInput(item.label), score: item.score }))
      .slice(0, MAX_SUGGESTED_TAGS)
      .filter((item, index, array) => array.findIndex((other) => other.input === item.input) === index);

    if (labelInputs.length === 0) {
      return new Response(
        JSON.stringify({
          tags: FALLBACK_TAGS,
          scores: FALLBACK_TAGS.map((tag) => ({ tag, score: 0 })),
          ...(includeDebugInfo
            ? {
                debug: {
                  imageLabels,
                  deepl: {
                    apiUrl: deepLApiUrl,
                    labelInputs: [],
                    status: 0,
                    errorPreview: "",
                    rawPreview: "",
                    translatedTexts: [],
                    usedFallback: true,
                  },
                },
              }
            : {}),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const deepLResponse = await fetch(deepLApiUrl, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${deepLApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: labelInputs.map((item) => item.input),
        source_lang: "EN",
        target_lang: "JA",
      }),
    });
    const deepLContentType = deepLResponse.headers.get("content-type");
    const deepLRawBody = await deepLResponse.text();
    const deepLResult = parseJsonBody(deepLRawBody, deepLContentType, "DeepL");
    const deepLErrorPreview = toErrorPreview(deepLResult, deepLRawBody);
    const deepLRawPreview = deepLRawBody.slice(0, 200);
    const translatedTexts = extractDeepLTexts(deepLResult);
    const normalizedTags = validateAndNormalizeTags(translatedTexts);
    const useFallback = !deepLResponse.ok || normalizedTags.length === 0;
    const tags = useFallback ? FALLBACK_TAGS : normalizedTags;
    const scores = tags.map((tag, index) => ({
      tag,
      score: labelInputs[index]?.score ?? 0,
    }));

    return new Response(
      JSON.stringify({
        tags,
        scores,
        ...(includeDebugInfo
          ? {
              debug: {
                imageLabels,
                deepl: {
                  apiUrl: deepLApiUrl,
                  labelInputs,
                  status: deepLResponse.status,
                  errorPreview: deepLResponse.ok ? "" : deepLErrorPreview,
                  rawPreview: deepLRawPreview,
                  translatedTexts,
                  usedFallback: useFallback,
                },
              },
            }
          : {}),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
