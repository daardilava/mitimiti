import { router } from 'expo-router';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import { NavButton, Screen, Todo } from '@/ui/Screen';

// 02 · Crear cuenta
export default function Setup() {
  const setHousehold = useSessionStore((s) => s.setHousehold);

  const onContinue = () => {
    // TODO(§1): call rpc('create_household', …) with the form values, then store the returned id.
    if (DEV_BYPASS_AUTH) setHousehold('dev');
    router.replace('/invite');
  };

  return (
    <Screen title="Armemos su cuenta" back="back">
      <Todo feature="§1 Auth">Tu nombre, nombre de tu pareja, moneda (COP, EUR, USD) y cómo dividen casi siempre.</Todo>
      <NavButton label="Continuar" onPress={onContinue} />
    </Screen>
  );
}
