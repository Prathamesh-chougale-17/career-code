export function scheduleIdleTask(
  task: () => void,
  {
    fallbackDelay = 350,
    timeout = 1200,
  }: { fallbackDelay?: number; timeout?: number } = {},
) {
  const browserWindow =
    typeof window === "undefined"
      ? undefined
      : (window as Window & {
          cancelIdleCallback?: (handle: number) => void;
          requestIdleCallback?: (
            callback: IdleRequestCallback,
            options?: IdleRequestOptions,
          ) => number;
        });

  if (browserWindow?.requestIdleCallback && browserWindow.cancelIdleCallback) {
    const handle = browserWindow.requestIdleCallback(task, { timeout });

    return () => browserWindow.cancelIdleCallback?.(handle);
  }

  const timeoutId = globalThis.setTimeout(task, fallbackDelay);

  return () => globalThis.clearTimeout(timeoutId);
}
