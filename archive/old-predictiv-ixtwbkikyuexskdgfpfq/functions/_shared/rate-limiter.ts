import { createClient } from "jsr:@supabase/supabase-js@2";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

export class RateLimiter {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
  }

  async checkRateLimit(
    userId: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const key = `${config.keyPrefix}:${userId}`;

    try {
      const { data: existingRecord, error: fetchError } = await this.supabase
        .from("rate_limits")
        .select("*")
        .eq("key", key)
        .maybeSingle();

      if (fetchError) {
        console.error("Rate limit fetch error:", fetchError);
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetAt: new Date(now + config.windowMs),
        };
      }

      const resetAt = existingRecord?.reset_at
        ? new Date(existingRecord.reset_at)
        : new Date(now + config.windowMs);

      if (!existingRecord || new Date(existingRecord.reset_at) < new Date(now)) {
        const { error: upsertError } = await this.supabase
          .from("rate_limits")
          .upsert({
            key,
            count: 1,
            reset_at: new Date(now + config.windowMs).toISOString(),
            updated_at: new Date(now).toISOString(),
          });

        if (upsertError) {
          console.error("Rate limit upsert error:", upsertError);
        }

        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetAt: new Date(now + config.windowMs),
        };
      }

      const currentCount = existingRecord.count || 0;

      if (currentCount >= config.maxRequests) {
        const resetTime = new Date(existingRecord.reset_at).getTime();
        const retryAfter = Math.ceil((resetTime - now) / 1000);

        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(existingRecord.reset_at),
          retryAfter,
        };
      }

      const { error: updateError } = await this.supabase
        .from("rate_limits")
        .update({
          count: currentCount + 1,
          updated_at: new Date(now).toISOString(),
        })
        .eq("key", key);

      if (updateError) {
        console.error("Rate limit update error:", updateError);
      }

      return {
        allowed: true,
        remaining: config.maxRequests - currentCount - 1,
        resetAt: new Date(existingRecord.reset_at),
      };
    } catch (error) {
      console.error("Rate limiter error:", error);
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: new Date(now + config.windowMs),
      };
    }
  }

  createRateLimitResponse(result: RateLimitResult): Response {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
        resetAt: result.resetAt.toISOString(),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.retryAfter || 60),
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": result.resetAt.toISOString(),
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
        },
      }
    );
  }
}

export const RATE_LIMIT_CONFIGS = {
  AI_CHAT: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    keyPrefix: "ai_chat",
  },
  DOCUMENT_UPLOAD: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
    keyPrefix: "doc_upload",
  },
  HEALTH_DATA: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    keyPrefix: "health_data",
  },
  GENERAL_API: {
    maxRequests: 100,
    windowMs: 60 * 1000,
    keyPrefix: "general_api",
  },
} as const;
