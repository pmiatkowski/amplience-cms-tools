type DeliveryKeyParams = {
  oldKey?: string | null | undefined;
  newLocale: string;
  placement: 'prefix' | 'suffix';
};

export function generateNewDeliveryKey({
  oldKey,
  newLocale,
  placement,
}: DeliveryKeyParams): string {
  if (!oldKey) return newLocale;

  if (placement === 'suffix') {
    return oldKey.replace(/-([a-z]{2}-[a-z]{2})$/i, `-${newLocale}`);
  }

  return oldKey.replace(/^([a-z]{2}-[a-z]{2})/i, newLocale);
}
