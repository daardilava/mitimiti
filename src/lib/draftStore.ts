// Hands a draft from Dictar or Escanear to the next screen without putting it in the URL: expense/new reads the
// pending draft once and clears it; the receipt review reads what the scan screen read. Memory only: nothing here
// outlives the app, and the receipt's photo is never in it.
import { create } from 'zustand';
import type { ExpenseDraft } from './expenseDraft';
import type { EntrySource } from './quickSheet';
import type { ReceiptReading } from './receiptDraft';

interface DraftState {
  pending: { draft: ExpenseDraft; source: EntrySource } | null;
  receipt: ReceiptReading | null;
}

export const useDraftStore = create<DraftState>(() => ({ pending: null, receipt: null }));

/** For expense/new: the next form starts from this draft. */
export function handDraft(draft: ExpenseDraft, source: EntrySource): void {
  useDraftStore.setState({ pending: { draft, source } });
}

/** The pending draft, once: it's cleared as it's read, so a later + opens an empty form. */
export function takeDraft(): DraftState['pending'] {
  const { pending } = useDraftStore.getState();
  if (pending) useDraftStore.setState({ pending: null });
  return pending;
}

export function setReceipt(receipt: ReceiptReading | null): void {
  useDraftStore.setState({ receipt });
}
