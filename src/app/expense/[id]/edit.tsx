import { router, useLocalSearchParams } from 'expo-router';
import { useCouple, useExpense, useUpsertExpense } from '@/api/expenses';
import { ExpenseForm } from '@/ui/ExpenseForm';
import { Loading } from '@/ui/Screen';

// 06 · Editar gasto (same form as Nuevo gasto, pre-filled)
export default function EditExpense() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const couple = useCouple();
  const expense = useExpense(id);
  const save = useUpsertExpense();

  if (!couple.data || !expense.data) {
    return <Loading title="Editar gasto" error={couple.error ?? expense.error} notFound={expense.data === null} />;
  }

  return (
    <ExpenseForm
      key={expense.data.id}
      title="Editar gasto"
      saveLabel="Guardar cambios"
      couple={couple.data}
      initial={expense.data}
      saving={save.isPending}
      error={save.error ? 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.' : null}
      onSave={(input) =>
        save.mutate(input, {
          onSuccess: () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/expense/[id]', params: { id } })),
        })
      }
    />
  );
}
