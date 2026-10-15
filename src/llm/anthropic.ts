// Claude (Anthropic) adapter — exposes the same `chat.completions.create(...)`
// surface the XState actors already use, but calls the official @anthropic-ai/sdk
// underneath and normalizes the result back to the OpenAI-shaped
// `{ choices: [{ message }] }` that the machine guards expect.
//
// Usage in an actor (replace the OpenAI client import):
//   import openai from "../../llm/anthropic";
//   const completion = await openai.chat.completions.create({ messages, tools });
//   return completion.choices[0].message;
//
// See LEARNING.md §6 for the full walkthrough and the OpenAI→Anthropic mapping.
//
// Install first:  npm install @anthropic-ai/sdk
// Env (.env.local):
//   VITE_ANTHROPIC_API_KEY=sk-ant-...
//   VITE_ANTHROPIC_MODEL=claude-opus-4-8   # or claude-sonnet-4-6 / claude-haiku-4-5

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true, // demo only — proxy the key through a backend in production
});

const MODEL = import.meta.env.VITE_ANTHROPIC_MODEL ?? "claude-opus-4-8";

type OAIMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

type OAITool = {
  type: "function";
  function: { name: string; description?: string; parameters?: object };
};

const safeParse = (s: string) => {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
};

// OpenAI-shaped history → Anthropic Messages format (system hoisted out).
function toAnthropic(messages: OAIMessage[]) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const out: Anthropic.MessageParam[] = [];

  for (const m of messages) {
    if (m.role === "system") continue;

    if (m.role === "assistant") {
      const blocks: Anthropic.ContentBlockParam[] = [];
      if (m.content) blocks.push({ type: "text", text: m.content });
      for (const tc of m.tool_calls ?? []) {
        blocks.push({
          type: "tool_use",
          id: tc.id,
          name: tc.function.name,
          input: safeParse(tc.function.arguments),
        });
      }
      out.push({ role: "assistant", content: blocks });
    } else if (m.role === "tool") {
      // OpenAI tool result → Anthropic tool_result block inside a user turn
      out.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: m.tool_call_id!,
            content: String(m.content),
          },
        ],
      });
    } else {
      out.push({ role: "user", content: String(m.content ?? "") });
    }
  }

  return { system, messages: out };
}

// Anthropic response → the OpenAI assistant message the FSM reads.
function toOpenAI(resp: Anthropic.Message): OAIMessage {
  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => (b as Anthropic.TextBlock).text)
    .join("");

  const toolUses = resp.content.filter(
    (b) => b.type === "tool_use",
  ) as Anthropic.ToolUseBlock[];

  return {
    role: "assistant",
    content: text || null,
    tool_calls: toolUses.length
      ? toolUses.map((t) => ({
          id: t.id,
          type: "function" as const,
          function: { name: t.name, arguments: JSON.stringify(t.input) },
        }))
      : undefined,
  };
}

// Drop-in replacement for `openai.chat.completions.create`.
export const chat = {
  completions: {
    async create(args: {
      model?: string;
      messages: OAIMessage[];
      tools?: OAITool[];
      tool_choice?: unknown;
    }) {
      const { system, messages } = toAnthropic(args.messages);

      const resp = await client.messages.create({
        model: args.model ?? MODEL,
        max_tokens: 1024, // required by the Messages API
        ...(system ? { system } : {}),
        messages,
        ...(args.tools?.length
          ? {
              tools: args.tools.map((t) => ({
                name: t.function.name,
                description: t.function.description ?? "",
                input_schema:
                  (t.function.parameters as Anthropic.Tool.InputSchema) ?? {
                    type: "object",
                    properties: {},
                  },
              })),
            }
          : {}),
        ...(args.tool_choice === "required"
          ? { tool_choice: { type: "any" as const } }
          : {}),
      });

      return { choices: [{ message: toOpenAI(resp) }] };
    },
  },
};

export default { chat };
