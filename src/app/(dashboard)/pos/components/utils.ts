export function getProductKeys(productId: string) {
  if (productId === '11111111-1111-1111-1111-111111111111') {
    return { main: 'M', p6: ',', p12: '.' };
  }
  if (productId === '22222222-2222-2222-2222-222222222222') {
    return { main: 'P' };
  }
  if (productId === '33333333-3333-3333-3333-333333333333') {
    return { main: 'K' };
  }
  if (productId === '44444444-4444-4444-4444-444444444444') {
    return { main: 'F', p6: 'G', p12: 'H' };
  }
  return null;
}

export const QUICK_CASH_BUTTONS = [
  { label: 'Exacto', val: 0, key: 'X' },
  { label: '$1k', val: 1000, key: 'Y' },
  { label: '$2k', val: 2000, key: 'W' },
  { label: '$5k', val: 5000, key: 'H' },
  { label: '$10k', val: 10000, key: 'O' },
  { label: '$20k', val: 20000, key: 'J' },
] as const;
