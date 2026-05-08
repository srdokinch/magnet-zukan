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
  candidateTags?: string[];
};

type HuggingFaceZeroShotScore = {
  label?: string;
  score?: number;
};

type HuggingFaceZeroShotResponse =
  | HuggingFaceZeroShotScore[]
  | { error?: string; estimated_time?: number };
type HuggingFaceImageClassificationResponse = Array<{ label?: string; score?: number }>;

const DEFAULT_CANDIDATE_TAGS = [
  "陶器",
  "地中海",
  "青色",
  "海",
  "街並み",
  "風景",
  "食べ物",
  "動物",
  "旅行",
  "カラフル",
];

const HF_IMAGE_CLASSIFICATION_MODEL_ID = "google/vit-base-patch16-224";
const HF_ZERO_SHOT_TEXT_MODEL_ID = "MoritzLaurer/multilingual-MiniLMv2-L6-mnli-xnli";
const HF_IMAGE_CLASSIFICATION_URL = `https://router.huggingface.co/hf-inference/models/${HF_IMAGE_CLASSIFICATION_MODEL_ID}`;
const HF_ZERO_SHOT_TEXT_CLASSIFICATION_URL = `https://router.huggingface.co/hf-inference/models/${HF_ZERO_SHOT_TEXT_MODEL_ID}`;
const MAX_CANDIDATE_TAGS = 30;
const MAX_SUGGESTED_TAGS = 3;
const MAX_IMAGE_LABELS = 5;
const DEFAULT_MIN_SCORE_THRESHOLD = 0.25;

const isDebugAiTagsEnabled = () => deno?.env.get("DEBUG_AI_TAGS")?.trim() === "true";

const resolveMinScoreThreshold = () => {
  const raw = deno?.env.get("AI_TAG_MIN_SCORE_THRESHOLD")?.trim();
  if (!raw) {
    return DEFAULT_MIN_SCORE_THRESHOLD;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_MIN_SCORE_THRESHOLD;
  }
  return Math.min(Math.max(parsed, 0), 1);
};

const normalizeCandidateTags = (tags: unknown) => {
  if (!Array.isArray(tags)) {
    return DEFAULT_CANDIDATE_TAGS;
  }

  const unique = new Set<string>();
  for (const value of tags) {
    if (typeof value !== "string") {
      continue;
    }
    const tag = value.trim();
    if (!tag) {
      continue;
    }
    unique.add(tag);
    if (unique.size >= MAX_CANDIDATE_TAGS) {
      break;
    }
  }

  return unique.size > 0 ? Array.from(unique) : DEFAULT_CANDIDATE_TAGS;
};

const normalizeScores = (response: HuggingFaceZeroShotResponse) => {
  if (!Array.isArray(response)) {
    return [];
  }

  return response
    .map((item) => ({
      tag: typeof item.label === "string" ? item.label.trim() : "",
      score: typeof item.score === "number" ? item.score : 0,
    }))
    .filter((item) => item.tag.length > 0)
    .sort((a, b) => b.score - a.score);
};

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

const parseHuggingFaceBody = (
  rawBody: string,
  contentType: string | null,
): unknown => {
  const normalizedType = contentType?.toLowerCase() ?? "";
  const shouldParseJson =
    normalizedType.includes("application/json") ||
    normalizedType.includes("application/problem+json");
  if (!shouldParseJson) {
    return { error: `Non-JSON response from Hugging Face: ${rawBody.slice(0, 200)}` };
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return { error: `Invalid JSON response from Hugging Face: ${rawBody.slice(0, 200)}` };
  }
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
  const candidateTags = normalizeCandidateTags(body.candidateTags);
  const minScoreThreshold = resolveMinScoreThreshold();
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
    const imageResult = parseHuggingFaceBody(imageRawBody, imageResponseContentType);
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
          tags: [],
          scores: [],
          ...(includeDebugInfo
            ? {
                debug: {
                  imageLabels: [],
                  zeroShotInput: "",
                  candidateTags,
                  minScoreThreshold,
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

    const zeroShotInput = imageLabels.map((item) => item.label).join(", ");

    const zeroShotResponse = await fetch(
      HF_ZERO_SHOT_TEXT_CLASSIFICATION_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${huggingFaceApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: zeroShotInput,
          parameters: {
            candidate_labels: candidateTags,
            multi_label: true,
          },
          options: {
            wait_for_model: true,
          },
        }),
      },
    );

    const zeroShotContentType = zeroShotResponse.headers.get("content-type");
    const zeroShotRawBody = await zeroShotResponse.text();
    const zeroShotResult = parseHuggingFaceBody(zeroShotRawBody, zeroShotContentType);
    if (!zeroShotResponse.ok) {
      const errorMessage =
        typeof zeroShotResult === "object" && zeroShotResult !== null && "error" in zeroShotResult
          ? String((zeroShotResult as { error?: unknown }).error ?? "Failed to score tags")
          : "Failed to score tags";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: zeroShotResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scoredTags = normalizeScores(zeroShotResult as HuggingFaceZeroShotResponse);
    const tags = scoredTags
      .filter((item) => item.score >= minScoreThreshold)
      .slice(0, MAX_SUGGESTED_TAGS)
      .map((item) => item.tag);
    return new Response(
      JSON.stringify({
        tags,
        scores: scoredTags.slice(0, MAX_SUGGESTED_TAGS),
        ...(includeDebugInfo
          ? {
              debug: {
                imageLabels,
                zeroShotInput,
                candidateTags,
                minScoreThreshold,
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
