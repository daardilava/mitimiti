import { router } from 'expo-router';
import { useCouple, useUpsertExpense } from '@/api/expenses';
import { ExpenseForm } from '@/ui/ExpenseForm';
import { Loading } from '@/ui/Screen';
import { useI18n } from '@/i18n';

// 06 · Nuevo gasto
export default function NewExpense() {
  const { m } = useI18n();
  const couple = useCouple();
  const save = useUpsertExpense();

  if (!couple.data) return <Loading title={m.expense.newTitle} error={couple.error} />;

  return (
    <ExpenseForm
      title={m.expense.newTitle}
      saveLabel={m.expense.add}
      couple={couple.data}
      saving={save.isPending}
      error={save.error ? m.expense.saveFailed : null}
      onSave={(input) =>
        save.mutate(input, {
          onSuccess: (saved) => router.replace({ pathname: '/expense/[id]', params: { id: saved.id } }),
        })
      }
    />
  );
}
