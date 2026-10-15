import { NavButton, Screen, Todo } from '@/ui/Screen';

// 11 · Resumen del mes
export default function Summary() {
  return (
    <Screen title="Resumen">
      <Todo feature="§6 Summary">Total compartido, por categoría, quién pagó y lo que le toca a cada quien.</Todo>
      <NavButton href="/budgets" label="Ver presupuestos" kind="secondary" />
    </Screen>
  );
}
