import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useCouple, useUpsertExpense } from '@/api/expenses';
import { takeDraft, useDraftStore } from '@/lib/draftStore';
import { readDraft as validDraft } from '@/lib/expenseDraft';
import { ExpenseForm } from '@/ui/ExpenseForm';
import { Loading } from '@/ui/Screen';
import { useI18n } from '@/i18n';

// 06 · Nuevo gasto, from the tab bar's +. From Dictar and Escanear (Editar) it starts from their draft, handed over
// through src/lib/draftStore.ts, and remembers how it began.
export default function NewExpense() {
  const { m } = useI18n();
  const couple = useCouple();
  const save = useUpsertExpense();
  // A draft handed over by Dictar / Escanear: read once (pure, so StrictMode's second call sees the same), cleared after.
  const [handed] = useState(() => useDraftStore.getState().pending);
  useEffect(() => {
    if (handed) takeDraft();
  }, [handed]);
  const draft = handed ? validDraft(handed.draft) : undefined;
  const source = handed?.source;

  if (!couple.data) return <Loading title={m.expense.newTitle} error={couple.error} />;

  return (
    <ExpenseForm
      title={m.expense.newTitle}
      saveLabel={m.expense.add}
      couple={couple.data}
      draft={draft}
      saving={save.isPending}
      error={save.error ? m.expense.saveFailed : null}
      onSave={(input) =>
        save.mutate({ ...input, source }, {
          onSuccess: (saved) => router.replace({ pathname: '/expense/[id]', params: { id: saved.id } }),
        })
      }
    />
  );
}
