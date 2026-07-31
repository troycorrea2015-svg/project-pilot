export async function readAssistantStream(response, handlers = {}) {
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => ({}))
      : { error: await response.text().catch(() => "") };
    throw new Error(payload?.error || "Su could not respond.");
  }

  if (!contentType.includes("application/x-ndjson") || !response.body) {
    const payload = await response.json();
    handlers.onDone?.(payload);
    return payload;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = null;

  async function processLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    const event = JSON.parse(trimmed);

    if (event.type === "start") {
      handlers.onStart?.(event);
      return;
    }
    if (event.type === "delta") {
      handlers.onDelta?.(event.delta || "", event);
      return;
    }
    if (event.type === "done") {
      completed = event;
      handlers.onDone?.(event);
      return;
    }
    if (event.type === "error") {
      throw new Error(event.error || "Su could not respond.");
    }
  }

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      await processLine(line);
      newline = buffer.indexOf("\n");
    }

    if (done) break;
  }

  if (buffer.trim()) await processLine(buffer);
  if (!completed) throw new Error("Su's response ended before it was complete. Please try again.");
  return completed;
}
