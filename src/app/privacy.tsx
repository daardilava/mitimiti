import { useI18n } from '@/i18n';
import { LegalScreen } from '@/ui/LegalScreen';

// Política de privacidad · linked from Crea tu cuenta and from Ajustes, so it sits outside both route guards.
export default function Privacy() {
  const { m } = useI18n();
  return <LegalScreen title={m.privacy.title} doc={m.privacy} />;
}
