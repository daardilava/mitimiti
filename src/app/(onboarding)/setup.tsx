import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { createHouseholdSchema, useCreateHousehold, type DefaultSplit } from '@/api/household';
import { CURRENCIES, type Currency } from '@/lib/money';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import { Chip, Field, RadioCard, Stepper, TextField } from '@/ui/Form';
import { NavButton, Screen } from '@/ui/Screen';
import { color, space, type } from '@/ui/tokens';

const PCT_MIN = 30;
const PCT_MAX = 70;
const PCT_STEP = 5;

// 02 · Crear cuenta
export default function Setup() {
  const signedIn = useSessionStore((s) => s.userId !== null) || DEV_BYPASS_AUTH;
  const create = useCreateHousehold();

  // Prefilled from the name typed at sign-up, or the one Google / Apple share.
  const [myName, setMyName] = useState(() => useSessionStore.getState().suggestedName ?? '');
  const [partnerName, setPartnerName] = useState('');
  const [currency, setCurrency] = useState<Currency>('COP');
  const [split, setSplit] = useState<DefaultSplit>('half');
  const [myPct, setMyPct] = useState(60);

  if (!signedIn) return <Redirect href={{ pathname: '/sign-in', params: { next: 'setup' } }} />;

  const input = { myName, partnerName, currency, defaultSplit: split, defaultPct: myPct };
  const valid = createHouseholdSchema.safeParse(input).success;
  const partner = partnerName.trim() || 'tu pareja';

  return (
    <Screen
      title="Armemos su cuenta"
      step="Paso 1 de 2"
      lead="Solo lo básico. Pueden cambiar todo después en Ajustes."
      back="back"
      footer={
        <View style={{ gap: space[2] }}>
          {create.isError && (
            <Text style={[type.label, { color: color.negative, textAlign: 'center' }]} accessibilityLiveRegion="polite">
              No se pudo crear la cuenta. Revisa tu conexión e inténtalo de nuevo.
            </Text>
          )}
          <NavButton label="Continuar" onPress={() => create.mutate(input)} disabled={!valid} loading={create.isPending} />
        </View>
      }
    >
      <TextField label="Tu nombre" value={myName} onChangeText={setMyName} placeholder="Ej. Diego" autoCapitalize="words" textContentType="givenName" autoComplete="given-name" maxLength={40} returnKeyType="next" />
      <TextField label="Nombre de tu pareja" value={partnerName} onChangeText={setPartnerName} placeholder="Ej. Ana" autoCapitalize="words" maxLength={40} />

      <Field label="Moneda" hint="Todos los montos quedan en esta moneda; no se convierten.">
        <View style={{ flexDirection: 'row', gap: space[2] }} accessibilityRole="radiogroup">
          {CURRENCIES.map((c) => (
            <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />
          ))}
        </View>
      </Field>

      <Field label="¿Cómo dividen casi siempre?">
        <View style={{ gap: space[3] }} accessibilityRole="radiogroup">
          <RadioCard title="Mitad y mitad" detail="Cada quien pone el 50%" selected={split === 'half'} onPress={() => setSplit('half')} />
          <RadioCard title="Proporcional" detail="Según lo que gana cada quien" selected={split === 'pct'} onPress={() => setSplit('pct')}>
            <Stepper
              label="Tu parte"
              value={`Tú ${myPct}% · ${partner} ${100 - myPct}%`}
              canDecrease={myPct > PCT_MIN}
              canIncrease={myPct < PCT_MAX}
              onDecrease={() => setMyPct((p) => Math.max(PCT_MIN, p - PCT_STEP))}
              onIncrease={() => setMyPct((p) => Math.min(PCT_MAX, p + PCT_STEP))}
            />
          </RadioCard>
        </View>
      </Field>
    </Screen>
  );
}
