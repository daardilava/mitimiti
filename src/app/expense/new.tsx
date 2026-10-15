import { router } from 'expo-router';
import { NavButton, Screen, Todo } from '@/ui/Screen';

// 06 · Nuevo gasto
export default function NewExpense() {
  return (
    <Screen title="Nuevo gasto" back="close">
      <Todo feature="§4 Expenses">
        Monto (parseMoneyInput), descripción, quién pagó, categoría, cómo se divide (splitShares), fecha y vista previa del saldo.
        Guarda con la RPC upsert_expense.
      </Todo>
      <NavButton label="Agregar gasto" onPress={() => router.back()} />
    </Screen>
  );
}
