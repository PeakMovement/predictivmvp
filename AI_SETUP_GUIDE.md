# AI Provider Setup Guide

This application now supports multiple AI providers instead of relying on the Lovable AI gateway. You can choose between OpenAI, Anthropic Claude, Google Gemini, or use mock mode for development.

## Quick Start

### 1. Choose Your AI Provider

Edit your `.env` file and set:

```bash
VITE_AI_PROVIDER=openai  # or 'anthropic' or 'google'
VITE_AI_MOCK_MODE=false  # set to 'true' to use mock responses
```

### 2. Get an API Key

#### OpenAI (Recommended for Simplicity)
1. Visit https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key and add to `.env`:
```bash
VITE_OPENAI_API_KEY=sk-...your-key-here...
```

**Cost:** ~$0.10 per 1000 requests with GPT-4o-mini (model used)

#### Anthropic Claude
1. Visit https://console.anthropic.com/
2. Sign up and go to API Keys section
3. Create a new key
4. Add to `.env`:
```bash
VITE_AI_PROVIDER=anthropic
VITE_ANTHROPIC_API_KEY=sk-ant-...your-key-here...
```

**Cost:** ~$3 per 1M input tokens, $15 per 1M output tokens

#### Google Gemini
1. Visit https://aistudio.google.com/apikey
2. Create an API key
3. Add to `.env`:
```bash
VITE_AI_PROVIDER=google
VITE_GOOGLE_AI_API_KEY=...your-key-here...
```

**Cost:** Free tier available, then $0.075 per 1M input tokens

### 3. Configure Supabase Edge Functions

The Edge Functions need the same environment variables. Set them in your Supabase dashboard:

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/settings/functions
2. Add these secrets:

```
AI_PROVIDER=openai
OPENAI_API_KEY=your-openai-key-here
AI_MOCK_MODE=false
```

Or use the Supabase CLI:
```bash
supabase secrets set AI_PROVIDER=openai
supabase secrets set OPENAI_API_KEY=your-key-here
supabase secrets set AI_MOCK_MODE=false
```

## Development Mode (No API Key Required)

For testing without spending money on AI API calls:

```bash
VITE_AI_MOCK_MODE=true
```

In Supabase:
```bash
supabase secrets set AI_MOCK_MODE=true
```

This will use pre-defined mock responses for all AI features.

## Features Powered by AI

- **Document Analysis**: Extracts structured data from nutrition plans, medical records, and training programs
- **Health Profile Synthesis**: Combines all document insights into a comprehensive health intelligence profile
- **Yves Recommendations**: Generates personalized, actionable health and training recommendations

## Switching Providers

You can switch providers at any time by updating the environment variables and restarting your application.

### Provider Comparison

| Provider | Best For | Cost | Speed |
|----------|----------|------|-------|
| OpenAI | General use, reliability | Low | Fast |
| Anthropic | Long context, complex analysis | Medium | Medium |
| Google | Free tier, experimentation | Free/Low | Fast |

## Troubleshooting

### "AI provider not configured" error

Make sure you've set both:
1. `VITE_AI_PROVIDER` or `AI_PROVIDER` environment variable
2. The corresponding API key (`VITE_OPENAI_API_KEY`, etc.)

### Edge Functions failing

1. Check Supabase secrets are set correctly
2. Verify API key is valid
3. Check function logs in Supabase dashboard
4. Enable mock mode temporarily to isolate the issue

### Mock mode not working

Ensure `AI_MOCK_MODE=true` is set in both:
- `.env` file (for local development)
- Supabase secrets (for deployed functions)

## Cost Management

### Estimated Monthly Costs (1000 active users)

With OpenAI GPT-4o-mini:
- Document analysis: ~$20/month
- Health profiles: ~$10/month
- Recommendations: ~$15/month

**Total: ~$45/month**

### Tips to Reduce Costs

1. Use mock mode in development
2. Cache AI responses when possible
3. Use Google Gemini's free tier for testing
4. Implement rate limiting per user

## Support

For issues or questions about AI provider setup, check:
- OpenAI docs: https://platform.openai.com/docs
- Anthropic docs: https://docs.anthropic.com
- Google AI docs: https://ai.google.dev/docs
