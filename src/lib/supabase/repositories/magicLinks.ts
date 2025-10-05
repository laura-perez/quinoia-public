import { getServiceClient } from "../client";
import { createLogger, redact } from "../../logger";

export interface MagicLink {
  id: string;
  token: string;
  email: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface CreateMagicLinkInput {
  token: string;
  email: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Repository for MagicLink table operations
 */
export class MagicLinksRepository {
  private client = getServiceClient();
  private logger = createLogger();

  /**
   * Create a new magic link
   */
  async create(input: CreateMagicLinkInput): Promise<MagicLink> {
    this.logger.debug('Creating magic link', { email: redact(input.email) });

    const { data, error } = await this.client
      .from('magicLink')
      .insert([{
        token: input.token,
        email: input.email,
        expiresAt: input.expiresAt.toISOString(),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      }])
      .select("*")
      .single();

    if (error || !data) {
      this.logger.error('Magic link creation failed', {
        error,
        email: redact(input.email)
      });
      throw new Error(error?.message || "Magic link creation failed");
    }

    this.logger.info('Magic link created successfully', {
      email: redact(input.email),
      expiresAt: input.expiresAt.toISOString(),
    });

    return {
      ...data,
      expiresAt: new Date(data.expiresAt),
      usedAt: data.usedAt ? new Date(data.usedAt) : null,
      createdAt: new Date(data.createdAt),
    };
  }

  /**
   * Find magic link by token
   */
  async findByToken(token: string): Promise<MagicLink | null> {
    this.logger.debug('Finding magic link by token', {
      token: token.substring(0, 8) + '...'
    });

    const { data, error } = await this.client
      .from('magicLink')
      .select("*")
      .eq("token", token)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        this.logger.debug('Magic link not found', {
          token: token.substring(0, 8) + '...'
        });
        return null;
      }

      this.logger.error('Magic link lookup failed', { error });
      throw new Error(error.message || "Magic link lookup failed");
    }

    this.logger.debug('Magic link found', {
      email: redact(data.email)
    });

    return {
      ...data,
      expiresAt: new Date(data.expiresAt),
      usedAt: data.usedAt ? new Date(data.usedAt) : null,
      createdAt: new Date(data.createdAt),
    };
  }

  /**
   * Mark magic link as used
   */
  async markAsUsed(id: string): Promise<void> {
    this.logger.debug('Marking magic link as used', { id });

    const { error } = await this.client
      .from('magicLink')
      .update({
        usedAt: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      this.logger.error('Mark magic link as used failed', { error, id });
      throw new Error(error.message || "Mark magic link as used failed");
    }

    this.logger.info('Magic link marked as used successfully', { id });
  }

  /**
   * Delete expired magic links (cleanup)
   * Should be called periodically via cron job
   */
  async deleteExpired(): Promise<number> {
    this.logger.debug('Deleting expired magic links');

    const { data, error } = await this.client
      .from('magicLink')
      .delete()
      .lt('expiresAt', new Date().toISOString())
      .select('id');

    if (error) {
      this.logger.error('Delete expired magic links failed', { error });
      throw new Error(error.message || "Delete expired magic links failed");
    }

    const deletedCount = data?.length || 0;
    this.logger.info('Expired magic links deleted', { count: deletedCount });

    return deletedCount;
  }

  /**
   * Count magic links sent to email in last N hours (for rate limiting)
   */
  async countRecentByEmail(email: string, hoursAgo: number): Promise<number> {
    this.logger.debug('Counting recent magic links', {
      email: redact(email),
      hoursAgo
    });

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);

    const { count, error } = await this.client
      .from('magicLink')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .gte('createdAt', cutoffTime.toISOString());

    if (error) {
      this.logger.error('Count recent magic links failed', {
        error,
        email: redact(email)
      });
      throw new Error(error.message || "Count recent magic links failed");
    }

    this.logger.debug('Recent magic links counted', {
      email: redact(email),
      count
    });

    return count || 0;
  }
}

// Export singleton instance
export const magicLinksRepository = new MagicLinksRepository();
