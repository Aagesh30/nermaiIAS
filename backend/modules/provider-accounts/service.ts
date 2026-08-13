import { ProviderAccountRepository } from './repository';
import { IProviderAccount } from './types';
import { AppError } from '../../core/errors/AppError';
import { encrypt, decrypt } from '../../core/utils/encryption';

export class ProviderAccountService {
  private static repo = new ProviderAccountRepository();

  static async listAccounts(tenantId?: string): Promise<IProviderAccount[]> {
    const accounts = await this.repo.findAll(tenantId);
    return accounts.map(a => this.stripSecrets(a));
  }

  static async getAccountById(id: string, includeSecrets = false): Promise<IProviderAccount | null> {
    const account = await this.repo.findById(id);
    if (!account) return null;
    if (includeSecrets) {
      return this.decryptCredentials(account);
    }
    return this.stripSecrets(account);
  }

  static async createAccount(data: Omit<IProviderAccount, 'id'>): Promise<IProviderAccount> {
    const encrypted = this.encryptCredentials(data as IProviderAccount);
    const newAccount = await this.repo.create(encrypted);
    return this.stripSecrets(newAccount);
  }

  static async updateAccount(id: string, updates: Partial<IProviderAccount>): Promise<void> {
    if (updates.credentials) {
      updates = this.encryptCredentials(updates as IProviderAccount);
    }
    await this.repo.update(id, updates);
  }

  static async deleteAccount(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  static async acquireAccount(provider: string, tenantId?: string): Promise<IProviderAccount> {
    let account = await this.repo.acquireAccount(provider, tenantId);
    if (!account) {
      await new Promise(r => setTimeout(r, 100));
      account = await this.repo.acquireAccount(provider, tenantId);
    }

    if (!account) {
      throw new AppError(`No available ${provider} accounts. All accounts are at maximum capacity or unhealthy.`, 503);
    }

    return this.decryptCredentials(account);
  }

  static async releaseAccount(id: string): Promise<void> {
    await this.repo.releaseAccount(id);
  }

  private static stripSecrets(account: IProviderAccount): IProviderAccount {
    return {
      ...account,
      credentials: {
        clientId: account.credentials?.clientId ? '***' : undefined,
        accountId: account.credentials?.accountId ? '***' : undefined,
      }
    };
  }

  private static encryptCredentials(account: IProviderAccount): IProviderAccount {
    if (!account.credentials) return account;
    const creds = { ...account.credentials };
    if (creds.clientSecret && !creds.clientSecret.includes(':')) creds.clientSecret = encrypt(creds.clientSecret);
    if (creds.sdkSecret && !creds.sdkSecret.includes(':')) creds.sdkSecret = encrypt(creds.sdkSecret);
    if (creds.sdkKey && !creds.sdkKey.includes(':')) creds.sdkKey = encrypt(creds.sdkKey);
    if (creds.hostKey && !creds.hostKey.includes(':')) creds.hostKey = encrypt(creds.hostKey);
    if (creds.refreshToken && !creds.refreshToken.includes(':')) creds.refreshToken = encrypt(creds.refreshToken);
    return { ...account, credentials: creds };
  }

  private static decryptCredentials(account: IProviderAccount): IProviderAccount {
    if (!account.credentials) return account;
    const creds = { ...account.credentials };
    if (creds.clientSecret && creds.clientSecret.includes(':')) creds.clientSecret = decrypt(creds.clientSecret);
    if (creds.sdkSecret && creds.sdkSecret.includes(':')) creds.sdkSecret = decrypt(creds.sdkSecret);
    if (creds.sdkKey && creds.sdkKey.includes(':')) creds.sdkKey = decrypt(creds.sdkKey);
    if (creds.hostKey && creds.hostKey.includes(':')) creds.hostKey = decrypt(creds.hostKey);
    if (creds.refreshToken && creds.refreshToken.includes(':')) creds.refreshToken = decrypt(creds.refreshToken);
    return { ...account, credentials: creds };
  }
}
