import { notifyManager } from "@tanstack/react-query";

// React Query batches notifications on a timer by default. Flushing them
// synchronously keeps query state updates inside act() and stops the timer
// from keeping Jest workers alive.
notifyManager.setScheduler((callback) => callback());
