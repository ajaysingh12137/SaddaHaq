import { useCallback, useEffect, useState } from 'react';

import { kvGet, kvSet } from '../../db/kv';

/** Documents to keep ready before registering. Ticks are stored on this phone only. */
export const CHECKLIST_ITEMS = ['mobile', 'bank'] as const;
export type ChecklistItem = (typeof CHECKLIST_ITEMS)[number];
export type Checklist = Record<ChecklistItem, boolean>;

const KEY = 'eshram.checklist';
const EMPTY: Checklist = { mobile: false, bank: false };

export function useChecklist() {
  const [checklist, setChecklist] = useState<Checklist>(EMPTY);

  useEffect(() => {
    let active = true;
    void kvGet<Partial<Checklist>>(KEY).then(saved => {
      if (active && saved) setChecklist({ ...EMPTY, ...saved });
    });
    return () => {
      active = false;
    };
  }, []);

  const setItem = useCallback((item: ChecklistItem, checked: boolean) => {
    setChecklist(previous => {
      const next = { ...previous, [item]: checked };
      void kvSet(KEY, next);
      return next;
    });
  }, []);

  return { checklist, setItem };
}
