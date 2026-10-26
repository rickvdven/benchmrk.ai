import { supabase } from './supabase';
import { cardImageUrl, cardPageUrl, type CardData, type CardFormat, type CardType } from './cards';

export type CardError = 'nickname_required' | 'rate_limited' | 'invalid_card' | 'unknown';

/** Makes a card from the numbers; the server adds nickname and division and checks the rest. Returns its code. */
export async function createCard(type: CardType, data: Omit<CardData, 'nickname' | 'division'>): Promise<string> {
  const { data: r, error } = await supabase.rpc('create_share_card', { _type: type, _data: data });
  if (error) {
    const m = error.message ?? '';
    throw Object.assign(new Error(m), { code: (['nickname_required', 'rate_limited', 'invalid_card'].find((c) => m.includes(c)) ?? 'unknown') as CardError });
  }
  return (r as { code: string }).code;
}

/** A card by its code, for the public page. Returns null when it does not exist (or was removed). */
export async function getCard(code: string): Promise<{ type: CardType; data: CardData; ref: string | null } | null> {
  const { data, error } = await supabase.rpc('share_card_get', { _code: code });
  if (error) throw error;
  return (data as { type: CardType; data: CardData; ref: string | null } | null) ?? null;
}

/** The owner can always remove a card; gone from the link page right away, from caches within a day. */
export async function deleteCard(code: string) {
  await supabase.from('share_cards').delete().eq('code', code);
}

export const absoluteCardLink = (code: string) => `${window.location.origin}${cardPageUrl(code)}`;

export async function fetchCardImage(code: string, format: CardFormat): Promise<Blob> {
  const r = await fetch(cardImageUrl(code, format));
  if (!r.ok) throw new Error(`card image ${r.status}`);
  return r.blob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Opens the share sheet with the image file; without file sharing it downloads the file and returns false. */
export async function shareCardFile(blob: Blob, filename: string, text: string): Promise<boolean> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') throw e;
    }
    return true;
  }
  downloadBlob(blob, filename);
  return false;
}
