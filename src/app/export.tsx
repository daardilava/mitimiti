import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { balanceKeys, useSettlements } from '@/api/balance';
import { coupleKey, expenseKeys, useCouple, useExpenses } from '@/api/expenses';
import { shareTextFile } from '@/api/exportFile';
import { buildCsv, EXPORT_PRESETS, exportFileName, exportRows, exportSummary, presetRange, type ExportPreset } from '@/lib/exportData';
import { Chip, Field } from '@/ui/Form';
import { NavButton, Pending, Screen } from '@/ui/Screen';
import { space } from '@/ui/tokens';
import { useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

// Exportar movimientos · from Ajustes. Pick a period; the expenses and payments go out as a CSV through the share sheet.
export default function Export() {
  const { m } = useI18n();
  const { color, type } = useTheme();
  const client = useQueryClient();
  const couple = useCouple();
  const expenses = useExpenses();
  const settlements = useSettlements();
  const [preset, setPreset] = useState<ExportPreset>('thisMonth');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const range = useMemo(() => presetRange(preset), [preset]);
  const rows = useMemo(
    () => (couple.data && expenses.data && settlements.data ? exportRows(expenses.data, settlements.data, range, couple.data) : null),
    [couple.data, expenses.data, settlements.data, range],
  );

  if (!rows || !couple.data) {
    return (
      <Screen title={m.exportData.title} back="back">
        <Pending
          failed={couple.isError || expenses.isError || settlements.isError}
          onRetry={() => [coupleKey, expenseKeys.all, balanceKeys.settlements].forEach((queryKey) => client.invalidateQueries({ queryKey }))}
        />
      </Screen>
    );
  }

  const exportCsv = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await shareTextFile(exportFileName(range, 'csv', m), buildCsv(rows, couple.data!, m), 'csv', m.exportData.title);
    } catch (e) {
      console.warn('[export] csv failed', e);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={m.exportData.title}
      lead={m.exportData.lead}
      back="back"
      footer={
        <View style={{ gap: space[2] }}>
          {failed && (
            <Text style={[type.label, { color: color.negative, textAlign: 'center' }]} accessibilityRole="alert">
              {m.exportData.failed}
            </Text>
          )}
          <NavButton label={m.exportData.exportCsv} onPress={exportCsv} disabled={rows.length === 0} loading={busy} />
        </View>
      }
    >
      <Field label={m.exportData.period}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }} accessibilityRole="radiogroup">
          {EXPORT_PRESETS.map((p) => (
            <Chip key={p} label={m.exportData.presets[p]} selected={preset === p} onPress={() => setPreset(p)} />
          ))}
        </View>
      </Field>
      <Text style={[type.body, { color: color.textSecondary }]} accessibilityLiveRegion="polite">
        {rows.length === 0 ? m.exportData.empty : exportSummary(rows, m)}
      </Text>
    </Screen>
  );
}
