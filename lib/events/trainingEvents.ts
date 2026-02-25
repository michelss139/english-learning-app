export type TrainingCompletedEvent =
  | { type: "pack"; slug: string }
  | { type: "cluster"; slug: string }
  | { type: "irregular" };

const CHANNEL_NAME = "training-events";
const WINDOW_EVENT_NAME = "training-events";

function canUseBroadcastChannel(): boolean {
  return typeof window !== "undefined" && typeof window.BroadcastChannel !== "undefined";
}

export function emitTrainingCompleted(event: TrainingCompletedEvent): void {
  if (typeof window === "undefined") return;

  if (canUseBroadcastChannel()) {
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage(event);
      channel.close();
      return;
    } catch {
      // Fallback below
    }
  }

  window.dispatchEvent(new CustomEvent<TrainingCompletedEvent>(WINDOW_EVENT_NAME, { detail: event }));
}

export function subscribeTrainingCompleted(
  handler: (event: TrainingCompletedEvent) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let channel: BroadcastChannel | null = null;
  const onWindowEvent = (raw: Event) => {
    const custom = raw as CustomEvent<TrainingCompletedEvent>;
    if (!custom?.detail) return;
    handler(custom.detail);
  };

  const onChannelMessage = (msg: MessageEvent<TrainingCompletedEvent>) => {
    if (!msg?.data) return;
    handler(msg.data);
  };

  if (canUseBroadcastChannel()) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener("message", onChannelMessage);
    } catch {
      channel = null;
    }
  }

  if (!channel) {
    window.addEventListener(WINDOW_EVENT_NAME, onWindowEvent as EventListener);
  }

  return () => {
    if (channel) {
      channel.removeEventListener("message", onChannelMessage);
      channel.close();
      return;
    }
    window.removeEventListener(WINDOW_EVENT_NAME, onWindowEvent as EventListener);
  };
}
