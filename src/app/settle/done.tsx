import { router } from 'expo-router';
import { NavButton, Screen, Todo } from '@/ui/Screen';

// 10 · Pago registrado
export default function SettleDone() {
  return (
    <Screen title="Pago registrado">
      <Todo feature="§4 Settle up">Confirmación con el monto, el medio y el saldo nuevo.</Todo>
      <NavButton label="Volver al inicio" onPress={() => router.dismissTo('/')} />
    </Screen>
  );
}
