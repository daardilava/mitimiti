// Política de privacidad y tratamiento de datos personales de MitiMiti, en español: la versión que vale.
// Ley 1581 de 2012 y Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015). Debe decir lo que la app hace de
// verdad: si cambia lo que se guarda o con quién se comparte, cambia este texto y su fecha.
import { LEGAL_CONTACT, type LegalDoc } from './types';

const { owner, email, city } = LEGAL_CONTACT;

export const privacyEs: LegalDoc = {
  effective: 'Vigente desde el 23 de octubre de 2026',
  intro:
    'Esta política explica qué datos personales guarda MitiMiti, para qué, con quién los comparte, cuánto tiempo los conserva y cómo puedes conocerlos, corregirlos o pedir que se borren.',
  sections: [
    {
      heading: '1. Responsable del tratamiento',
      paragraphs: [`${owner}, persona natural con domicilio en ${city}. Correo para todo lo relacionado con tus datos: ${email}.`],
    },
    {
      heading: '2. Qué datos guardamos',
      paragraphs: [
        'De tu cuenta: tu nombre, tu correo y tu contraseña. La contraseña la guarda nuestro proveedor de inicio de sesión de forma cifrada; nosotros nunca la vemos. Si entras con Google o Apple, recibimos de ellos tu nombre, tu correo y un identificador. Por seguridad, el proveedor también registra tus sesiones, el dispositivo y la dirección IP desde la que entras.',
        'De la pareja: el nombre de cada uno (incluido el nombre con el que invitas a tu pareja antes de que se una), el avatar, la moneda, la división predeterminada y el código de invitación.',
        'Lo que ustedes registran: cada gasto (monto, descripción, categoría, fecha, quién pagó y cómo se divide), cada pago entre ustedes (monto, medio y fecha) y los presupuestos.',
        'Un historial de cambios: quién creó, editó o borró cada gasto o pago, y cuándo. También guardamos los intentos de unirse con un código, para evitar abusos.',
        'Si la pareja compra Premium: la tienda (Apple o Google) procesa el pago y nosotros no vemos tu tarjeta ni tus datos de pago. Recibimos, a través de RevenueCat, el estado de la suscripción asociado a tu cuenta: el producto, la tienda, si es una prueba, las fechas de compra, renovación y fin, y los avisos de la tienda sobre esa compra.',
        'En tu teléfono quedan tu sesión, en el almacenamiento seguro del sistema, y tus preferencias de idioma y apariencia.',
        'No pedimos datos sensibles. No guardamos datos bancarios ni de tarjetas, tu ubicación, tus contactos ni tus fotos. Te pedimos no escribir datos sensibles en las descripciones de los gastos.',
      ],
    },
    {
      heading: '3. Para qué los usamos',
      paragraphs: [
        'Para crear tu cuenta y protegerla; para mostrarte a ti y a tu pareja lo que registran y calcular el saldo; para mantener sincronizados los dos teléfonos; para prevenir fraudes y abusos; para responder tus preguntas; para avisarte de cambios en la app o en estos textos, y para cumplir obligaciones legales.',
        'Si compras Premium, usamos el estado de la suscripción para saber si la pareja lo tiene, mostrarlo en Ajustes a los dos y abrir las funciones que incluye.',
        'No vendemos tus datos, no los usamos para publicidad y no creamos perfiles tuyos para terceros.',
      ],
    },
    {
      heading: '4. Tu autorización',
      paragraphs: [
        'Al crear tu cuenta y aceptar esta política, nos autorizas a tratar tus datos para las finalidades anteriores. Puedes revocar esa autorización en cualquier momento borrando tu cuenta o escribiéndonos.',
        'Si registras el nombre de tu pareja antes de que se una, declaras que te autorizó a hacerlo. Cuando se una, aceptará esta política con su propia cuenta.',
      ],
    },
    {
      heading: '5. Con quién los compartimos',
      paragraphs: [
        'Con tu pareja: ve todo lo que se comparte en su espacio, incluido tu nombre y tu avatar.',
        'Con los proveedores que nos ayudan a prestar el servicio, que solo usan tus datos para eso y bajo nuestras instrucciones: Clerk (inicio de sesión, Estados Unidos) y Supabase (base de datos, alojada en Irlanda, Unión Europea). Si entras con Google o Apple, también ellos participan en el inicio de sesión.',
        'Si compran Premium: RevenueCat (gestión de suscripciones, Estados Unidos) recibe tu identificador de cuenta y el estado de la compra, y Apple o Google procesan el pago como responsables de su propia tienda, según sus políticas.',
        'Con autoridades, solo cuando la ley nos obligue.',
      ],
    },
    {
      heading: '6. Transferencia internacional',
      paragraphs: [
        'Tus datos se guardan fuera de Colombia: en Irlanda (Unión Europea) y en Estados Unidos. Son países que la Superintendencia de Industria y Comercio reconoce con un nivel adecuado de protección de datos, y elegimos proveedores con compromisos contractuales de seguridad y confidencialidad.',
      ],
    },
    {
      heading: '7. Cómo los protegemos',
      paragraphs: [
        'Las conexiones van cifradas. En la base de datos, cada fila está protegida para que solo las dos personas de una pareja puedan leerla o cambiarla. Tu sesión se guarda en el almacenamiento seguro del teléfono y cada cambio queda registrado.',
        'Ningún sistema es infalible. Si ocurre un incidente que afecte tus datos, te avisaremos y lo informaremos a la autoridad cuando corresponda.',
      ],
    },
    {
      heading: '8. Cuánto tiempo los conservamos',
      paragraphs: [
        'Mientras tengas una cuenta. Un gasto o pago que borras deja de verse, pero se conserva marcado como borrado mientras exista su pareja, para que el historial de cambios sea completo.',
        'Si borras tu cuenta, borramos tu cuenta de inicio de sesión, tu perfil y todo el espacio de la pareja: sus gastos, pagos, presupuestos e historial, también para tu pareja. La app te lo advierte antes de confirmar.',
        'Los avisos de compra que guardamos de ti se borran con tu cuenta. RevenueCat, Apple y Google conservan sus propios registros de la compra según sus políticas y las obligaciones legales que tengan (por ejemplo, contables).',
        'Las copias de seguridad de nuestros proveedores pueden conservar esos datos hasta 30 días más, hasta que se reemplazan. Solo guardaremos algo por más tiempo si la ley nos obliga.',
      ],
    },
    {
      heading: '9. Tus derechos',
      paragraphs: [
        'Según la Ley 1581 de 2012 puedes: conocer, actualizar y rectificar tus datos; pedir prueba de tu autorización; saber cómo los usamos; revocar la autorización y pedir que los borremos; presentar quejas ante la Superintendencia de Industria y Comercio después de habernos consultado, y acceder a tus datos gratis.',
        'Si vives en la Unión Europea, también tienes los derechos del Reglamento General de Protección de Datos: acceso, portabilidad, oposición y limitación del tratamiento, y presentar una queja ante la autoridad de protección de datos de tu país.',
      ],
    },
    {
      heading: '10. Cómo ejercerlos',
      paragraphs: [
        'Muchos los puedes ejercer en la app: en Ajustes cambias tu nombre y tu avatar, y desde Ajustes › Cuenta puedes borrar tu cuenta. Para lo demás, escríbenos desde el correo de tu cuenta, para que podamos confirmar que eres tú.',
        'Respondemos las consultas en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles. Si necesitamos más tiempo te diremos por qué, y nunca será más de 5 días hábiles adicionales para una consulta ni 8 para un reclamo.',
      ],
    },
    {
      heading: '11. Menores de edad',
      paragraphs: ['MitiMiti es solo para mayores de 18 años. No guardamos a sabiendas datos de menores; si nos enteramos de que los hay, los borramos.'],
    },
    {
      heading: '12. Cambios a esta política',
      paragraphs: [
        'Si cambiamos esta política, actualizaremos la fecha de arriba y te avisaremos en la app antes de que los cambios importantes apliquen. Si queremos usar tus datos para una finalidad nueva, te pediremos una nueva autorización.',
        'Esta política se ofrece en español, inglés y alemán. Si hay diferencias entre versiones, vale la versión en español.',
      ],
    },
  ],
  contact: 'Escribirnos',
};
