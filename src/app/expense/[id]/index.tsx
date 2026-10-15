import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { formatMoney } from '@/lib/money';
import { sampleExpenses } from '@/lib/sample';
import { NavButton, Screen, Todo } from '@/ui/Screen';
import { type } from '@/ui/tokens';

// 07 · Detalle del gasto
export default function ExpenseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const expense = sampleExpenses.find((e) => e.id === id);

  return (
    <Screen title="Detalle del gasto" back="back">
      {expense && (
        <>
          <Text style={type.row}>{expense.description}</Text>
          <Text style={type.balance}>{formatMoney(expense.amountMinor, 'COP')}</Text>
        </>
      )}
      <Todo feature="§4 Expenses">Quién pagó, parte de cada uno con %, efecto en el saldo, editar y eliminar con confirmación.</Todo>
      <NavButton href={{ pathname: '/expense/[id]/edit', params: { id } }} label="Editar gasto" kind="secondary" />
    </Screen>
  );
}
