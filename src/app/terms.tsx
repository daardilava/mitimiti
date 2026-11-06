import { useI18n } from '@/i18n';
import { LegalScreen } from '@/ui/LegalScreen';

// Términos y condiciones · linked from Crea tu cuenta and from Ajustes, so it sits outside both route guards.
export default function Terms() {
  const { m } = useI18n();
  return <LegalScreen title={m.terms.title} doc={m.terms} />;
}
