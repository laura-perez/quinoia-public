import { getServiceClient } from "../client";
import { createLogger, redact } from "../../logger";
import { TABLE_NAMES } from "../constants";
import type { Submission, CreateSubmissionInput } from "../types";

/**
 * Repository for Submission table operations
 */
export class SubmissionsRepository {
  private client = getServiceClient();
  private logger = createLogger();

  /**
   * Create a new submission
   */
  async create(input: CreateSubmissionInput): Promise<Submission> {
    this.logger.debug('Creating submission', { userId: input.userId });

    const { data, error } = await this.client
      .from(TABLE_NAMES.SUBMISSIONS)
      .insert([input])
      .select("*")
      .single();

    if (error || !data) {
      this.logger.error('Submission creation failed', { 
        error, 
        userId: input.userId 
      });
      throw new Error(error?.message || "Submission creation failed");
    }

    this.logger.info('Submission created successfully', { 
      submissionId: data.id,
      userId: input.userId 
    });

    return data;
  }

  /**
   * Find submission by ID
   */
  async findById(id: string): Promise<Submission | null> {
    this.logger.debug('Finding submission by ID', { submissionId: id });

    const { data, error } = await this.client
      .from(TABLE_NAMES.SUBMISSIONS)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        this.logger.debug('Submission not found', { submissionId: id });
        return null;
      }
      
      this.logger.error('Submission lookup failed', { error, submissionId: id });
      throw new Error(error.message || "Submission lookup failed");
    }

    this.logger.debug('Submission found', { submissionId: data?.id });
    return data;
  }

  /**
   * Find submissions by user ID
   */
  async findByUserId(userId: string, limit: number = 50): Promise<Submission[]> {
    this.logger.debug('Finding submissions by user ID', { userId, limit });

    const { data, error } = await this.client
      .from(TABLE_NAMES.SUBMISSIONS)
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error('Submissions lookup failed', { error, userId });
      throw new Error(error.message || "Submissions lookup failed");
    }

    this.logger.debug('Submissions found', { 
      userId, 
      count: data?.length || 0 
    });

    return data || [];
  }

  /**
   * Count submissions by user ID
   */
  async countByUserId(userId: string): Promise<number> {
    this.logger.debug('Counting submissions by user ID', { userId });

    const { count, error } = await this.client
      .from(TABLE_NAMES.SUBMISSIONS)
      .select("*", { count: "exact", head: true })
      .eq("userId", userId);

    if (error) {
      this.logger.error('Submission count failed', { error, userId });
      throw new Error(error.message || "Submission count failed");
    }

    this.logger.debug('Submission count completed', { userId, count });
    return count || 0;
  }
}

// Export singleton instance
export const submissionsRepository = new SubmissionsRepository();
