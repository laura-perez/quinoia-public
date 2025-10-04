import { getServiceClient } from "../client";
import { createLogger, redact } from "../../logger";
import { TABLE_NAMES } from "../constants";
import type { User, CreateUserInput, UpsertUserInput } from "../types";

/**
 * Repository for User table operations
 */
export class UsersRepository {
  private client = getServiceClient();
  private logger = createLogger();

  /**
   * Create a new user
   */
  async create(input: CreateUserInput): Promise<User> {
    this.logger.debug('Creating user', { email: redact(input.email) });

    const { data, error } = await this.client
      .from(TABLE_NAMES.USERS)
      .insert([input])
      .select("*")
      .single();

    if (error || !data) {
      this.logger.error('User creation failed', { 
        error, 
        email: redact(input.email) 
      });
      throw new Error(error?.message || "User creation failed");
    }

    this.logger.info('User created successfully', { 
      userId: data.id,
      email: redact(input.email) 
    });

    return data;
  }

  /**
   * Upsert user by email (create if not exists, return if exists)
   * Only updates fields that are explicitly provided (not undefined)
   */
  async upsert(input: UpsertUserInput): Promise<User> {
    this.logger.debug('Upserting user', { email: redact(input.email) });

    // Filter out undefined values to prevent overwriting existing data
    const cleanInput = Object.fromEntries(
      Object.entries(input).filter(([_, value]) => value !== undefined)
    ) as UpsertUserInput;

    const { data, error } = await this.client
      .from(TABLE_NAMES.USERS)
      .upsert([cleanInput], { onConflict: "email" })
      .select("*")
      .single();

    if (error || !data) {
      this.logger.error('User upsert failed', {
        error,
        email: redact(input.email)
      });
      throw new Error(error?.message || "User upsert failed");
    }

    this.logger.info('User upsert successful', {
      userId: data.id,
      email: redact(input.email)
    });

    return data;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    this.logger.debug('Finding user by email', { email: redact(email) });

    const { data, error } = await this.client
      .from(TABLE_NAMES.USERS)
      .select("*")
      .eq("email", email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        this.logger.debug('User not found', { email: redact(email) });
        return null;
      }
      
      this.logger.error('User lookup failed', { 
        error, 
        email: redact(email) 
      });
      throw new Error(error.message || "User lookup failed");
    }

    this.logger.debug('User found', { 
      userId: data?.id,
      email: redact(email) 
    });

    return data;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    this.logger.debug('Finding user by ID', { userId: id });

    const { data, error } = await this.client
      .from(TABLE_NAMES.USERS)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        this.logger.debug('User not found', { userId: id });
        return null;
      }

      this.logger.error('User lookup failed', { error, userId: id });
      throw new Error(error.message || "User lookup failed");
    }

    this.logger.debug('User found', { userId: data?.id });
    return data;
  }

  /**
   * Update user's last submission tracking fields
   */
  async updateLastSubmission(userId: string, menuResultId: string): Promise<void> {
    this.logger.debug('Updating user last submission', {
      userId,
      menuResultId
    });

    const { error } = await this.client
      .from(TABLE_NAMES.USERS)
      .update({
        lastSubmissionAt: new Date().toISOString(),
        lastMenuResultId: menuResultId
      })
      .eq("id", userId);

    if (error) {
      this.logger.error('User last submission update failed', {
        error,
        userId,
        menuResultId
      });
      throw new Error(error.message || "User last submission update failed");
    }

    this.logger.info('User last submission updated successfully', {
      userId,
      menuResultId
    });
  }

  /**
   * Update user status
   */
  async updateStatus(userId: string, status: string): Promise<void> {
    this.logger.debug('Updating user status', {
      userId,
      status
    });

    const { error } = await this.client
      .from(TABLE_NAMES.USERS)
      .update({ status })
      .eq("id", userId);

    if (error) {
      this.logger.error('User status update failed', {
        error,
        userId,
        status
      });
      throw new Error(error.message || "User status update failed");
    }

    this.logger.info('User status updated successfully', {
      userId,
      status
    });
  }

  /**
   * Update user status after trial usage
   */
  async markTrialAsUsed(userId: string): Promise<void> {
    this.logger.debug('Marking trial as used', { userId });

    const { error } = await this.client
      .from(TABLE_NAMES.USERS)
      .update({
        status: 'trial_used',
        hasUsedTrial: true
      })
      .eq("id", userId);

    if (error) {
      this.logger.error('Mark trial as used failed', {
        error,
        userId
      });
      throw new Error(error.message || "Mark trial as used failed");
    }

    this.logger.info('Trial marked as used successfully', { userId });
  }
}

// Export singleton instance
export const usersRepository = new UsersRepository();
