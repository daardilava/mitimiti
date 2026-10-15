import { Screen, Todo } from '@/ui/Screen';

// 12 · Presupuestos
export default function Budgets() {
  return (
    <Screen title="Presupuestos" back="back">
      <Todo feature="§6 Budgets">Límite mensual por categoría con − / +, verde, ámbar y rojo, siempre con texto.</Todo>
    </Screen>
  );
}
