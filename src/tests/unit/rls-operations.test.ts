/**
 * Tests for RLS operations
 */

import { vi } from 'vitest'
import { getUserWithRLS, getUserSubmissionsWithRLS, getUserMenuResultsWithRLS } from '@/lib/supabase/rlsOperations'

// Mock the logger
const mockLogger = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => mockLogger
}))

// Mock the anon Supabase client
const mockAnonClient = {
  from: vi.fn()
}

vi.mock('@/lib/supabase/client', () => ({
  getAnonClient: () => mockAnonClient
}))

describe('RLS Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset the chain of mocks for each test
    mockAnonClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      })
    })
  })

  describe('getUserWithRLS', () => {
    it('should fetch user data using anon client', async () => {
      const mockUserData = { id: 'user123', name: 'Test User' }
      
      mockAnonClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockUserData, error: null })
          })
        })
      })

      const result = await getUserWithRLS('user123')

      expect(mockAnonClient.from).toHaveBeenCalledWith('users')
      expect(result).toEqual(mockUserData)
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      const mockError = new Error('Database error')
      
      mockAnonClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: mockError })
          })
        })
      })

      const result = await getUserWithRLS('user123')

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching user with RLS:', { error: mockError })
    })

    it('should handle unexpected errors', async () => {
      mockAnonClient.from.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await getUserWithRLS('user123')

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith('Unexpected error in getUserWithRLS:', { error: expect.any(Error) })
    })
  })

  describe('getUserSubmissionsWithRLS', () => {
    it('should fetch user submissions using anon client', async () => {
      const mockSubmissions = [
        { id: 1, user_id: 'user123', data: 'submission1' },
        { id: 2, user_id: 'user123', data: 'submission2' }
      ]
      
      mockAnonClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockSubmissions, error: null })
          })
        })
      })

      const result = await getUserSubmissionsWithRLS('user123')

      expect(mockAnonClient.from).toHaveBeenCalledWith('submissions')
      expect(result).toEqual(mockSubmissions)
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    it('should return empty array on database error', async () => {
      const mockError = new Error('Database error')
      
      mockAnonClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: mockError })
          })
        })
      })

      const result = await getUserSubmissionsWithRLS('user123')

      expect(result).toEqual([])
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching submissions with RLS:', { error: mockError })
    })
  })

  describe('getUserMenuResultsWithRLS', () => {
    it('should fetch user menu results using anon client', async () => {
      const mockMenuResults = [
        { id: 1, userId: 'user123', result: 'menu1' },
        { id: 2, userId: 'user123', result: 'menu2' }
      ]
      
      mockAnonClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockMenuResults, error: null })
          })
        })
      })

      const result = await getUserMenuResultsWithRLS('user123')

      expect(mockAnonClient.from).toHaveBeenCalledWith('menuResult')
      expect(result).toEqual(mockMenuResults)
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    it('should return empty array when no data found', async () => {
      mockAnonClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      })

      const result = await getUserMenuResultsWithRLS('user123')

      expect(result).toEqual([])
      expect(mockLogger.error).not.toHaveBeenCalled()
    })
  })
})
