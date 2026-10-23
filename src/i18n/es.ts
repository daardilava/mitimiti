// Spanish: the source of truth for every user-visible string. en.ts and de.ts are typed as `Messages`, so the
// type checker refuses to build while any message is missing there or takes different parameters.
// Voice: "tú" for the person, "ustedes" for the couple; neutral, no blame.

import { privacyEs } from './legal/privacy.es';
import { termsEs } from './legal/terms.es';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const es = {
  language: { name: 'Español', locale: 'es' },

  dates: {
    monthsShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    /** As used inside a sentence: "Gastado juntos en octubre". */
    months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    /** Sunday first, like Date.getDay(). */
    weekdays: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    /** Monday first, for chart axes. */
    weekdayInitials: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
    today: 'Hoy',
    yesterday: 'Ayer',
    /** "12 oct" */
    short: (day: number, monthShort: string) => `${day} ${monthShort}`,
    /** "Lunes 12 de octubre" */
    long: (weekday: string, day: number, month: string) => `${cap(weekday)} ${day} de ${month}`,
    /** "Hoy, 15 oct" */
    relative: (word: string, short: string) => `${word}, ${short}`,
    /** "13 – 19 oct" */
    sameMonthWeek: (from: number, to: number, monthShort: string) => `${from} – ${to} ${monthShort}`,
    /** "Octubre 2026" */
    monthYear: (month: string, year: number) => `${cap(month)} ${year}`,
  },

  categories: {
    super: 'Súper',
    comida: 'Comida fuera',
    casa: 'Casa',
    servicios: 'Servicios',
    transporte: 'Transporte',
    ocio: 'Salidas',
    viajes: 'Viajes',
    regalos: 'Regalos',
    otros: 'Otros',
  },

  /** Compact amounts on chart axes: $200 mil · $1,5 M. */
  money: { thousand: 'mil', million: 'M' },

  people: { you: 'Tú', yourPartner: 'Tu pareja', yourPartnerInSentence: 'tu pareja' },

  balance: {
    owesYou: (name: string) => `${name} te debe`,
    youOwe: (name: string) => `Le debes a ${name}`,
    even: 'Están a mano',
    noShared: 'Aún no hay gastos compartidos.',
    /** "Considera 9 gastos compartidos y 1 pago registrado" */
    basis: (expenses: number, payments: number) => {
      const e = `${expenses} ${expenses === 1 ? 'gasto compartido' : 'gastos compartidos'}`;
      return payments === 0 ? `Considera ${e}` : `Considera ${e} y ${payments} ${payments === 1 ? 'pago registrado' : 'pagos registrados'}`;
    },
    personal: 'Personal',
    owedToYou: (amount: string) => `Te deben ${amount}`,
    youOweAmount: (amount: string) => `Debes ${amount}`,
    noEffect: 'Sin efecto',
  },

  activity: {
    methods: { transfer: 'Transferencia', cash: 'Efectivo', other: 'Otro' },
    /** "Ana le pagó a Diego" */
    paid: (from: string, to: string) => `${from} le pagó a ${to}`,
    /** Extra word a payment row can be found by in search. */
    paymentKeyword: 'pago',
    count: (n: number) => `${n} ${n === 1 ? 'movimiento' : 'movimientos'}`,
  },

  settle: {
    lead: (from: string, to: string, owed: string) => `${from} le paga a ${to}. Pendiente: ${owed}`,
    methodInSentence: { transfer: 'por transferencia', cash: 'en efectivo', other: 'por otro medio' },
    /** "Ana le pagó $300.000 a Diego por transferencia." */
    paidSentence: (from: string, amount: string, to: string, method: string) => `${from} le pagó ${amount} a ${to} ${method}.`,
    errors: {
      tooMuch: 'El monto no puede ser mayor que lo pendiente. Puede que tu pareja ya haya registrado un pago.',
      nothingOwed: 'Ya están a mano; no hay nada pendiente.',
      noPartner: 'Tu pareja aún no se ha unido. Podrán registrar pagos cuando entre con el código.',
      generic: 'No se pudo registrar el pago. Revisa tu conexión e inténtalo de nuevo.',
    },
  },

  summary: {
    sharedCount: (n: number) => `${n} ${n === 1 ? 'gasto compartido' : 'gastos compartidos'}`,
  },

  budgets: {
    none: 'Sin límite',
    over: (amount: string) => `Se pasaron por ${amount}`,
    atLimit: 'Llegaron al límite',
    warning: (amount: string) => `Ojo: quedan ${amount}`,
    ok: (amount: string) => `Quedan ${amount}`,
    monthNone: 'Aún no tienen límites. Usa + en una categoría para poner el primero.',
    monthOver: (amount: string) => `Se pasaron por ${amount} este mes`,
    monthAtLimit: 'Llegaron al límite del mes',
    monthWarning: (amount: string) => `Ojo: les quedan ${amount} este mes`,
    monthOk: (amount: string) => `Les quedan ${amount} este mes`,
    lastDay: 'Último día del mes',
    daysLeft: (n: number) => (n === 1 ? 'Queda 1 día' : `Quedan ${n} días`),
  },

  coupleSettings: {
    /** "Tú 65% · Ana 35%" */
    share: (mine: number, partner: string, theirs: number) => `Tú ${mine}% · ${partner} ${theirs}%`,
    errors: {
      currencyLocked: 'La moneda no se puede cambiar cuando ya hay gastos o pagos: los montos nunca se convierten.',
      partnerJoined: 'Tu pareja ya se unió; su nombre lo cambia desde su app.',
      nameRequired: 'Escribe un nombre.',
      nameTooLong: 'Usa un nombre de 40 caracteres o menos.',
      invalidAvatar: 'Ese avatar no está disponible. Elige otro.',
      invalidPct: (min: number, max: number) => `Elige una parte entre ${min} % y ${max} %.`,
      generic: 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.',
    },
  },

  authErrors: {
    incomplete: 'Tu cuenta necesita un paso más que la app aún no muestra. Intenta con Google o escríbenos.',
    passwordIncorrect: 'La contraseña no es correcta. Inténtalo de nuevo o recupérala.',
    noAccount: 'No encontramos una cuenta con ese correo. ¿Quieres registrarte?',
    accountExists: 'Ya hay una cuenta con ese correo. Inicia sesión.',
    passwordPwned: 'Esa contraseña apareció en una filtración de datos. Elige otra.',
    passwordWeak: (min: number) => `Usa una contraseña más segura, de al menos ${min} caracteres.`,
    codeIncorrect: 'Ese código no es correcto. Revísalo e inténtalo de nuevo.',
    codeExpired: 'El código venció. Pide uno nuevo.',
    tooManyAttempts: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
    checkEmail: 'Revisa que el correo esté bien escrito.',
    useSocial: 'Esta cuenta entra con Google o Apple. Usa ese botón.',
    notAllowed: 'Esta forma de entrar no está disponible para esta cuenta.',
    sessionExists: 'Ya tienes una sesión abierta. Cierra la app y vuelve a abrirla.',
    notEnabled: 'Esta forma de entrar no está activada todavía. Usa Google mientras la configuramos.',
    generic: 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.',
  },

  welcome: {
    accountDeleted: 'Tu cuenta se borró. Gracias por usar MitiMiti.',
    coupleDeleted: 'Tu pareja borró su cuenta y, con ella, el espacio que compartían. Pueden empezar uno nuevo cuando quieran.',
    tagline: 'Gastos compartidos, cuentas claras y cero discusiones.',
    create: 'Crear cuenta',
    haveCode: 'Tengo una invitación de mi pareja',
    signIn: 'Iniciar sesión',
  },

  signIn: {
    deviceTitle: 'Confirma que eres tú',
    deviceLead: (email: string) => `Es la primera vez que entras desde este dispositivo. Te enviamos un código a ${email}.`,
    title: 'Hola de nuevo',
    lead: 'Entra para ver sus gastos y quién le debe a quién.',
    email: 'Correo',
    emailPlaceholder: 'tu@correo.com',
    password: 'Contraseña',
    passwordPlaceholder: 'Tu contraseña',
    forgot: '¿Olvidaste tu contraseña?',
    submit: 'Iniciar sesión',
    noAccount: '¿No tienes cuenta?',
    signUp: 'Regístrate',
  },

  signUp: {
    verifyTitle: 'Revisa tu correo',
    verifyLead: (email: string) => `Te enviamos un código de 6 dígitos a ${email} para confirmar que es tuyo.`,
    title: 'Crea tu cuenta',
    lead: 'Cada uno tiene la suya; después los unimos con un código.',
    fullName: 'Nombre completo',
    fullNamePlaceholder: 'Ej. Diego Ardila',
    passwordPlaceholder: (min: number) => `Mínimo ${min} caracteres`,
    passwordMissing: (n: number) => (n === 1 ? 'Te falta 1 carácter.' : `Te faltan ${n} caracteres.`),
    terms: 'Acepto los términos y condiciones y la política de privacidad',
    termsBefore: 'Acepto los',
    termsLink: 'términos y condiciones',
    privacyBetween: 'y la',
    privacyLink: 'política de privacidad',
    submit: 'Registrarme',
    haveAccount: '¿Ya tienes cuenta?',
    signIn: 'Inicia sesión',
  },

  forgotPassword: {
    codeTitle: 'Nueva contraseña',
    codeLead: (email: string) => `Escribe el código que te enviamos a ${email} y elige tu nueva contraseña.`,
    save: 'Guardar y entrar',
    newPassword: 'Nueva contraseña',
    title: '¿Olvidaste tu contraseña?',
    lead: 'Te enviamos un código a tu correo para que elijas una nueva.',
    send: 'Enviarme un código',
  },

  terms: {
    title: 'Términos y condiciones',
    ...termsEs,
  },

  privacy: {
    title: 'Política de privacidad',
    ...privacyEs,
  },

  deleteAccount: {
    title: 'Borrar tu cuenta',
    lead: 'Esto no se puede deshacer. Se borra para siempre:',
    yourAccount: (email: string) => `Tu cuenta de MitiMiti (${email}) y tu inicio de sesión.`,
    yourAccountNoEmail: 'Tu cuenta de MitiMiti y tu inicio de sesión.',
    sharedSpace: (partner: string) => `El espacio que compartes con ${partner}: todos los gastos, pagos, presupuestos y su historial.`,
    soloSpace: 'El espacio de la pareja y todo lo que registraste.',
    partnerToo: (partner: string) => `También se borra para ${partner}. Su cuenta sigue, pero empezará de cero.`,
    keepNote: 'Si quieren conservar algo, anótenlo antes de continuar.',
    confirm: (partner: string) => `Entiendo que se borra todo, también para ${partner}.`,
    confirmSolo: 'Entiendo que se borra todo.',
    delete: 'Borrar cuenta',
    codeTitle: 'Confirma que eres tú',
    codeLead: (email: string) => `Te enviamos un código a ${email}. Escríbelo para borrar tu cuenta.`,
    errors: {
      data: 'No se pudo borrar. Revisa tu conexión e inténtalo de nuevo; no se borró nada.',
      login: 'Tus datos ya se borraron, pero no pudimos cerrar tu cuenta de inicio de sesión. Inténtalo de nuevo.',
      noEmail: 'No pudimos enviarte un código para confirmar. Escríbenos y borramos tu cuenta.',
    },
  },

  exportData: {
    title: 'Exportar movimientos',
    lead: 'Elige el periodo y el formato. El archivo incluye los gastos y los pagos.',
    period: 'Periodo',
    presets: { thisMonth: 'Este mes', lastMonth: 'Mes pasado', last3Months: 'Últimos 3 meses', thisYear: 'Este año', all: 'Todo' },
    /** "12 gastos y 2 pagos" */
    summary: (expenses: number, payments: number) =>
      `${expenses} ${expenses === 1 ? 'gasto' : 'gastos'} y ${payments} ${payments === 1 ? 'pago' : 'pagos'}`,
    empty: 'No hay movimientos en este periodo. Elige otro.',
    format: 'Formato',
    csvTitle: 'CSV',
    csvDetail: 'Para Excel, Google Sheets o Numbers.',
    pdfTitle: 'PDF',
    pdfDetail: 'Un resumen para leer, imprimir o enviar.',
    exportPdf: 'Exportar PDF',
    /** The PDF report. */
    pdf: {
      title: 'Resumen de movimientos',
      couple: (a: string, b: string) => `${a} y ${b}`,
      /** "13 oct 2026" */
      dateWithYear: (short: string, year: number) => `${short} ${year}`,
      /** "1 oct 2026 – 31 oct 2026" */
      span: (from: string, to: string) => `${from} – ${to}`,
      generated: (date: string) => `Generado el ${date}`,
      balanceAt: (date: string) => `Saldo al ${date}`,
      owes: (from: string, amount: string, to: string) => `${from} le debe ${amount} a ${to}`,
      even: 'Están a mano',
      howTitle: 'Cómo se llegó al saldo',
      fromExpenses: 'Gastos compartidos del periodo',
      inFavorOf: (amount: string, name: string) => `${amount} a favor de ${name}`,
      noChange: 'Sin cambios',
      shared: 'Gastos compartidos',
      payments: 'Pagos entre ustedes',
      personal: 'Gastos personales',
      personalNote: 'No cuentan en el saldo',
      expensesCount: (n: number) => `${n} ${n === 1 ? 'gasto' : 'gastos'}`,
      paymentsCount: (n: number) => `${n} ${n === 1 ? 'pago' : 'pagos'}`,
      whoPaid: 'Quién pagó',
      person: 'Persona',
      paid: 'Pagó',
      share: 'Le corresponde',
      difference: 'Diferencia',
      byCategory: 'Por categoría',
      movements: 'Movimientos',
      payment: 'Pago',
      personalBadge: 'Personal',
      currencyNote: (currency: string) => `Montos en ${currency}. MitiMiti registra los gastos y pagos; no convierte monedas ni mueve dinero.`,
    },
    exportCsv: 'Exportar CSV',
    failed: 'No se pudo crear el archivo. Inténtalo de nuevo.',
    /** File name, without date or extension. */
    fileName: 'mitimiti-movimientos',
    /** Column headers and values of the CSV file. */
    csv: {
      date: 'Fecha',
      type: 'Tipo',
      description: 'Descripción',
      category: 'Categoría',
      paidBy: 'Pagó',
      amount: 'Monto',
      currency: 'Moneda',
      split: 'División',
      shareOf: (name: string) => `Parte de ${name}`,
      expense: 'Gasto',
      payment: 'Pago',
      /** "Diego 60 % · Ana 40 %" */
      splitPct: (payer: string, payerPct: number, other: string, otherPct: number) => `${payer} ${payerPct} % · ${other} ${otherPct} %`,
    },
  },

  setup: {
    title: 'Armemos su cuenta',
    step: 'Paso 1 de 2',
    lead: 'Solo lo básico. Pueden cambiar todo después en Ajustes.',
    failed: 'No se pudo crear la cuenta. Revisa tu conexión e inténtalo de nuevo.',
    continue: 'Continuar',
    myName: 'Tu nombre',
    myNamePlaceholder: 'Ej. Diego',
    partnerName: 'Nombre de tu pareja',
    partnerNamePlaceholder: 'Ej. Ana',
    currency: 'Moneda',
    currencyHint: 'Todos los montos quedan en esta moneda; no se convierten.',
    splitQuestion: '¿Cómo dividen casi siempre?',
    half: 'Mitad y mitad',
    halfDetail: 'Cada quien pone el 50%',
    pct: 'Proporcional',
    pctDetail: 'Según lo que gana cada quien',
    myShare: 'Tu parte',
  },

  join: {
    missing: (n: number) => `Faltan ${n} ${n === 1 ? 'carácter' : 'caracteres'}`,
    ready: 'Listo',
    ambiguous: 'Los códigos no llevan 0, O, 1 ni I. Revisa esa letra.',
    title: 'Únete a tu pareja',
    lead: 'Pídele el código de 6 caracteres que aparece en su app, en Ajustes › Código de pareja.',
    leadInvited: 'Tu invitación ya trae el código. Revísalo y toca Unirme.',
    noCode: 'No tengo código: crear nuestra cuenta',
    submit: 'Unirme',
    label: 'Código de invitación',
    placeholder: 'Ej. AM482X',
  },

  tabs: { home: 'Inicio', activity: 'Movimientos', summary: 'Resumen', settings: 'Ajustes', add: 'Agregar gasto' },

  home: {
    title: 'Inicio',
    settle: 'Saldar cuentas',
    /** "Gastado juntos en octubre" */
    spentTogether: (month: string) => `Gastado juntos en ${month}`,
    noSharedThisMonth: 'Aún no hay gastos compartidos este mes.',
    recent: 'Recientes',
    seeAll: 'Ver todos',
    noExpenses: 'Aún no hay gastos. Toca + para agregar el primero.',
    budgetTitle: 'Presupuesto del mes',
    budgetA11y: (pct: number, ofAmount: string, status: string) => `Presupuesto del mes: ${pct} por ciento. ${ofAmount}. ${status}`,
    budgetSetUpA11y: 'Presupuestos: poner límites por categoría',
    budgetSetUp: 'Pongan un límite por categoría y vean cuánto les queda.',
  },

  activityScreen: {
    title: 'Movimientos',
    all: 'Todo',
    paidBy: (name: string) => `Pagó ${name}`,
    payments: 'Pagos entre ustedes',
    day: 'Día',
    week: 'Semana',
    month: 'Mes',
    /** "11 movimientos · $3.941.900 en gastos" */
    subtitle: (count: string, total: string) => `${count} · ${total} en gastos`,
    searchLabel: 'Buscar movimientos',
    searchPlaceholder: 'Buscar por descripción o categoría',
    noMatch: 'Nada coincide',
    noMatchHint: 'Prueba con otra palabra o elige "Todo".',
    emptyDay: 'Sin movimientos este día',
    emptyWeek: 'Sin movimientos esta semana',
    emptyMonth: (month: string) => `Sin movimientos en ${month}`,
    emptyNowHint: 'Toca + para agregar un gasto.',
    emptyPastHint: 'Usa las flechas o toca la fecha para ver otros días.',
    /** The period title opens a calendar. */
    changeDate: 'Cambiar fecha',
    pickDay: 'Elegir día',
    pickWeek: 'Elegir semana',
    pickMonth: 'Elegir mes',
    goToday: 'Ir a hoy',
    /** Calendar cell: "Lunes 12 de octubre, con movimientos" */
    withActivity: (label: string) => `${label}, con movimientos`,
  },

  summaryScreen: {
    title: 'Resumen',
    shared: 'Gastos compartidos',
    emptyTitle: (month: string) => `Sin gastos compartidos en ${month}`,
    emptyNow: 'Cuando agreguen gastos, aquí verán en qué se fue el mes.',
    emptyPast: 'Usa las flechas para ver otro mes.',
    byCategory: 'Por categoría',
    categoryA11y: (name: string, amount: string, pct: number) => `${name}: ${amount}, ${pct} por ciento`,
    whoPaid: 'Quién pagó',
    shares: 'Lo que le tocaba a cada uno',
    exactShares: 'Este mes cada uno puso exactamente su parte.',
    putMore: (name: string, amount: string) => `Este mes, ${name} puso ${amount} más que su parte.`,
    personal: 'Gastos personales',
    noPersonal: 'Ninguno este mes. Los gastos personales no entran en el saldo.',
    personalSplit: (me: string, mine: string, partner: string, theirs: string) => `${me} ${mine} · ${partner} ${theirs}. No entran en el saldo.`,
    seeBudgets: 'Ver presupuestos',
  },

  budgetsScreen: {
    title: 'Presupuestos',
    /** "Octubre · quedan 17 días" */
    monthHeader: (month: string, daysLeft: string) => `${month.charAt(0).toUpperCase() + month.slice(1)} · ${daysLeft.toLowerCase()}`,
    noLimitsA11y: 'Sin límites este mes',
    help: (step: string) =>
      `Solo cuentan los gastos compartidos. Usa − y + para mover cada límite de ${step} en ${step}; mantén presionado para ir más rápido. El límite sigue igual los meses siguientes hasta que lo cambien.`,
    saveFailed: 'No se pudo guardar el último cambio. Revisa tu conexión e inténtalo de nuevo.',
    spentThisMonth: (amount: string) => `${amount} este mes`,
    noLimitA11y: (name: string, amount: string) => `${name}: ${amount} este mes, sin límite`,
    lower: (name: string) => `Bajar el límite de ${name}`,
    raise: (name: string) => `Subir el límite de ${name}`,
  },

  settleScreen: {
    title: 'Saldar cuentas',
    even: 'Están a mano',
    nothingPending: 'No hay nada pendiente entre ustedes.',
    record: 'Registrar pago',
    recordAmount: (amount: string) => `Registrar pago de ${amount}`,
    waitingPartner: (name: string) => `Podrán registrar pagos cuando ${name} entre a la app con el código de pareja.`,
    amount: 'Monto del pago',
    amountA11y: (currency: string) => `Monto del pago en ${currency}`,
    tooMuch: (owed: string) => `No puede ser mayor que lo pendiente (${owed}).`,
    all: (amount: string) => `Todo · ${amount}`,
    half: (amount: string) => `La mitad · ${amount}`,
    how: '¿Cómo se pagó?',
    onlyRecords: 'Esto solo registra el pago en la app. No mueve dinero entre sus cuentas.',
    doneTitle: 'Pago registrado',
    backHome: 'Volver al inicio',
    seeActivity: 'Ver movimientos',
    currentBalance: 'Saldo actual',
    calculating: 'Calculando…',
  },

  invite: {
    title: 'Código de pareja',
    goToApp: 'Ir a la app',
    joinedTitle: (name: string) => `${name} ya se unió`,
    joinedLead: 'Los dos ven los mismos gastos y el mismo saldo. Ya no hace falta un código.',
    // The code alone on its line: a long press in WhatsApp copies just it.
    shareMessage: (code: string, until: string | null) =>
      `¡Hola! Te invito a MitiMiti, para llevar juntos nuestros gastos y ver al momento quién le debe a quién.

` +
      `1. Descarga la app MitiMiti.
2. Toca "Tengo una invitación de mi pareja".
3. Escribe este código:

${code}` +
      (until ? `

Vale hasta el ${until}.` : ''),
    whatsapp: 'Enviar por WhatsApp',
    inviteTitle: (name: string) => `Invita a ${name}`,
    step: 'Paso 2 de 2',
    lead: (name: string) => `Comparte este código. Cuando ${name} lo escriba en su app, los dos verán los mismos gastos y el mismo saldo.`,
    expired: 'El código venció. Genera uno nuevo y compártelo; dura 7 días.',
    regenerate: 'Generar un código nuevo',
    regenerateFailed: 'No se pudo generar. Revisa tu conexión.',
    codeA11y: (spaced: string) => `Código: ${spaced}`,
    copy: 'Copiar',
    copied: 'Copiado',
    share: 'Otras apps',
    validUntil: (date: string) => `Vale hasta el ${date}.`,
    meanwhile: (name: string) => `Mientras tanto ya puedes registrar gastos. ${name} los verá en cuanto se una.`,
  },

  expense: {
    newTitle: 'Nuevo gasto',
    add: 'Agregar gasto',
    editTitle: 'Editar gasto',
    saveChanges: 'Guardar cambios',
    saveFailed: 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.',
    detailTitle: 'Detalle del gasto',
    edit: 'Editar gasto',
    delete: 'Eliminar gasto',
    amountA11y: (amount: string) => `Monto ${amount}`,
    paid: 'Pagó',
    split: 'División',
    splitPct: 'Por porcentaje',
    splitOther: (name: string) => `Todo para ${name}`,
    splitPersonal: 'Personal',
    splitHalf: 'Mitad y mitad',
    shareOf: (name: string) => `Le toca a ${name}`,
    shareA11y: (name: string, amount: string, pct: number) => `Le toca a ${name}: ${amount}, ${pct}%`,
    effectPersonal: 'Gasto personal: no cambia el saldo entre ustedes.',
    effectOwedToYou: (name: string, amount: string) => `Por este gasto, ${name} te debe ${amount}.`,
    effectYouOwe: (amount: string, name: string) => `Por este gasto, le debes ${amount} a ${name}.`,
    effectNone: 'Este gasto no cambia el saldo.',
    confirmTitle: '¿Eliminar este gasto?',
    confirmBody: (what: string, amount: string) => `${what} · ${amount}. El saldo se recalcula y no se puede deshacer.`,
    deleteFailed: 'No se pudo eliminar. Inténtalo de nuevo.',
    deleting: 'Eliminando…',
    cancel: 'Cancelar',
  },

  expenseForm: {
    previewEmpty: 'Escribe el monto para ver cómo queda',
    previewOwedToYou: (name: string, amount: string) => `Con esto, ${name} te debe ${amount} más`,
    previewYouOwe: (amount: string, name: string) => `Con esto, le debes ${amount} más a ${name}`,
    previewNone: 'No cambia el saldo entre ustedes',
    half: 'Mitad y mitad',
    halfEach: (amount: string) => `Cada quien pone ${amount}`,
    halfEachEmpty: 'Cada quien pone la mitad',
    pct: 'Por porcentaje',
    other: (name: string) => `Todo le toca a ${name}`,
    otherDetail: (name: string, payer: string) => `${name} le debe el total a ${payer}`,
    personal: (name: string) => `Personal de ${name}`,
    personalDetail: 'Se registra, pero no cambia el saldo',
    amount: 'Monto',
    amountA11y: (currency: string) => `Monto en ${currency}`,
    description: 'Descripción',
    descriptionPlaceholder: 'Ej. Súper, cena, gasolina',
    whoPaid: '¿Quién pagó?',
    paidBy: (name: string) => `Pagó ${name}`,
    partnerNotYet: 'Disponible cuando tu pareja se una',
    category: 'Categoría',
    howSplit: '¿Cómo se divide?',
    date: 'Fecha',
    saving: 'Guardando…',
  },

  settings: {
    title: 'Ajustes',
    you: 'Ustedes',
    partnerRenames: (name: string) => `${name} cambia su nombre desde su app.`,
    defaultSplit: 'División predeterminada',
    defaultSplitDetail: 'Se usa al crear un gasto nuevo; en cada gasto la pueden cambiar.',
    half: 'Mitad y mitad',
    proportional: (partner: string) => `Proporcional · Tú / ${partner}`,
    other: 'Otra',
    yourShare: 'Tu parte (%)',
    yourSharePlaceholder: 'Ej. 65',
    shareRange: (min: number, max: number) => `Un número del ${min} al ${max}.`,
    shareInvalid: (min: number, max: number) => `Escribe un número del ${min} al ${max}.`,
    save: 'Guardar',
    inUse: 'En uso',
    use: (share: string) => `Usar ${share}`,
    newStartsWith: (share: string) => `Cada gasto nuevo empieza con ${share}.`,
    newStartsHalf: 'Cada gasto nuevo empieza mitad y mitad.',
    currency: 'Moneda',
    currencyLocked: 'Ya hay gastos registrados en esta moneda, así que queda fija: los montos nunca se convierten.',
    currencyFree: 'Elígela antes del primer gasto; después queda fija porque los montos nunca se convierten.',
    appearance: 'Apariencia',
    appearanceDetail: 'Automático sigue el modo claro u oscuro de tu teléfono.',
    automatic: 'Automático',
    light: 'Claro',
    dark: 'Oscuro',
    language: 'Idioma',
    languageDetail: 'Automático usa el idioma de tu teléfono. Solo cambia en este teléfono.',
    reminders: 'Recordatorios y avisos',
    soon: 'Pronto',
    settleReminder: 'Recordatorio para saldar',
    settleReminderDetail: 'Cada domingo, si hay saldo pendiente',
    newExpenseAlert: 'Avisarme de gastos nuevos',
    newExpenseAlertDetail: (name: string) => `Cuando ${name} registre uno`,
    exportCsv: 'Exportar movimientos',
    exportCsvDetail: 'Los gastos y pagos de un periodo, en un archivo para abrir en una hoja de cálculo.',
    exportOpen: 'Exportar',
    avatar: 'Tu avatar',
    avatarDetail: (partner: string) => `${partner} lo ve junto a tu nombre.`,
    avatarInitial: 'Inicial',
    avatarA11y: (name: string) => `Avatar: ${name}`,
    myName: 'Tu nombre',
    partner: 'Tu pareja',
    coupleCode: 'Código de pareja',
    partnerJoinedNoCode: (name: string) => `${name} ya se unió; no hace falta un código.`,
    codeA11y: (spaced: string) => `Código ${spaced}`,
    codeExpired: 'El código venció.',
    share: 'Compartir',
    newCode: 'Generar uno nuevo',
    copied: 'Copiado',
    copyCode: 'Copiar código',
    account: 'Cuenta',
    legal: 'Información legal',
    deleteAccount: 'Borrar cuenta',
    signedInAs: (email: string) => `Sesión iniciada como ${email}`,
    signOutConfirm: '¿Cerrar sesión en este teléfono? Tus gastos quedan guardados; vuelves a verlos al entrar.',
    cancel: 'Cancelar',
    signOut: 'Cerrar sesión',
    saved: 'Guardado ✓',
  },

  avatars: { fox: 'Zorro', cat: 'Gato', bear: 'Oso', panda: 'Panda', owl: 'Búho', frog: 'Rana', bunny: 'Conejo', penguin: 'Pingüino', pig: 'Cerdito', tiger: 'Tigre', dog: 'Perro', mouse: 'Ratón' },

  paywall: {
    title: 'Premium para los dos',
    lead: 'Una sola suscripción cubre a los dos: lo que activa uno, lo tienen ambos.',
    benefits: {
      history: { title: 'Historial completo', detail: 'Movimientos y Resumen de todos los meses, no solo los últimos 3.' },
      budgets: { title: 'Presupuestos', detail: 'Un límite por categoría y el aviso antes de llegar a él.' },
      export: { title: 'Exportar CSV y PDF', detail: 'Sus movimientos en una hoja de cálculo o en un informe.' },
      recurring: { title: 'Gastos recurrentes', detail: 'Arriendo, internet y suscripciones, solos cada mes.' },
    },
    soon: 'Pronto',
    plans: 'Elige tu plan',
    annual: 'Anual',
    monthly: 'Mensual',
    perYear: 'al año',
    perMonth: 'al mes',
    save: (pct: number) => `Ahorra ${pct} %`,
    trialDays: (days: number) => `${days} días gratis`,
    tryFree: (days: number) => `Probar ${days} días gratis`,
    subscribe: 'Suscribirme',
    restore: 'Restaurar compras',
    restoreNone: 'No encontramos una suscripción en esta cuenta de la tienda.',
    restoreFailed: 'No se pudo restaurar. Revisa tu conexión e inténtalo de nuevo.',
    coreFree: 'Lo esencial de MitiMiti es gratis para siempre: registrar gastos, ver el saldo y saldar cuentas.',
    renewal: (price: string, period: string, store: string) =>
      `Se renueva automáticamente por ${price} cada ${period} hasta que la canceles. Puedes cancelar cuando quieras, al menos 24 horas antes de que termine el periodo, desde los ajustes de tu cuenta de ${store}.`,
    trialTerms: (days: number, date: string, price: string, period: string) =>
      `La prueba dura ${days} días. Si no la cancelas antes del ${date}, se cobran ${price} ese día y luego cada ${period}.`,
    year: 'año',
    month: 'mes',
    stores: { ios: 'App Store', android: 'Google Play', other: 'la tienda' },
    terms: 'Términos',
    privacy: 'Privacidad',
    loadFailed: 'No se pudieron cargar los planes. Revisa tu conexión.',
    unavailable: 'Las compras no están disponibles en esta versión de la app.',
    purchaseFailed: 'No se pudo completar la compra. Si la tienda ya te cobró, toca Restaurar compras.',
    activating: 'Activando Premium…',
    activatingDetail: 'La tienda ya confirmó la compra. Esto toma unos segundos.',
    pending: 'La compra está hecha. Premium se activará en unos minutos para los dos; puedes seguir usando la app.',
    doneTitle: 'Ya tienen Premium',
    doneLead: 'Se abrió para los dos:',
    continue: 'Seguir',
    partnerHasTitle: (name: string) => `${name} ya activó Premium`,
    partnerHasLead: 'Premium es para los dos, así que no hace falta otra suscripción.',
    youHaveTitle: 'Ya tienen Premium',
    youHaveLead: 'Lo administras tú desde la tienda. Tu pareja también lo tiene.',
    included: 'Incluido',
  },

  ui: {
    back: 'Volver',
    close: 'Cerrar',
    retry: 'Reintentar',
    loadFailed: 'No se pudo cargar. Revisa tu conexión.',
    expenseGone: 'Este gasto ya no existe.',
    todo: (feature: string) => `Por construir · ${feature}`,
    /** "$3.821.900 de $5.300.000" */
    amountOf: (part: string, whole: string) => `${part} de ${whole}`,
    previous: 'Anterior',
    next: 'Siguiente',
    clearSearch: 'Borrar búsqueda',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
    less: (label: string) => `Menos para ${label}`,
    more: (label: string) => `Más para ${label}`,
  },

  rows: {
    /** "Pagó Diego · 13 oct" */
    paidBy: (name: string, date: string) => `Pagó ${name} · ${date}`,
    expenseA11y: (title: string, amount: string, payer: string, date: string, effect: string) => `${title}, ${amount}, pagó ${payer}, ${date}. ${effect}`,
    payment: 'Pago',
    paymentA11y: (title: string, amount: string, detail: string) => `${title}, ${amount}, ${detail}. Pago`,
  },

  chart: {
    title: 'Gastos compartidos',
    paidBy: (name: string) => `Pagó ${name}`,
    a11y: (me: string, mine: string, partner: string, theirs: string) =>
      `Gastos compartidos por día. ${me} pagó ${mine} y ${partner} ${theirs}. El detalle de cada día está en la lista.`,
    tapHint: 'Toca o desliza sobre el gráfico para ver cada día.',
    tapAgain: 'Toca de nuevo ese día para volver al total.',
    noneThisDay: 'Sin gastos compartidos este día.',
  },

  authUi: {
    orContinueWith: 'o continúa con',
    continueWith: (provider: string) => `Continuar con ${provider}`,
    continue: 'Continuar',
    code: 'Código',
    newCodeSent: 'Te enviamos un código nuevo.',
    resendCode: 'Reenviar código',
  },

  joinErrors: {
    invalidCode: 'Ese código no existe. Revisa que esté bien escrito.',
    expiredCode: 'Ese código venció. Pídele a tu pareja uno nuevo en Ajustes › Código de pareja.',
    householdFull: 'Esa cuenta ya tiene a sus dos personas.',
    tooManyAttempts: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
    alreadyInHousehold: 'Ya perteneces a una cuenta.',
    generic: 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.',
  },
};

export type Messages = typeof es;
