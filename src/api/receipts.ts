// Escanear (docs/PLAN.md › Scan + Dictate): shrink the photo on the phone, then ask the read-receipt Edge Function to
// read it. Never throws: offline, slow or refused calls come back as a reason the screen can say. The photo is never
// kept: it is sent once, read and forgotten on the server; the shrunk copy only sits in the app's cache.
// With EXPO_PUBLIC_DEV_BYPASS_AUTH=1 there is no backend, so a sample receipt answers instead.
import { FunctionsHttpError } from '@supabase/supabase-js';
import { SaveFormat, ImageManipulator } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { readReceiptResponseSchema, type ReadReceiptRequest, type ReceiptAi } from '../../supabase/functions/_shared/receipt';
import type { Currency } from '@/lib/money';
import { DEV_BYPASS_AUTH } from '@/lib/session';
import { supabase } from '@/lib/supabase';

/** Long side of the image sent, and its JPEG quality: enough to read every line, small enough to send fast. */
const MAX_SIDE = 1600;
const QUALITY = 0.6;
const TIMEOUT_MS = 30_000;

export type Shrunk = { kind: 'image'; base64: string } | { kind: 'failed' };

/** A photo from the camera or the library, down to MAX_SIDE px and JPEG 0.6, as base64. */
export async function shrinkPhoto(photo: { uri: string; width: number; height: number }): Promise<Shrunk> {
  try {
    const context = ImageManipulator.manipulate(photo.uri);
    if (Math.max(photo.width, photo.height) > MAX_SIDE) {
      context.resize(photo.width >= photo.height ? { width: MAX_SIDE, height: null } : { width: null, height: MAX_SIDE });
    }
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: QUALITY, base64: true });
    return saved.base64 ? { kind: 'image', base64: saved.base64 } : { kind: 'failed' };
  } catch {
    return { kind: 'failed' };
  }
}

export type LibraryPick = { kind: 'photo'; uri: string; width: number; height: number } | { kind: 'cancelled' } | { kind: 'failed' };

/** A receipt from the phone's photos. The system picker needs no permission on iOS 14+ and Android 13+. */
export async function pickFromLibrary(): Promise<LibraryPick> {
  try {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false });
    if (picked.canceled || !picked.assets?.[0]) return { kind: 'cancelled' };
    const { uri, width, height } = picked.assets[0];
    return { kind: 'photo', uri, width, height };
  } catch {
    return { kind: 'failed' };
  }
}

export type ReceiptAnswer =
  | { kind: 'receipt'; receipt: ReceiptAi }
  /** Free couple, once the Premium gate is on (the server checks it too). */
  | { kind: 'premium' }
  /** Today's 30 scans for the couple are used up. */
  | { kind: 'limit' }
  /** No connection, or no answer in time. */
  | { kind: 'offline' }
  /** Not a receipt, or too blurry to read. */
  | { kind: 'unreadable' }
  | { kind: 'failed' };

/** The sample receipt for dev bypass, in the sample couple's currency (amounts as they'd be printed). */
export function sampleReceipt(currency: Currency, today: string): ReceiptAi {
  const print = (cents: number) =>
    currency === 'COP' ? (cents * 10).toLocaleString('de-DE') : currency === 'EUR' ? (cents / 100).toFixed(2).replace('.', ',') : (cents / 100).toFixed(2);
  const yesterday = new Date(`${today}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  return {
    merchant: 'Panadería La Espiga',
    date: yesterday.toISOString().slice(0, 10),
    currency,
    items: [
      { name: 'Café con leche', qty: 2, total_text: print(640) },
      { name: 'Croissant', qty: 1, total_text: print(290) },
      { name: 'Bocadillo', qty: 1, total_text: print(1300) },
      { name: 'Zumo de naranja', qty: 1, total_text: print(250) },
    ],
    total_text: print(2480),
    category_hint: 'comida',
  };
}

export async function readReceipt(request: ReadReceiptRequest, sample: { currency: Currency }): Promise<ReceiptAnswer> {
  if (DEV_BYPASS_AUTH) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return { kind: 'receipt', receipt: sampleReceipt(sample.currency, request.today) };
  }
  const { data, error } = await supabase.functions.invoke('read-receipt', { method: 'POST', body: request, timeout: TIMEOUT_MS });
  if (error) {
    if (!(error instanceof FunctionsHttpError)) return { kind: 'offline' };
    const body = readReceiptResponseSchema.safeParse(await (error.context as Response).json().catch(() => null));
    if (!body.success || body.data.ok) return { kind: 'failed' };
    switch (body.data.error) {
      case 'not_premium':
        return { kind: 'premium' };
      case 'limit':
        return { kind: 'limit' };
      case 'unreadable':
        return { kind: 'unreadable' };
      default:
        return { kind: 'failed' };
    }
  }
  const body = readReceiptResponseSchema.safeParse(data);
  if (!body.success || !body.data.ok) return { kind: 'failed' };
  return { kind: 'receipt', receipt: body.data.receipt };
}
