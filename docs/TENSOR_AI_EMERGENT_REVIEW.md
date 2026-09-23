# Tensor AI review for Emergent

Branch: `splash-pricing`

Add these website changes. Do not commit API keys.

## Product

- Tensor AI stays a separate member page. The rest of the site stays as it is.
- Scope is gym, fitness, sport, athletics, and training diet only. There is no Builder product.
- Coaching follows The Hutch Touch: Control, Stability, Strength, Power, Expression. Diet is sustainable food that serves training. No crash cuts.
- Two member modes:
  - **Normal** uses DeepSeek (`deepseek-flash`).
  - **Think harder** uses OpenAI (`gpt-5.6-terra`). Do not label that model Terra in the UI.
- If the selected model cannot answer, that reply uses **Grok 4.3** as the filler. Grok is not a third button.

## Host secrets Emergent must set

Set these in the site environment. They are not in git.

| Name | Use |
|---|---|
| `DEEPSEEK_API_KEY` | Normal |
| `OPENAI_API_KEY` | Think harder |
| `XAI_API_KEY` | Filler, Grok 4.3 |
| `GEMINI_API_KEY` | Optional voice / Gemini Flash |

Optional overrides, already defaulted in `app/api/ai/_lib/server.js`:

- `AI_PRIMARY_MODEL=deepseek-flash`
- `AI_FALLBACK_MODEL=gpt-5.6-terra`
- `AI_BACKUP_MODEL=grok-4.3`
- `AI_ENABLE_FALLBACK=true`

## Billing note

The DeepSeek and OpenAI keys were accepted by each provider, but both accounts currently reject chat for lack of credit. Until those accounts are funded, Normal and Think harder will fail over to Grok 4.3 when `XAI_API_KEY` is set.

Grok 4.1 is not available on the current xAI key. The filler id is `grok-4.3`.

## Code already on this branch

- `app/ai/page.tsx` — Normal / Think harder toggle
- `app/api/ai/_lib/server.js` — Hutch Touch prompt, DeepSeek, OpenAI, Grok 4.3 filler
