import { NavButton, Screen, Todo } from '@/ui/Screen';

// 03 · Invitar a la pareja
export default function Invite() {
  return (
    <Screen title="Invita a tu pareja">
      <Todo feature="§1 Auth">Código de 6 caracteres de households.join_code, con Copiar y Compartir.</Todo>
      <NavButton href="/" label="Ir a la app" />
    </Screen>
  );
}
