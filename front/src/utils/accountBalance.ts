import type { Account } from '@/stores/accountsStore';

export function getAccountName(params: {
  accountId: string | number | null | undefined;
  accounts: Account[];
}): string {
  const { accountId, accounts } = params;
  if (!accountId) return '';
  const account = accounts.find((a) => String(a.id) === String(accountId));
  return account?.name || '';
}
