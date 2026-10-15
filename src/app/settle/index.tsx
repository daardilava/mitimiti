import { NavButton, Screen, Todo } from '@/ui/Screen';

// 09 · Saldar cuentas
export default function Settle() {
  return (
    <Screen title="Saldar cuentas" back="back">
      <Todo feature="§4 Settle up">Quién le paga a quién, monto (todo, la mitad u otro), medio de pago. Registra con la RPC record_settlement.</Todo>
      <NavButton href="/settle/done" label="Registrar pago" />
    </Screen>
  );
}
