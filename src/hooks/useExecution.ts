import { useCallback } from "react";
import {
  execCode,
  stopExecution,
  startExecution,
} from "../lib/codeExecutionClient";
import { useRunStore, useBlocksStore } from "../store/workspace";

export function useExecution(roomId: string) {
  const { blocks, updateBlock } = useBlocksStore();
  const {
    addOutput,
    updateOutput,
    setIsRunning,
    isRunning,
    setContainerAlive,
  } = useRunStore();

  const assembleCode = useCallback(() => {
    return [...blocks]
      .sort((a, b) => a.position - b.position)
      .map((b) => `# Block ${b.id} (lang=${b.lang})\n${b.content}`)
      .join("\n\n");
  }, [blocks]);

  const execWithRetry = useCallback(
    async (code: string): Promise<string> => {
      try {
        const { output } = await execCode(roomId, code);
        // If exec succeeded, container/session is alive
        setContainerAlive(roomId, true);
        return output;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          /container|not\s*started|missing|no\s*session|room\s*not\s*found/i.test(
            msg
          )
        ) {
          await startExecution(roomId);
          const { output } = await execCode(roomId, code);
          setContainerAlive(roomId, true);
          return output;
        }
        throw err;
      }
    },
    [roomId, setContainerAlive]
  );

  const runAll = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    const runningId = addOutput({
      blockId: undefined,
      command: "run all blocks",
      status: "running",
      output: "",
    });
    const startTime = Date.now();
    try {
      const code = assembleCode();
      const output = await execWithRetry(code);
      const duration = Date.now() - startTime;
      updateOutput(runningId, { status: "completed", output, duration });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      updateOutput(runningId, { status: "failed", error: message });
    } finally {
      setIsRunning(false);
    }
  }, [
    isRunning,
    setIsRunning,
    addOutput,
    updateOutput,
    assembleCode,
    execWithRetry,
  ]);

  const runSingle = useCallback(
    async (blockId: string) => {
      if (isRunning) return;
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;
      setIsRunning(true);
      updateBlock(blockId, { isRunning: true, output: "", error: "" });
      const runningId = addOutput({
        blockId,
        command: `run ${blockId}`,
        status: "running",
        output: "",
      });
      try {
        const output = await execWithRetry(block.content);
        updateBlock(blockId, { isRunning: false, output });
        updateOutput(runningId, { status: "completed", output });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        updateBlock(blockId, { isRunning: false, error: message });
        updateOutput(runningId, { status: "failed", error: message });
      } finally {
        setIsRunning(false);
      }
    },
    [
      isRunning,
      blocks,
      updateBlock,
      addOutput,
      updateOutput,
      setIsRunning,
      execWithRetry,
    ]
  );

  const stop = useCallback(async () => {
    try {
      await stopExecution(roomId);
    } finally {
      setIsRunning(false);
      // Mark as not alive after an explicit stop
      setContainerAlive(roomId, false);
    }
  }, [roomId, setIsRunning, setContainerAlive]);

  return { runAll, runSingle, stop, isRunning };
}
