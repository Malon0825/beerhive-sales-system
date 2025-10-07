import { NextRequest, NextResponse } from 'next/server';
import { UserRepository } from '@/data/repositories/UserRepository';
import { UserService } from '@/core/services/users/UserService';
import { AppError } from '@/lib/errors/AppError';
import { requireManagerOrAbove } from '@/lib/utils/api-auth';

// In-memory request tracking to prevent duplicate submissions
// Key: username-email, Value: { timestamp, processing: boolean }
const activeRequests = new Map<string, { timestamp: number; processing: boolean }>();

/**
 * Clean up stale requests (older than 30 seconds)
 */
function cleanupStaleRequests() {
  const now = Date.now();
  const STALE_THRESHOLD = 30000; // 30 seconds
  
  for (const [key, value] of activeRequests.entries()) {
    if (now - value.timestamp > STALE_THRESHOLD) {
      console.log(`[API /users] Cleaning up stale request: ${key}`);
      activeRequests.delete(key);
    }
  }
}

/**
 * GET /api/users
 * Get all users (Admin/Manager only)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user has manager or admin role
    await requireManagerOrAbove(request);
    
    const users = await UserRepository.getAll();

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    console.error('GET /api/users error:', error);
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Create new user (Admin/Manager only)
 * Includes validation to prevent race conditions and provide clear error messages
 * 
 * Features:
 * - Request deduplication (prevents double-click submissions)
 * - Comprehensive logging for debugging
 * - Atomic user creation with rollback on failure
 */
export async function POST(request: NextRequest) {
  const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  let requestKey: string | null = null;
  
  try {
    console.log(`\n========================================`);
    console.log(`[API /users] ${requestId} 📨 New user creation request received`);
    console.log(`[API /users] ${requestId} Timestamp: ${new Date().toISOString()}`);
    
    // Clean up stale requests
    cleanupStaleRequests();
    
    // Verify user has manager or admin role
    console.log(`[API /users] ${requestId} Step 1: Verifying authorization...`);
    await requireManagerOrAbove(request);
    console.log(`[API /users] ${requestId} ✅ Authorization verified`);
    
    const body = await request.json();
    const { username, email, password, full_name, role, roles } = body;
    
    console.log(`[API /users] ${requestId} Step 2: Validating request body...`);
    console.log(`[API /users] ${requestId} Request data:`, {
      username,
      email,
      full_name,
      role,
      roles,
      hasPassword: !!password
    });

    // Validate required fields
    if (!username || !email || !password || !full_name) {
      console.error(`[API /users] ${requestId} ❌ Missing required fields`);
      return NextResponse.json(
        { success: false, error: 'Username, email, password, and full name are required' },
        { status: 400 }
      );
    }
    
    // Require at least one role
    if (!roles && !role) {
      console.error(`[API /users] ${requestId} ❌ No role specified`);
      return NextResponse.json(
        { success: false, error: 'At least one role is required' },
        { status: 400 }
      );
    }
    
    console.log(`[API /users] ${requestId} ✅ Request body validated`);
    
    // Check for duplicate request (prevent double-click)
    requestKey = `${username.toLowerCase()}-${email.toLowerCase()}`;
    console.log(`[API /users] ${requestId} Step 3: Checking for duplicate request...`);
    console.log(`[API /users] ${requestId} Request key: ${requestKey}`);
    
    const existingRequest = activeRequests.get(requestKey);
    if (existingRequest && existingRequest.processing) {
      const timeAgo = Date.now() - existingRequest.timestamp;
      console.warn(`[API /users] ${requestId} ⚠️  DUPLICATE REQUEST DETECTED!`);
      console.warn(`[API /users] ${requestId} Another request for this user is already processing`);
      console.warn(`[API /users] ${requestId} Time since original request: ${timeAgo}ms`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'A request to create this user is already being processed. Please wait...' 
        },
        { status: 429 } // Too Many Requests
      );
    }
    
    // Mark request as processing
    activeRequests.set(requestKey, { timestamp: Date.now(), processing: true });
    console.log(`[API /users] ${requestId} ✅ No duplicate request found - proceeding`);
    console.log(`[API /users] ${requestId} Active requests: ${activeRequests.size}`);

    // Create user through service layer (includes validation and rollback logic)
    console.log(`[API /users] ${requestId} Step 4: Creating user via UserService...`);
    const user = await UserService.createUser(
      {
        username,
        email,
        password,
        full_name,
        role,    // Backward compatibility
        roles,   // Preferred
      },
      requestId // Pass request ID for tracing
    );
    
    console.log(`[API /users] ${requestId} ✅ User created successfully!`);
    console.log(`[API /users] ${requestId} User ID: ${user.id}`);
    console.log(`[API /users] ${requestId} Username: ${user.username}`);
    console.log(`========================================\n`);

    // Remove from active requests on success
    if (requestKey) {
      activeRequests.delete(requestKey);
      console.log(`[API /users] ${requestId} Removed from active requests`);
    }

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User created successfully',
    }, { status: 201 });
    
  } catch (error) {
    console.error(`[API /users] ${requestId} ❌ ERROR occurred:`, error);
    console.error(`[API /users] ${requestId} Error type: ${error?.constructor?.name}`);
    
    // Remove from active requests on error
    if (requestKey) {
      activeRequests.delete(requestKey);
      console.log(`[API /users] ${requestId} Removed from active requests (error cleanup)`);
    }
    
    if (error instanceof AppError) {
      // Log detailed error for debugging race conditions
      if (error.statusCode === 409) {
        console.error(`[API /users] ${requestId} 🚫 CONFLICT (409): ${error.message}`);
        console.error(`[API /users] ${requestId} This means the user already exists in the database`);
        console.error(`[API /users] ${requestId} Timestamp: ${new Date().toISOString()}`);
      }
      
      console.log(`========================================\n`);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    console.log(`========================================\n`);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
