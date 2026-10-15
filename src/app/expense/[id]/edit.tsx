import { Screen, Todo } from '@/ui/Screen';

// 06 · Editar gasto (same form as Nuevo gasto, pre-filled)
export default function EditExpense() {
  return (
    <Screen title="Editar gasto" back="close">
      <Todo feature="§4 Expenses">Mismo formulario que Nuevo gasto, con los datos del gasto y toInputText para el monto.</Todo>
    </Screen>
  );
}
