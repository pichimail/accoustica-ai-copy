/**
 * LLM Client
 *
 * Abstracts all LLM / AI text-generation calls behind a clean interface.
 * Currently wraps the llmService (OpenRouter → OpenAI fallback).
 *
 * Components must use this instead of importing llmService directly or
 * calling base44.integrations.Core.InvokeLLM.
 *
 * TODO_EXPORT_REPLACE_WITH_OPENROUTER:
 *   After export, the OpenRouter SDK or raw fetch() calls replace the
 *   llmService. The interface (llmClient.invoke()) remains identical.
 *
 *   Environment variables needed after export:
 *     OPENROUTER_API_KEY=sk-or-...
 *     OPENROUTER_MODEL=openrouter/auto
 *
 *   Fallback to OpenAI (optional):
 *     VITE_OPENAI_API_KEY=sk-...
 *     VITE_OPENAI_MODEL=gpt-4-turbo-preview
 *
 *   OpenRouter replaces all InvokeLLM-style actions after export:
 *     - Lyrics generation
 *     - Prompt enhancement
 *     - Style generation
 *     - Title generation
 *     - Metadata generation
 *     - Retry repair
 *     - Timestamped lyric approximation
 *     - AI recommendations (For You page)
 */

/**
 * Invoke an LLM with a prompt.
 * Maintains backward compatibility with the InvokeLLM interface.
 *
 * @param {object} params
 * @param {string} params.prompt - Required. The prompt to send.
 * @param {object|null} [params.response_json_schema] - Optional JSON schema for structured output.
 * @param {boolean} [params.add_context_from_internet=false] - Whether to add web context. Only works with certain models.
 * @param {string[]|null} [params.file_urls] - Optional file URLs for vision context.
 * @param {string|null} [params.model] - Optional model override.
 * @param {number} [params.temperature=0.7]
 * @param {number} [params.max_tokens=2000]
 * @returns {Promise<string|object>} - String for plain text, parsed object when response_json_schema is provided.
 */
export async function invoke({ prompt, response_json_schema = null, add_context_from_internet = false, file_urls = null, model = null, temperature = 0.7, max_tokens = 2000 }) {
  // TODO_EXPORT_REPLACE_WITH_OPENROUTER:
  //   Replace the llmService import with a direct OpenRouter fetch() or SDK call.
  //   Keep the same parameter interface for zero component changes.

  if (add_context_from_internet) {
    // Base44 context: web search only works via base44's built-in InvokeLLM
    // TODO_EXPORT_REPLACE_WITH_OPENROUTER:
    //   After export, implement web search by fetching search results separately
    //   and prepending them to the prompt, OR use OpenRouter's web search plugin.
    const { base44 } = await import('@/api/base44Client');
    // TODO_EXPORT_REPLACE_WITH_OPENROUTER:
    //   Replace with: const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {...})
    //   With web search results pre-pended to the system message.
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema,
      add_context_from_internet: true,
      file_urls,
      model,
    });
    return result;
  }

  // Standard LLM call via the universal service
  // TODO_EXPORT_REPLACE_WITH_OPENROUTER:
  //   Replace the entire llmService import and this call with a direct OpenRouter fetch.
  const { llmService } = await import('@/services/llmService');
  return llmService.invoke({
    prompt,
    response_json_schema,
    temperature,
    max_tokens,
    model,
    file_urls,
  });
}

/**
 * Enhance a music generation prompt.
 *
 * @param {string} currentPrompt - The user's current prompt (empty for random generation).
 * @param {number} [maxChars=495] - Max characters for the output.
 * @returns {Promise<string>}
 */
export async function enhancePrompt(currentPrompt, maxChars = 495) {
  // TODO_EXPORT_REPLACE_WITH_OPENROUTER
  const shouldEnhance = (currentPrompt || '').trim().length > 0;
  const result = await invoke({
    prompt: shouldEnhance
      ? `Enhance this music-generation prompt while preserving the user's intent. Make it more specific with mood, arrangement, instrumentation, and sonic texture. Keep it under ${maxChars} characters. Return plain text only.\n\nPrompt: ${currentPrompt}`
      : `Create one vivid music-generation prompt under ${maxChars} characters. Blend one unexpected hook, clear mood, instrumentation, and section flow cues. No markdown.`,
  });
  return String(result || '').slice(0, maxChars);
}

/**
 * Enhance advanced generation inputs (styles + lyrics).
 *
 * @param {string} styles - Current style tags.
 * @param {string} lyrics - Current lyrics/structure.
 * @param {number} [styleMax=995] - Max chars for styles.
 * @param {number} [lyricsMax=4995] - Max chars for lyrics.
 * @returns {Promise<{ styles?: string, lyrics?: string }>}
 */
export async function enhanceAdvanced({ styles, lyrics, styleMax = 995, lyricsMax = 4995 }) {
  // TODO_EXPORT_REPLACE_WITH_OPENROUTER
  const result = await invoke({
    prompt: `Enhance these music generation inputs with stronger clarity and detail. Return JSON with keys styles and lyrics only.\nstyles: ${styles || 'none'}\nlyrics: ${lyrics || 'none'}\nLimit styles to ${styleMax} chars and lyrics to ${lyricsMax} chars.`,
    response_json_schema: {
      type: 'object',
      properties: { styles: { type: 'string' }, lyrics: { type: 'string' } },
      required: ['styles', 'lyrics'],
    },
  });
  return (result && typeof result === 'object') ? result : {};
}

export default {
  invoke,
  enhancePrompt,
  enhanceAdvanced,
};