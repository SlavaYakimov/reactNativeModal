import { type Dispatch, type SetStateAction, useCallback, useState } from "react";

import { useModalController } from "./ModalProvider";

export type UseModalDraftOptions<T> = {
    /** Committed value when the sheet opens (or when `resetKey` changes). */
    initial: T;
    /**
     * When this changes, draft is reset from the current `initial`.
     * Use for sub-views that stay mounted. Omit when the body remounts on each open.
     */
    resetKey?: string | number | boolean | null;
    /** Apply draft to screen/store — called only from `success`. */
    onCommit: (draft: T) => void;
    /** Defaults to closing the whole stack. */
    onClose?: () => void;
};

export type ModalDraftSession<T> = {
    draft: T;
    setDraft: Dispatch<SetStateAction<T>>;
    /** Commit draft, then close. */
    success: () => void;
    /** Close without committing. */
    discard: () => void;
};

/** Draft session for Draft+Confirm modals: edits stay local until `success`. */
export function useModalDraft<T>({
    initial,
    resetKey,
    onCommit,
    onClose,
}: UseModalDraftOptions<T>): ModalDraftSession<T> {
    const controller = useModalController();
    const [draft, setDraft] = useState<T>(initial);

    const [seenResetKey, setSeenResetKey] = useState(resetKey);
    if (resetKey !== seenResetKey) {
        setSeenResetKey(resetKey);
        if (resetKey !== undefined) {
            setDraft(initial);
        }
    }

    const close = useCallback(() => {
        if (onClose) {
            onClose();
        } else {
            controller.close();
        }
    }, [controller, onClose]);

    const success = useCallback(() => {
        onCommit(draft);
        close();
    }, [close, draft, onCommit]);

    const discard = useCallback(() => {
        close();
    }, [close]);

    return { draft, setDraft, success, discard };
}

/** Toggle membership of `id` in a list of ids (multi-select draft helper). */
export function toggleDraftId<Id extends string | number>(prev: Id[], id: Id): Id[] {
    const key = String(id);
    const has = prev.some((x) => String(x) === key);
    return has ? prev.filter((x) => String(x) !== key) : [...prev, id];
}
