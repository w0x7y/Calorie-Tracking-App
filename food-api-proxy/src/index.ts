interface Env {
  CALORIE_NINJAS_API_KEY: string;
}

const CALORIE_NINJAS_URL = "https://api.calorieninjas.com/v1/nutrition";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
} as const;

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

function errorResponse(status: number, message: string): Response {
  return jsonResponse({ error: message }, { status });
}

async function handleNutritionRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim() ?? "";

  if (!query) {
    return errorResponse(400, "Missing required query parameter: query");
  }

  if (!env.CALORIE_NINJAS_API_KEY) {
    return errorResponse(500, "Server is missing CALORIE_NINJAS_API_KEY.");
  }

  const upstreamUrl = `${CALORIE_NINJAS_URL}?query=${encodeURIComponent(query)}`;
  const cache = await caches.open("nutrition-cache");
  const cacheKey = new Request(url.toString(), { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const upstreamResponse = await fetch(upstreamUrl, {
    headers: {
      "X-Api-Key": env.CALORIE_NINJAS_API_KEY,
    },
  });

  const responseText = await upstreamResponse.text();

  if (!upstreamResponse.ok) {
    return errorResponse(
      upstreamResponse.status,
      responseText || "Nutrition lookup failed.",
    );
  }

  const response = new Response(responseText, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "public, max-age=900",
    },
  });

  await cache.put(cacheKey, response.clone());
  return response;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    if (request.method !== "GET") {
      return errorResponse(405, "Method not allowed.");
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return jsonResponse({ ok: true });
    }

    if (url.pathname === "/nutrition") {
      return await handleNutritionRequest(request, env);
    }

    return errorResponse(404, "Not found.");
  },
};
