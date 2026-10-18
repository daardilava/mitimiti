import { router } from 'expo-router';
import { useCouple, useUpsertExpense } from '@/api/expenses';
import { ExpenseForm } from '@/ui/ExpenseForm';
import { Loading } from '@/ui/Screen';

// 06 · Nuevo gasto
export default function NewExpense() {
  const couple = useCouple();
  const save = useUpsertExpense();

  if (!couple.data) return <Loading title="Nuevo gasto" error={couple.error} />;

  return (
    <ExpenseForm
      title="Nuevo gasto"
      saveLabel="Agregar gasto"
      couple={couple.data}
      saving={save.isPending}
      error={save.error ? 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.' : null}
      onSave={(input) =>
        save.mutate(input, {
          onSuccess: (saved) => router.replace({ pathname: '/expense/[id]', params: { id: saved.id } }),
        })
      }
    />
  );
}
