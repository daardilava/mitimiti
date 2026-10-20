// Exportar movimientos: writes the file to the app's cache and opens the system share sheet (save to Files, Drive,
// email, WhatsApp…). The cache is the OS's to clear, so nothing piles up. On web (development only) there is no file
// system: the CSV downloads, and the PDF opens the browser's print dialog (Save as PDF).
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const TYPES = {
  csv: { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' },
  pdf: { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' },
} as const;

export type ExportKind = keyof typeof TYPES;

export async function shareTextFile(name: string, contents: string, kind: ExportKind, dialogTitle: string): Promise<void> {
  const { mimeType } = TYPES[kind];
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([contents], { type: `${mimeType};charset=utf-8` }));
    const link = Object.assign(document.createElement('a'), { href: url, download: name });
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(contents);
  await share(file, kind, dialogTitle);
}

/** Renders the HTML to an A4 PDF (expo-print), names it like the CSV, and shares it. */
export async function sharePdf(name: string, html: string, dialogTitle: string): Promise<void> {
  if (Platform.OS === 'web') {
    // expo-print on web prints the current page (the app), so print the report from its own window instead.
    const report = window.open('', '_blank');
    if (!report) throw new Error('popup_blocked');
    report.document.write(html);
    report.document.close();
    report.print();
    return;
  }
  // A4 in points (72 per inch): 595 × 842. Android takes the margins from the HTML's @page (16 mm, 18 mm at the
  // bottom); iOS ignores @page and takes them here, in points. expo-print saves it in the cache under a random name.
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842, margins: { top: 45, right: 45, bottom: 51, left: 45 } });
  const file = new File(uri);
  await file.move(new File(Paths.cache, name), { overwrite: true });
  await share(file, 'pdf', dialogTitle);
}

async function share(file: File, kind: ExportKind, dialogTitle: string) {
  const { mimeType, UTI } = TYPES[kind];
  if (!(await Sharing.isAvailableAsync())) throw new Error('sharing_unavailable');
  await Sharing.shareAsync(file.uri, { mimeType, UTI, dialogTitle });
}
