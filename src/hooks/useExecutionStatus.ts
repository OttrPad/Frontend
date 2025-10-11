import { useEffect, useMemo, useRef, useState } from "react";
import { getExecutionStatus, startExecution } from "../lib/codeExecutionClient";

export interface ExecutionStatus {
  venv: "missing" | "building" | "ready" | string;
  container: "starting" | "running" | "stopped" | "error" | string;
}

export function useExecutionStatus(roomId: string) {
  const [status, setStatus] = useState<ExecutionStatus | null>(null);
  const [initializing, setInitializing] = useState(true);
  const pollRef = useRef<number | null>(null);

  // Start the environment immediately on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await startExecution(roomId);
      } catch {
        // start may fail if already started; ignore and continue to poll
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [roomId]);

  // Poll status every ~1.5s
  useEffect(() => {
    let active = true;
    const poll = async () => {
      let shouldContinue = true;
      try {
        const s = await getExecutionStatus(roomId);
        if (active) {
          setStatus({ venv: s.venv, container: s.container });
          // Stop polling once environment is fully ready
          if (s.venv === "ready" && s.container === "running") {
            shouldContinue = false;
          }
        }
      } catch {
        // keep previous status on transient errors
      } finally {
        if (active && shouldContinue) {
          pollRef.current = window.setTimeout(poll, 1500);
        } else if (pollRef.current) {
          clearTimeout(pollRef.current);
          pollRef.current = null;
        }
      }
    };
    poll();
    return () => {
      active = false;
      if (pollRef.current) {
        clearTimeout(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [roomId]);

  const isVenvSettingUp = useMemo(() => {
    return status?.venv === "missing" || status?.venv === "building";
  }, [status]);

  const isReady = useMemo(() => {
    return status?.venv === "ready" && status?.container === "running";
  }, [status]);

  return {
    status,
    initializing,
    isVenvSettingUp,
    isReady,
  } as const;
}
