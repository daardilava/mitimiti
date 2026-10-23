import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { balanceKeys, useSettlements } from '@/api/balance';
import { coupleKey, expenseKeys, useCouple, useExpenses } from '@/api/expenses';
import { sharePdf, shareTextFile } from '@/api/exportFile';
import { usePlan } from '@/api/plan';
import { buildCsv, EXPORT_PRESETS, exportFileName, exportRows, exportSummary, presetRange, type ExportPreset } from '@/lib/exportData';
import { buildPdfHtml } from '@/lib/exportPdf';
import { canUseFeature } from '@/lib/plans';
import { Chip, Field, RadioCard } from '@/ui/Form';
import { Locked } from '@/ui/Premium';
import { NavButton, Pending, Screen } from '@/ui/Screen';
import { space } from '@/ui/tokens';
import { useTheme } from '@/ui/theme';
import { useI18n } from '@/i18n';

// Exportar movimientos · from Ajustes. Pick a period and a format: a CSV for spreadsheets, or a PDF report with totals
// and the balance. Either goes out through the share sheet.
export default function Export() {
  const { m, d } = useI18n();
  const { color, type } = useTheme();
  const client = useQueryClient();
  const couple = useCouple();
  const expenses = useExpenses();
  const settlements = useSettlements();
  const [preset, setPreset] = useState<ExportPreset>('thisMonth');
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { gate } = usePlan();

  const range = useMemo(() => presetRange(preset), [preset]);
  const rows = useMemo(
    () => (couple.data && expenses.data && settlements.data ? exportRows(expenses.data, settlements.data, range, couple.data) : null),
    [couple.data, expenses.data, settlements.data, range],
  );

  // Reached some other way than Ajustes' (labelled) entry point: still closed on Free.
  if (!canUseFeature(gate, 'export')) {
    return (
      <Screen title={m.exportData.title} back="back">
        <Locked title={m.premium.exportTitle} detail={m.premium.exportDetail} from="export" />
      </Screen>
    );
  }

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

  const exportFile = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const name = exportFileName(range, format, m);
      if (format === 'csv') await shareTextFile(name, buildCsv(rows, couple.data!, m), 'csv', m.exportData.title);
      else {
        const html = buildPdfHtml({ rows, range, couple: couple.data!, allExpenses: expenses.data!, allPayments: settlements.data!, m, d });
        await sharePdf(name, html, m.exportData.title);
      }
    } catch (e) {
      console.warn(`[export] ${format} failed`, e);
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
          <NavButton label={format === 'csv' ? m.exportData.exportCsv : m.exportData.exportPdf} onPress={exportFile} disabled={rows.length === 0} loading={busy} />
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

      <Field label={m.exportData.format}>
        <View style={{ gap: space[3] }} accessibilityRole="radiogroup">
          <RadioCard title={m.exportData.csvTitle} detail={m.exportData.csvDetail} selected={format === 'csv'} onPress={() => setFormat('csv')} />
          <RadioCard title={m.exportData.pdfTitle} detail={m.exportData.pdfDetail} selected={format === 'pdf'} onPress={() => setFormat('pdf')} />
        </View>
      </Field>
    </Screen>
  );
}
