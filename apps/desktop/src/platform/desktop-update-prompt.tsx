import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { DownloadCloud, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@repo/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";

export function DesktopUpdatePrompt() {
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [contentLength, setContentLength] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState("");
  const updateRef = useRef<Update | null>(null);
  const dismissedVersionRef = useRef<string | null>(null);
  const isInstallingRef = useRef(false);

  useEffect(() => {
    if (import.meta.env.DEV || !isTauriRuntime()) {
      return;
    }

    let disposed = false;

    async function checkForUpdate() {
      if (disposed || updateRef.current || isInstallingRef.current) {
        return;
      }

      try {
        const nextUpdate = await check({ timeout: 30000 });

        if (!nextUpdate) {
          return;
        }

        if (nextUpdate.version === dismissedVersionRef.current) {
          await nextUpdate.close();
          return;
        }

        updateRef.current = nextUpdate;
        setAvailableUpdate(nextUpdate);
        setIsOpen(true);
      } catch (error) {
        console.info("Careeright updater check failed", error);
      }
    }

    const launchTimer = window.setTimeout(checkForUpdate, 3000);
    const interval = window.setInterval(checkForUpdate, 4 * 60 * 60 * 1000);

    return () => {
      disposed = true;
      window.clearTimeout(launchTimer);
      window.clearInterval(interval);
      if (!isInstallingRef.current) {
        void updateRef.current?.close().catch(() => undefined);
      }
    };
  }, []);

  async function dismissUpdate() {
    if (!availableUpdate || isInstalling) {
      return;
    }

    dismissedVersionRef.current = availableUpdate.version;
    updateRef.current = null;
    setIsOpen(false);
    setAvailableUpdate(null);
    setUpdateError("");
    setDownloadedBytes(0);
    setContentLength(null);
    await availableUpdate.close().catch(() => undefined);
  }

  async function installUpdate() {
    if (!availableUpdate) {
      return;
    }

    isInstallingRef.current = true;
    setIsInstalling(true);
    setUpdateError("");
    setDownloadedBytes(0);
    setContentLength(null);

    let downloaded = 0;

    try {
      await availableUpdate.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started") {
          downloaded = 0;
          setDownloadedBytes(0);
          setContentLength(event.data.contentLength ?? null);
          return;
        }

        if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          setDownloadedBytes(downloaded);
        }
      });

      await relaunch();
    } catch (error) {
      isInstallingRef.current = false;
      setIsInstalling(false);
      setUpdateError(getErrorMessage(error));
    }
  }

  const progress =
    contentLength && contentLength > 0
      ? Math.min(100, Math.round((downloadedBytes / contentLength) * 100))
      : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && void dismissUpdate()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <DownloadCloud className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle>Careeright update available</DialogTitle>
          <DialogDescription>
            Version {availableUpdate?.version} is ready. Install it now to keep
            your desktop app current with the latest Careeright release.
          </DialogDescription>
        </DialogHeader>

        {availableUpdate?.body ? (
          <div className="desktop-scroll-hidden max-h-32 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            {availableUpdate.body}
          </div>
        ) : null}

        {isInstalling ? (
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {progress === null ? "Preparing download..." : "Downloading update..."}
              </span>
              {progress === null ? null : (
                <span className="font-medium text-foreground">{progress}%</span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress ?? 18}%` }}
              />
            </div>
          </div>
        ) : null}

        {updateError ? <p className="text-sm text-destructive">{updateError}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={dismissUpdate} disabled={isInstalling}>
            Later
          </Button>
          <Button onClick={installUpdate} disabled={isInstalling}>
            {isInstalling ? (
              <RefreshCw
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <DownloadCloud data-icon="inline-start" aria-hidden="true" />
            )}
            {isInstalling ? "Updating..." : "Update now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}
