import { router, useLocalSearchParams } from 'expo-router';
import { useCouple, useExpense, useUpsertExpense } from '@/api/expenses';
import { ExpenseForm } from '@/ui/ExpenseForm';
import { Loading } from '@/ui/Screen';
import { useI18n } from '@/i18n';

// 06 · Editar gasto (same form as Nuevo gasto, pre-filled)
export default function EditExpense() {
  const { m } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const couple = useCouple();
  const expense = useExpense(id);
  const save = useUpsertExpense();

  if (!couple.data || !expense.data) {
    return <Loading title={m.expense.editTitle} error={couple.error ?? expense.error} notFound={expense.data === null} />;
  }

  return (
    <ExpenseForm
      key={expense.data.id}
      title={m.expense.editTitle}
      saveLabel={m.expense.saveChanges}
      couple={couple.data}
      initial={expense.data}
      saving={save.isPending}
      error={save.error ? m.expense.saveFailed : null}
      onSave={(input) =>
        save.mutate(input, {
          onSuccess: () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/expense/[id]', params: { id } })),
        })
      }
    />
  );
}
