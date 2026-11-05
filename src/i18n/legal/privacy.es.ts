// Política de privacidad y tratamiento de datos personales de MitiMiti, en español: la versión que vale.
// El responsable vive en Alemania, así que rige el RGPD (Reglamento (UE) 2016/679); para quien vive en Colombia siguen
// la Ley 1581 de 2012 y el Decreto 1377 de 2013. Debe decir lo que la app hace de verdad: si cambia lo que se guarda o
// con quién se comparte, cambia este texto y su fecha.
import { LEGAL_CONTACT, type LegalDoc } from './types';

const { owner, email, address } = LEGAL_CONTACT;

export const privacyEs: LegalDoc = {
  effective: 'Vigente desde el 3 de noviembre de 2026',
  intro:
    'Esta política explica qué datos personales guarda MitiMiti, para qué y con qué base legal, con quién los comparte, cuánto tiempo los conserva y cómo puedes conocerlos, corregirlos o pedir que se borren.',
  sections: [
    {
      heading: '1. Responsable del tratamiento',
      paragraphs: [`${owner}, persona natural, ${address}, Alemania. Correo para todo lo relacionado con tus datos: ${email}.`],
    },
    {
      heading: '2. Qué datos guardamos',
      paragraphs: [
        'De tu cuenta: tu nombre, tu correo y tu contraseña. La contraseña la guarda nuestro proveedor de inicio de sesión de forma cifrada; nosotros nunca la vemos. Si entras con Google o Apple, recibimos de ellos tu nombre, tu correo y un identificador. Por seguridad, el proveedor también registra tus sesiones, el dispositivo y la dirección IP desde la que entras.',
        'De la pareja: el nombre de cada uno (incluido el nombre con el que invitas a tu pareja antes de que se una), el avatar, la moneda, la división predeterminada y el código de invitación.',
        'Lo que ustedes registran: cada gasto (monto, descripción, categoría, fecha, quién pagó, cómo se divide y cómo se registró: en el formulario, escrito, dictado o con la foto de un recibo), cada pago entre ustedes (monto, medio y fecha) y los presupuestos.',
        'Si usas Dictar: el reconocimiento de voz lo hace tu teléfono (el de Apple o Google, según sus políticas) y el texto se interpreta en tu teléfono; MitiMiti nunca recibe el audio, solo el gasto que tú confirmes. Si usan Escanear (Premium), la foto del recibo se envía para proponer el gasto y no se guarda: la foto no queda en MitiMiti, solo el gasto que tú confirmes.',
        'Un historial de cambios: quién creó, editó o borró cada gasto o pago, y cuándo. También guardamos los intentos de unirse con un código, para evitar abusos.',
        'Si la pareja compra Premium: la tienda (Apple o Google) procesa el pago y nosotros no vemos tu tarjeta ni tus datos de pago. Recibimos, a través de RevenueCat, el estado de la suscripción asociado a tu cuenta: el producto, la tienda, si es una prueba, las fechas de compra, renovación y fin, y los avisos de la tienda sobre esa compra.',
        'En tu teléfono quedan tu sesión, en el almacenamiento seguro del sistema, y tus preferencias de idioma y apariencia.',
        'No pedimos datos sensibles. No guardamos datos bancarios ni de tarjetas, tu ubicación, tus contactos ni tus fotos. Te pedimos no escribir datos sensibles en las descripciones de los gastos.',
      ],
    },
    {
      heading: '3. Para qué los usamos y con qué base legal',
      paragraphs: [
        'Para prestarte el servicio que pides al crear tu cuenta (artículo 6.1.b del RGPD): crear tu cuenta, mostrarte a ti y a tu pareja lo que registran y calcular el saldo, mantener sincronizados los dos teléfonos, responder tus preguntas, abrir las funciones de Premium si la pareja lo tiene y, si la usan, proponer gastos con la lectura con IA.',
        'Por nuestro interés legítimo en ofrecer un servicio seguro y fiable (artículo 6.1.f del RGPD): proteger tu cuenta, prevenir fraudes y abusos, guardar el historial de cambios y los intentos de unirse con un código, y avisarte de cambios en la app o en estos textos.',
        'Para cumplir obligaciones legales (artículo 6.1.c del RGPD), por ejemplo responder a una autoridad o conservar lo que la ley exija.',
        'No vendemos tus datos, no los usamos para publicidad y no creamos perfiles tuyos para terceros. No tomamos decisiones automatizadas sobre ti: la lectura con IA solo propone un borrador y tú decides si lo guardas.',
      ],
    },
    {
      heading: '4. Datos necesarios y datos de tu pareja',
      paragraphs: [
        'Necesitamos tu nombre y tu correo para crear tu cuenta; sin ellos no puedes usar MitiMiti. Todo lo demás lo registras tú, cuando quieras, y la lectura con IA es opcional.',
        'Si registras el nombre de tu pareja antes de que se una, declaras que puedes hacerlo y que le contarás que usas MitiMiti. Cuando se una, aceptará esta política con su propia cuenta.',
        'Si vives en Colombia, al crear tu cuenta y aceptar esta política nos das la autorización que exige la Ley 1581 de 2012 para tratar tus datos con estas finalidades. Puedes revocarla en cualquier momento borrando tu cuenta o escribiéndonos.',
      ],
    },
    {
      heading: '5. Con quién los compartimos',
      paragraphs: [
        'Con tu pareja: ve todo lo que se comparte en su espacio, incluido tu nombre y tu avatar.',
        'Con los proveedores que nos ayudan a prestar el servicio, que solo usan tus datos para eso, bajo nuestras instrucciones y con un contrato de encargo del tratamiento (artículo 28 del RGPD): Clerk (inicio de sesión, Estados Unidos) y Supabase (base de datos, alojada en Irlanda, Unión Europea). Si entras con Google o Apple, también ellos participan en el inicio de sesión.',
        'Si compran Premium: RevenueCat (gestión de suscripciones, Estados Unidos) recibe tu identificador de cuenta y el estado de la compra, y Apple o Google procesan el pago como responsables de su propia tienda, según sus políticas.',
        'Si usan Escanear: Anthropic (modelo de inteligencia artificial, Estados Unidos) recibe la foto del recibo, la fecha de hoy, el idioma de la app y la moneda de la pareja, solo para proponer el borrador del gasto. No recibe sus nombres, el saldo ni sus otros gastos.',
        'Con autoridades, solo cuando la ley nos obligue.',
      ],
    },
    {
      heading: '6. Transferencias internacionales',
      paragraphs: [
        'La base de datos está en Irlanda, dentro de la Unión Europea. Clerk, RevenueCat y Anthropic están en Estados Unidos. Esas transferencias se basan en el Marco de Privacidad de Datos UE-EE. UU. cuando el proveedor está certificado y, si no, en las cláusulas contractuales tipo de la Comisión Europea (artículos 45 y 46 del RGPD). Puedes pedirnos una copia de esas garantías.',
        'Si vives en Colombia, tus datos se tratan fuera de Colombia: en Alemania, Irlanda y Estados Unidos. Son países que la Superintendencia de Industria y Comercio reconoce con un nivel adecuado de protección de datos.',
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
        'Según el RGPD puedes: acceder a tus datos y recibir una copia; corregirlos; pedir que los borremos; limitar su tratamiento; recibirlos en un formato estructurado para llevarlos a otro servicio; oponerte al tratamiento que se basa en nuestro interés legítimo, y retirar en cualquier momento un consentimiento que nos hayas dado, sin que eso afecte lo hecho antes.',
        'También puedes presentar una queja ante una autoridad de protección de datos, en especial la del país de la Unión Europea donde vives. La autoridad competente para nosotros es la del estado de Hesse, en Alemania: Der Hessische Beauftragte für Datenschutz und Informationsfreiheit, en Wiesbaden.',
        'Si vives en Colombia, la Ley 1581 de 2012 también te permite: conocer, actualizar y rectificar tus datos; pedir prueba de tu autorización; saber cómo los usamos; revocar la autorización y pedir que los borremos; presentar quejas ante la Superintendencia de Industria y Comercio después de habernos consultado, y acceder a tus datos gratis.',
      ],
    },
    {
      heading: '10. Cómo ejercerlos',
      paragraphs: [
        'Muchos los puedes ejercer en la app: en Ajustes cambias tu nombre y tu avatar, y desde Ajustes › Cuenta puedes borrar tu cuenta. Para lo demás, escríbenos desde el correo de tu cuenta, para que podamos confirmar que eres tú. Es gratis.',
        'Respondemos en máximo un mes. Si la solicitud es compleja, podemos ampliar ese plazo hasta dos meses más, y te diremos por qué dentro del primer mes.',
        'Si vives en Colombia, respondemos las consultas en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles. Si necesitamos más tiempo te diremos por qué, y nunca será más de 5 días hábiles adicionales para una consulta ni 8 para un reclamo.',
      ],
    },
    {
      heading: '11. Menores de edad',
      paragraphs: ['MitiMiti es solo para mayores de 18 años. No guardamos a sabiendas datos de menores; si nos enteramos de que los hay, los borramos.'],
    },
    {
      heading: '12. Cambios a esta política',
      paragraphs: [
        'Si cambiamos esta política, actualizaremos la fecha de arriba y te avisaremos en la app antes de que los cambios importantes apliquen. Si queremos usar tus datos para una finalidad nueva, te lo diremos antes y, cuando la ley lo exija, te pediremos tu consentimiento.',
        'Esta política se ofrece en español, inglés y alemán. Si hay diferencias entre versiones, vale la versión en español.',
      ],
    },
  ],
  contact: 'Escribirnos',
};
