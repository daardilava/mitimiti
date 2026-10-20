import { Screen, Todo } from '@/ui/Screen';
import { useI18n } from '@/i18n';

// Términos y condiciones · linked from Crea tu cuenta.
export default function Terms() {
  const { m } = useI18n();
  return (
    <Screen title={m.terms.title} back="back">
      <Todo feature="§1 Couple account">{m.terms.todo}</Todo>
    </Screen>
  );
}
