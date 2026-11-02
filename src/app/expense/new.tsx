import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useCouple, useUpsertExpense, type ExpenseInput } from '@/api/expenses';
import { takeDraft, useDraftStore } from '@/lib/draftStore';
import { readDraft as validDraft } from '@/lib/expenseDraft';
import type { EntrySource } from '@/lib/quickSheet';
import { ExpenseForm } from '@/ui/ExpenseForm';
import { Loading } from '@/ui/Screen';
import { useI18n } from '@/i18n';

const SOURCES: readonly EntrySource[] = ['text', 'voice', 'receipt'];

/** The draft quick entry hands over, as a route param. Anything unreadable is ignored: the form starts empty. */
function readDraft(raw: string | undefined): Partial<ExpenseInput> | undefined {
  if (!raw) return undefined;
  try {
    const d = JSON.parse(raw) as Partial<ExpenseInput>;
    return d && typeof d === 'object' ? d : undefined;
  } catch {
    return undefined;
  }
}

// 06 · Nuevo gasto, from the tab bar's +. From quick entry ("Revisar", "Formulario") it starts from that draft, and
// remembers how it began; from Dictar and Escanear (Editar) the draft comes through src/lib/draftStore.ts instead of
// the URL. Without a draft, "Rápido" (top right) switches to quick entry.
export default function NewExpense() {
  const { m } = useI18n();
  const couple = useCouple();
  const save = useUpsertExpense();
  const params = useLocalSearchParams<{ draft?: string; source?: string }>();
  // A draft handed over by Dictar / Escanear: read once (pure, so StrictMode's second call sees the same), cleared after.
  const [handed] = useState(() => useDraftStore.getState().pending);
  useEffect(() => {
    if (handed) takeDraft();
  }, [handed]);
  const fromParam = useMemo(() => readDraft(params.draft), [params.draft]);
  const draft = (handed && validDraft(handed.draft)) || fromParam;
  const source = handed?.source ?? SOURCES.find((s) => s === params.source);

  if (!couple.data) return <Loading title={m.expense.newTitle} error={couple.error} />;

  return (
    <ExpenseForm
      title={m.expense.newTitle}
      saveLabel={m.expense.add}
      couple={couple.data}
      draft={draft}
      saving={save.isPending}
      error={save.error ? m.expense.saveFailed : null}
      headerAction={draft ? undefined : { label: m.expense.quick, accessibilityLabel: m.expense.quickA11y, onPress: () => router.replace('/expense/quick') }}
      onSave={(input) =>
        save.mutate({ ...input, source }, {
          onSuccess: (saved) => router.replace({ pathname: '/expense/[id]', params: { id: saved.id } }),
        })
      }
    />
  );
}
