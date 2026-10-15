import { router } from 'expo-router';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { NavButton, Screen, Todo } from '@/ui/Screen';

// 13 · Ajustes
export default function Settings() {
  const setHousehold = useSessionStore((s) => s.setHousehold);

  const signOut = async () => {
    if (DEV_BYPASS_AUTH) setHousehold(null);
    else await supabase.auth.signOut();
    router.replace('/welcome');
  };

  return (
    <Screen title="Ajustes">
      <Todo feature="§7 Settings">Nombres, código de pareja, división predeterminada, moneda, recordatorios y exportar CSV.</Todo>
      <NavButton href="/invite" label="Código de pareja" kind="secondary" />
      <NavButton label="Cerrar sesión" kind="secondary" onPress={signOut} />
    </Screen>
  );
}
