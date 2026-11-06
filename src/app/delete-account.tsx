import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { confirmDeletionCode, deleteMyAccount, NoEmailFactorError, sendDeletionCode } from '@/api/account';
import { useCouple } from '@/api/expenses';
import { usePlan } from '@/api/plan';
import { manageSubscriptions } from '@/api/purchases';
import { deletionErrorMessage } from '@/lib/deleteAccount';
import { deletionNotice } from '@/lib/plans';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import { CodeStep } from '@/ui/Auth';
import { Callout, Checkbox } from '@/ui/Form';
import { Icon } from '@/ui/Icon';
import { NavButton, Screen } from '@/ui/Screen';
import { radius, space } from '@/ui/tokens';
import { makeStyles, useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

// Borrar cuenta · from Ajustes › Cuenta, and from Setup for an account with no couple yet, so it sits outside both
// route guards. Says exactly what goes (the couple's space, for the partner too), asks to tick a box, and confirms
// with a code by email when the sign-in is older than Clerk allows. The order of the steps: src/lib/deleteAccount.ts.
export default function DeleteAccount() {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const styles = useStyles();
  const signedIn = useSessionStore((s) => s.userId !== null) || DEV_BYPASS_AUTH;
  const hasCouple = useSessionStore((s) => s.householdId !== null);
  const email = useSessionStore((s) => s.email);
  const couple = useCouple();
  const plan = usePlan();
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The masked email the code went to, once one was sent. */
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);

  if (!signedIn) return <Redirect href="/welcome" />;

  const partner = hasCouple && couple.data?.partnerJoined ? couple.data.partner.name : null;
  const done = () => router.replace('/welcome');
  const failure = (e: unknown) => (e instanceof NoEmailFactorError ? m.deleteAccount.errors.noEmail : deletionErrorMessage(e, m));

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      if ((await deleteMyAccount()) === 'deleted') return done();
      setCodeSentTo(await sendDeletionCode());
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  };

  if (codeSentTo) {
    return (
      <CodeStep
        title={m.deleteAccount.codeTitle}
        lead={m.deleteAccount.codeLead(codeSentTo)}
        submitLabel={m.deleteAccount.delete}
        submitKind="danger"
        errorMessage={failure}
        onVerify={async (code) => {
          await confirmDeletionCode(code);
          if ((await deleteMyAccount()) === 'deleted') done();
        }}
        onResend={async () => {
          await sendDeletionCode();
        }}
      />
    );
  }

  const items = [
    email ? m.deleteAccount.yourAccount(email) : m.deleteAccount.yourAccountNoEmail,
    partner ? m.deleteAccount.sharedSpace(partner) : m.deleteAccount.soloSpace,
    ...(partner ? [m.deleteAccount.partnerToo(partner)] : []),
  ];

  return (
    <Screen
      title={m.deleteAccount.title}
      lead={m.deleteAccount.lead}
      back="back"
      footer={<NavButton label={m.deleteAccount.delete} kind="danger" onPress={start} disabled={!understood} loading={busy} />}
    >
      <View style={styles.card}>
        {items.map((item) => (
          <View key={item} style={styles.item}>
            <Icon name="trash" size={20} color={color.negative} />
            <Text style={[type.body, { flex: 1 }]}>{item}</Text>
          </View>
        ))}
      </View>
      <Text style={[type.body, { color: color.textSecondary, fontSize: 15 }]}>{m.deleteAccount.keepNote}</Text>

      {/* The store subscription isn't part of the account: Apple asks apps to say billing continues through the store
          and to ask to cancel first; Google, that a step needed before deleting is clearly explained. */}
      {hasCouple && deletionNotice(plan.info) === 'payer' && (
        <View style={{ gap: space[3] }}>
          <Callout icon="bell" tone="neutral">
            {m.deleteAccount.subscriptionPayer}
          </Callout>
          <NavButton label={m.deleteAccount.manageFirst} kind="secondary" onPress={() => void manageSubscriptions()} />
        </View>
      )}
      {hasCouple && partner && deletionNotice(plan.info) === 'partner' && (
        <Callout icon="bell" tone="neutral">
          {m.deleteAccount.subscriptionPartner(partner)}
        </Callout>
      )}

      <Checkbox
        checked={understood}
        onToggle={() => setUnderstood((v) => !v)}
        label={partner ? m.deleteAccount.confirm(partner) : m.deleteAccount.confirmSolo}
      >
        {partner ? m.deleteAccount.confirm(partner) : m.deleteAccount.confirmSolo}
      </Checkbox>

      {error && (
        <Text style={[type.label, { color: color.negative }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </Text>
      )}
    </Screen>
  );
}

const useStyles = makeStyles(({ color }) => StyleSheet.create({
  card: { backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.line, padding: space[4], gap: space[3] },
  item: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start' },
}));
