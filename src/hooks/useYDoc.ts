import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { socketCollaborationService } from "../lib/socketCollaborationService";

export function useYDoc(notebookId: string | null) {
  const ydocRef = useRef<Y.Doc | null>(null);

  useEffect(() => {
    if (!notebookId) return;

    // The service returns the Y.Doc
    const ydoc = socketCollaborationService.setupYjsDocument(notebookId);
    ydocRef.current = ydoc;

    return () => {
      ydoc.destroy();
      ydocRef.current = null;
    };
  }, [notebookId]);

  return ydocRef.current;
}
