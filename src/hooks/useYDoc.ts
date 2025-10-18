import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { socketCollaborationService } from "../lib/socketCollaborationService";

export function useYDoc(notebookId: string | null) {
  const ydocRef = useRef<Y.Doc | null>(null);

  useEffect(() => {
    if (!notebookId) return;

    // The service returns a Promise<Y.Doc>, so we need to await it
    let ydoc: Y.Doc | null = null;

    socketCollaborationService.setupYjsDocument(notebookId).then((doc) => {
      ydoc = doc;
      ydocRef.current = doc;
    });

    return () => {
      if (ydoc) {
        ydoc.destroy();
      }
      ydocRef.current = null;
    };
  }, [notebookId]);

  return ydocRef.current;
}
