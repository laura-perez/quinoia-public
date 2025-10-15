import { getServiceClient } from "../client";
import { createLogger } from "../../logger";
import type { UserStatus } from '../types/user.types';

export interface UserSession {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  // Join with user table
  user: {
    email: string;
    firstName: string | null;
    status: UserStatus;
    isFirstLogin: boolean;
    lastLoginAt: Date | null;
    lastMenuResultId: string | null;
  };
}

export interface CreateSessionInput {
  token: string;
  userId: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Repository for UserSession table operations
 */
export class SessionsRepository {
  private client = getServiceClient();
  private logger = createLogger();

  /**
   * Create a new user session
   */
  async create(input: CreateSessionInput): Promise<UserSession> {
    this.logger.debug('Creating session', { userId: input.userId });

    const { data, error } = await this.client
      .from('userSession')
      .insert([{
        token: input.token,
        userId: input.userId,
        expiresAt: input.expiresAt.toISOString(),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      }])
      .select(`
        *,
        user:userId (
          email,
          firstName,
          status,
          isFirstLogin,
          lastLoginAt
        )
      `)
      .single();

    if (error || !data) {
      this.logger.error('Session creation failed', {
        error,
        userId: input.userId
      });
      throw new Error(error?.message || "Session creation failed");
    }

    this.logger.info('Session created successfully', {
      userId: input.userId,
      expiresAt: input.expiresAt.toISOString(),
    });

    return {
      ...data,
      expiresAt: new Date(data.expiresAt),
      createdAt: new Date(data.createdAt),
      lastUsedAt: new Date(data.lastUsedAt),
      user: {
        ...data.user,
        lastLoginAt: data.user.lastLoginAt ? new Date(data.user.lastLoginAt) : null,
      },
    };
  }

  /**
   * Find session by token (with user data joined)
   */
  async findByToken(token: string): Promise<UserSession | null> {
    this.logger.debug('Finding session by token', {
      token: token.substring(0, 8) + '...'
    });

    const { data, error } = await this.client
      .from('userSession')
      .select(`
        *,
        user:userId (
          email,
          firstName,
          status,
          isFirstLogin,
          lastLoginAt,
          lastMenuResultId
        )
      `)
      .eq("token", token)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        this.logger.debug('Session not found', {
          token: token.substring(0, 8) + '...'
        });
        return null;
      }

      this.logger.error('Session lookup failed', { error });
      throw new Error(error.message || "Session lookup failed");
    }

    this.logger.debug('Session found', {
      userId: data.userId
    });

    return {
      ...data,
      expiresAt: new Date(data.expiresAt),
      createdAt: new Date(data.createdAt),
      lastUsedAt: new Date(data.lastUsedAt),
      user: {
        ...data.user,
        lastLoginAt: data.user.lastLoginAt ? new Date(data.user.lastLoginAt) : null,
      },
    };
  }

  /**
   * Update session lastUsedAt timestamp
   */
  async updateLastUsedAt(id: string): Promise<void> {
    this.logger.debug('Updating session lastUsedAt', { id });

    const { error } = await this.client
      .from('userSession')
      .update({
        lastUsedAt: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      this.logger.error('Update session lastUsedAt failed', { error, id });
      throw new Error(error.message || "Update session lastUsedAt failed");
    }

    this.logger.debug('Session lastUsedAt updated successfully', { id });
  }

  /**
   * Delete session by ID
   */
  async deleteById(id: string): Promise<void> {
    this.logger.debug('Deleting session', { id });

    const { error } = await this.client
      .from('userSession')
      .delete()
      .eq("id", id);

    if (error) {
      this.logger.error('Delete session failed', { error, id });
      throw new Error(error.message || "Delete session failed");
    }

    this.logger.info('Session deleted successfully', { id });
  }

  /**
   * Delete all sessions for a user (logout from all devices)
   */
  async deleteByUserId(userId: string): Promise<number> {
    this.logger.debug('Deleting all user sessions', { userId });

    const { data, error } = await this.client
      .from('userSession')
      .delete()
      .eq('userId', userId)
      .select('id');

    if (error) {
      this.logger.error('Delete user sessions failed', { error, userId });
      throw new Error(error.message || "Delete user sessions failed");
    }

    const deletedCount = data?.length || 0;
    this.logger.info('User sessions deleted', { userId, count: deletedCount });

    return deletedCount;
  }

  /**
   * Delete expired sessions (cleanup)
   * Should be called periodically via cron job
   */
  async deleteExpired(): Promise<number> {
    this.logger.debug('Deleting expired sessions');

    const { data, error } = await this.client
      .from('userSession')
      .delete()
      .lt('expiresAt', new Date().toISOString())
      .select('id');

    if (error) {
      this.logger.error('Delete expired sessions failed', { error });
      throw new Error(error.message || "Delete expired sessions failed");
    }

    const deletedCount = data?.length || 0;
    this.logger.info('Expired sessions deleted', { count: deletedCount });

    return deletedCount;
  }

  /**
   * List all active sessions for a user
   */
  async findByUserId(userId: string): Promise<UserSession[]> {
    this.logger.debug('Finding sessions by userId', { userId });

    const { data, error } = await this.client
      .from('userSession')
      .select(`
        *,
        user:userId (
          email,
          firstName,
          status,
          isFirstLogin,
          lastLoginAt
        )
      `)
      .eq('userId', userId)
      .gt('expiresAt', new Date().toISOString())
      .order('lastUsedAt', { ascending: false });

    if (error) {
      this.logger.error('Find sessions by userId failed', { error, userId });
      throw new Error(error.message || "Find sessions by userId failed");
    }

    this.logger.debug('Sessions found', {
      userId,
      count: data?.length || 0
    });

    return (data || []).map(session => ({
      ...session,
      expiresAt: new Date(session.expiresAt),
      createdAt: new Date(session.createdAt),
      lastUsedAt: new Date(session.lastUsedAt),
      user: {
        ...session.user,
        lastLoginAt: session.user.lastLoginAt ? new Date(session.user.lastLoginAt) : null,
      },
    }));
  }
}

// Export singleton instance
export const sessionsRepository = new SessionsRepository();
