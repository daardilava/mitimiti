import { router } from 'expo-router';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import { NavButton, Screen, Todo } from '@/ui/Screen';

// 04 · Unirse con código
export default function Join() {
  const setHousehold = useSessionStore((s) => s.setHousehold);

  const onJoin = () => {
    // TODO(§1): call rpc('join_household', { p_code, p_display_name }) and show its error codes.
    if (DEV_BYPASS_AUTH) setHousehold('dev');
    router.replace('/');
  };

  return (
    <Screen title="Únete a tu pareja" back="back">
      <Todo feature="§1 Auth">Campo de código de 6 caracteres con validación mientras se escribe.</Todo>
      <NavButton label="Unirme" onPress={onJoin} />
    </Screen>
  );
}
