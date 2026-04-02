import type { Response } from "express";

export interface SseNotifier {
  connect(res: Response): void;
  broadcast(docPath: string): void;
  broadcastError(message: string): void;
  broadcastDocChanged(docPath: string): void;
}

export function createSseNotifier(): SseNotifier {
  const clients = new Set<Response>();

  function removeClient(res: Response) {
    clients.delete(res);
  }

  function safeBroadcast(event: string, data: string) {
    const message = `event: ${event}\ndata: ${data}\n\n`;
    for (const res of clients) {
      try {
        if (res.writableEnded || res.destroyed) {
          removeClient(res);
          continue;
        }
        res.write(message);
      } catch {
        removeClient(res);
      }
    }
  }

  return {
    connect(res) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      clients.add(res);
      res.on("close", () => removeClient(res));
      res.on("error", () => removeClient(res));
    },
    broadcast(docPath) {
      safeBroadcast("agent:done", JSON.stringify({ docPath }));
    },
    broadcastError(message) {
      safeBroadcast("agent:error", JSON.stringify({ message }));
    },
    broadcastDocChanged(docPath) {
      safeBroadcast("doc:changed", JSON.stringify({ docPath }));
    },
  };
}
