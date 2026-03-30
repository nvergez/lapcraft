# AI Editing Assistant — Implementation Plan

## Phase 1: Supabase Integration

### Setup

- Create Supabase project
- Install `@supabase/supabase-js`
- Env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (public), `SUPABASE_SERVICE_ROLE_KEY` (server-only)

### Database

- `profiles` table: `id (uuid, FK auth.users)`, `anthropic_api_key (text)`, `created_at`
- RLS: users can only read/update their own row
- Trigger: auto-create profile on signup

### Auth UI

- Login/signup page (`/login`) — email + password to start, Google OAuth later
- Custom forms using shadcn components (not `@supabase/auth-ui-react`)
- Auth state via Supabase client + React context
- Protect AI chat behind auth (editor itself stays public, no login required to edit files)

### Session Handling

- Supabase client initialized in a shared module
- Server functions validate session via `supabase.auth.getUser()` with the access token
- No SSR session needed — auth is only for the AI feature

---

## Phase 2: API Key Management

- Settings page or modal where user enters their Anthropic API key
- Key stored in `profiles.anthropic_api_key` via Supabase
- Key never touches localStorage or client JS — fetched server-side only
- UI shows masked key (sk-ant-...XXXX) with change/delete actions

---

## Phase 3: Chat Server Function

### Stack

- `ai` (Vercel AI SDK) + `@ai-sdk/anthropic`
- TanStack Start `createServerFn` for the chat endpoint

### Flow

1. Client sends messages + auth token to server function
2. Server validates session, fetches API key from Supabase
3. Server calls Claude via `@ai-sdk/anthropic` with tools defined
4. Streams response back (AI SDK handles SSE)

### Model

- `claude-sonnet-4-6` — fast, cheap, good enough for tool use
- System prompt: role description + activity context (lap names, stats)

---

## Phase 4: Tool Definitions

Tools defined server-side (Zod schemas), executed client-side against the DOM.

| Tool                   | What it does                                     |
| ---------------------- | ------------------------------------------------ |
| `get_laps`             | Returns lap list with names, stats, point counts |
| `get_activity_summary` | Total distance, duration, elevation, lap count   |
| `delete_lap`           | Delete by name or index                          |
| `rename_lap`           | Rename by name or index                          |
| `split_lap`            | Split equally (N parts) or at a distance         |
| `merge_laps`           | Merge two adjacent laps                          |
| `reorder_laps`         | Reorder by name or index list                    |

Client-side `onToolCall` maps tool calls to existing DOM operations. Each tool execution snapshots undo first.

---

## Phase 5: Chat UI

- Collapsible side panel (right side) or bottom drawer
- `useChat` hook from `ai/react` — handles messages, streaming, tool call loop
- Message bubbles (user/assistant)
- Tool call indicators ("Renamed lap 3 to Warm-up")
- Only visible when a file is loaded + user is logged in
- Chat button in the toolbar to open/close

---

## Open Questions

- Rate limiting? (probably not needed initially — user's own key)
- Persist chat history? (probably not — keep it session-scoped)
- Should the assistant auto-call `get_laps` on first message, or inject laps in system prompt?
