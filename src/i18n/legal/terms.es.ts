// Términos y condiciones de a medias, en español: la versión que vale.
import { LEGAL_CONTACT, type LegalDoc } from './types';

const { owner, email } = LEGAL_CONTACT;

export const termsEs: LegalDoc = {
  effective: 'Vigentes desde el 20 de octubre de 2026',
  intro:
    'Estos términos explican qué es a medias, qué puedes esperar de la app y qué esperamos de quienes la usan. Al crear tu cuenta los aceptas. Si no estás de acuerdo, no uses la app.',
  sections: [
    {
      heading: '1. Quién ofrece la app',
      paragraphs: [
        `a medias es ofrecida por ${owner}, persona natural domiciliada en Colombia ("nosotros"). Puedes escribirnos a ${email}.`,
      ],
    },
    {
      heading: '2. Qué es a medias',
      paragraphs: [
        'a medias ayuda a dos personas a registrar los gastos que comparten, decidir cómo se divide cada uno y ver quién le debe a quién.',
        'La app solo registra. No mueve dinero, no se conecta con bancos ni guarda datos de tarjetas o cuentas. Cuando ustedes saldan cuentas, el pago se hace por fuera de la app y en ella solo queda anotado.',
        'El saldo se calcula con lo que ustedes registran. a medias no es una asesoría financiera, contable, tributaria ni legal.',
      ],
    },
    {
      heading: '3. Tu cuenta',
      paragraphs: [
        'Para usar a medias debes ser mayor de 18 años.',
        'Puedes entrar con correo y contraseña, con Google o con Apple. Danos datos verdaderos, cuida el acceso a tu cuenta y avísanos si crees que alguien más la está usando.',
        'Cada cuenta es personal. Eres responsable de lo que se haga desde ella.',
      ],
    },
    {
      heading: '4. La cuenta en pareja',
      paragraphs: [
        'Cada espacio en a medias es para exactamente dos personas. Tu pareja se une con un código de invitación; compártelo solo con ella.',
        'Las dos personas ven y pueden editar los gastos, los pagos, los presupuestos y los ajustes compartidos. Cada cambio queda registrado, con quién lo hizo y cuándo.',
        'Que el saldo sea correcto depende de que lo registrado sea correcto. Revisen juntos cualquier diferencia: a medias no decide quién tiene la razón.',
      ],
    },
    {
      heading: '5. Uso aceptable',
      paragraphs: [
        'No uses a medias para actividades ilegales, para acosar o engañar a otra persona, ni para registrar datos de alguien sin su autorización.',
        'No intentes acceder a datos de otras parejas, interferir con el servicio ni copiar, descompilar o revender la app.',
      ],
    },
    {
      heading: '6. Precio',
      paragraphs: [
        'Hoy a medias es gratis. Si en el futuro ofrecemos un plan de pago, te lo diremos con anticipación, verás el precio antes de aceptarlo y nunca te cobraremos sin tu aceptación expresa.',
      ],
    },
    {
      heading: '7. Tus datos',
      paragraphs: [
        'Tratamos tus datos personales según la Ley 1581 de 2012 y sus decretos reglamentarios, y la Política de privacidad de a medias. Allí explicamos qué datos guardamos, para qué, con quién los compartimos y cómo ejercer tus derechos.',
        'Puedes borrar tu cuenta cuando quieras desde Ajustes › Cuenta, o escribiéndonos.',
      ],
    },
    {
      heading: '8. El servicio',
      paragraphs: [
        'Trabajamos para que a medias funcione bien y para que sus cálculos sean exactos, pero la app se ofrece tal como está y puede tener fallas o interrupciones. Podemos cambiar, mejorar o retirar funciones.',
        'Si vamos a dejar de ofrecer la app, te avisaremos con al menos 30 días de anticipación para que puedas guardar tu información.',
      ],
    },
    {
      heading: '9. Responsabilidad',
      paragraphs: [
        'En la medida en que la ley lo permita, no respondemos por decisiones o acuerdos entre ustedes basados en la información de la app, ni por pérdidas causadas por datos registrados de forma incorrecta o por el uso indebido de tu cuenta.',
        'Nada en estos términos limita los derechos que te da la Ley 1480 de 2011 (Estatuto del Consumidor) ni otras normas que no se puedan renunciar.',
      ],
    },
    {
      heading: '10. Propiedad intelectual',
      paragraphs: [
        'La app, su diseño, su código y su marca son de su titular. Lo que tú registras es tuyo; nos das permiso de guardarlo y mostrarlo a ti y a tu pareja solo para prestarte el servicio.',
      ],
    },
    {
      heading: '11. Terminación',
      paragraphs: [
        'Puedes dejar de usar a medias y borrar tu cuenta en cualquier momento.',
        'Podemos suspender o cerrar una cuenta que incumpla estos términos. Salvo que haya un riesgo para otras personas o una obligación legal, te avisaremos antes y te explicaremos el motivo.',
      ],
    },
    {
      heading: '12. Cambios a estos términos',
      paragraphs: [
        'Si cambiamos estos términos, actualizaremos la fecha de arriba y te avisaremos en la app antes de que los cambios importantes apliquen. Si sigues usando a medias después de esa fecha, aceptas la nueva versión.',
      ],
    },
    {
      heading: '13. Ley aplicable',
      paragraphs: [
        'Estos términos se rigen por las leyes de la República de Colombia. Si tienes un reclamo, escríbenos primero; si no lo resolvemos, puedes acudir a la Superintendencia de Industria y Comercio o a los jueces de Colombia.',
        'Estos términos se ofrecen en español, inglés y alemán. Si hay diferencias entre versiones, vale la versión en español.',
      ],
    },
  ],
  contact: 'Escribirnos',
};
