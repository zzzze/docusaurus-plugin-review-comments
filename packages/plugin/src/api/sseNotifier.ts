import type { Response } from "express";

export interface SseNotifier {
  connect(res: Response): void;
  broadcast(docPath: string): void;
  broadcastError(message: string): void;
}

export function createSseNotifier(): SseNotifier {
  const clients = new Set<Response>();

  return {
    connect(res) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      clients.add(res);
      res.on("close", () => clients.delete(res));
    },
    broadcast(docPath) {
      const data = JSON.stringify({ docPath });
      for (const res of clients) {
        res.write(`event: agent:done\ndata: ${data}\n\n`);
      }
    },
    broadcastError(message) {
      const data = JSON.stringify({ message });
      for (const res of clients) {
        res.write(`event: agent:error\ndata: ${data}\n\n`);
      }
    },
  };
}
