import OpenAI from "openai";

/**
 * Shared LLM client — points the OpenAI SDK at a LOCAL Ollama server.
 *
 * Ollama exposes an OpenAI-compatible API at http://localhost:11434/v1, so the
 * official `openai` SDK works unchanged: we only swap the baseURL + model.
 * No API key and no cloud calls — everything runs on your machine.
 *
 * Prereqs:
 *   1. Install & run Ollama (https://ollama.com) — it listens on :11434.
 *   2. Pull a tool-capable model, e.g.  `ollama pull llama3.1:8b`
 *      (the writer / human-in-the-loop examples use function calling, which
 *       needs a model that supports tools — llama3.1 and qwen3 do).
 *
 * Override the defaults in a `.env` file at the repo root if you like:
 *   VITE_OLLAMA_BASE_URL=http://localhost:11434/v1
 *   VITE_OLLAMA_MODEL=qwen3:8b
 */
const baseURL = import.meta.env.VITE_OLLAMA_BASE_URL ?? "http://localhost:11434/v1";

/** Default model for every agent in this repo. Change via VITE_OLLAMA_MODEL. */
export const MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? "llama3.1:8b";

export const openai = new OpenAI({
  baseURL,
  // Ollama ignores the key, but the SDK requires a non-empty string.
  apiKey: import.meta.env.VITE_OLLAMA_API_KEY ?? "ollama",
  // Running in the browser so the XState inspector can attach; safe here because
  // the "key" is a dummy and the endpoint is your own localhost server.
  dangerouslyAllowBrowser: true,
});
