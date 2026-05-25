export function isNumericValue(params: { value: unknown }): boolean {
  const { value } = params;
  if (value === null || value === undefined || value === '') return true;
  return /^-?\d*\.?\d+$/.test(String(value));
}

export function isPositiveValue(params: { value: unknown }): boolean {
  const { value } = params;
  if (value === null || value === undefined || value === '') return true;
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

export function getAmountError(params: { value: unknown }): string {
  const { value } = params;
  if (!isNumericValue({ value })) return 'Solo se permiten números';
  if (!isPositiveValue({ value })) return 'El valor debe ser mayor a 0';
  return '';
}

export function isAmountInvalid(params: { value: unknown }): boolean {
  const { value } = params;
  return !isNumericValue({ value }) || !isPositiveValue({ value });
}

export function isAmountTouched(params: { value: unknown }): boolean {
  const { value } = params;
  return value !== null && value !== undefined && String(value) !== '';
}
