# Backend TODOs

## 🚨 URGENT: Fix Supabase Admin API Error in Room Participants

### Issue Description

The backend is failing when trying to fetch room participants due to Supabase Admin API permissions error:

```
⚠️ Admin getUserById failed for 475e7e07-4be1-4a9a-9c0c-7ab2877b13cb: AuthApiError: User not allowed
    at async GoTrueAdminApi.getUserById
    at async getRoomParticipants (Backend\apps\core\src\services\roomUserService.ts:114:11)
    at async getRoomParticipantsHandler (Backend\apps\core\src\controllers\roomAccessController.ts:53:26)
Error: { __isAuthError: true, status: 403, code: 'not_admin' }
```

### Root Cause

The backend's `roomUserService.ts` is trying to use `supabase.auth.admin.getUserById()` which requires service role key privileges, but the current configuration doesn't have admin access.

### Current Status

- ❌ Admin API calls failing with 403 "not_admin" error
- ✅ RPC fallback mechanism is working and successfully retrieving user data
- ✅ Frontend API calls are correct and following documented endpoints

### Solution Options

#### Option 1: Configure Service Role Key (RECOMMENDED)

**Files to modify:**

- Backend environment configuration
- Supabase client initialization for admin operations

**Steps:**

1. **Update Environment Variables**

   ```env
   # Add to your backend .env file
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

2. **Update Supabase Admin Client Initialization**

   ```typescript
   // In your backend Supabase configuration file
   import { createClient } from "@supabase/supabase-js";

   const supabaseAdmin = createClient(
     process.env.SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key, not anon key
     {
       auth: {
         autoRefreshToken: false,
         persistSession: false,
       },
     }
   );
   ```

3. **Ensure roomUserService.ts uses admin client**
   ```typescript
   // In Backend\apps\core\src\services\roomUserService.ts around line 114
   // Make sure you're using the admin client for getUserById calls
   const userResponse = await supabaseAdmin.auth.admin.getUserById(userId);
   ```

#### Option 2: Use RPC as Primary Method (ALTERNATIVE)

**Files to modify:**

- `Backend\apps\core\src\services\roomUserService.ts`

**Steps:**

1. **Refactor getRoomParticipants function** (around line 114)

   - Remove the admin API call attempt
   - Use the existing RPC fallback as the primary method
   - Keep the RPC call that's already working: `data: { id, email, name, created_at }`

2. **Remove admin API dependency**

   ```typescript
   // Instead of:
   // const userResponse = await supabase.auth.admin.getUserById(userId);

   // Use the working RPC call directly:
   const { data: userData, error } = await supabase.rpc("get_user_profile", {
     user_id: userId,
   });
   ```

### Testing Requirements

After implementing the fix:

1. **Test the participants endpoint:**

   ```bash
   GET /api/rooms/{roomId}/participants
   ```

2. **Verify no admin API errors in logs**

3. **Confirm frontend UsersPane displays participants correctly**

4. **Test with both:**
   - Room members (users who have joined)
   - Invited users (users with email invitations who haven't joined yet)

### Impact

- **High Priority**: This affects the core functionality of room user management
- **User Experience**: Users cannot see room participants or manage access properly
- **Frontend**: The frontend is already correctly implemented and waiting for backend fix

### Related Files

- `Backend\apps\core\src\services\roomUserService.ts` (line 114)
- `Backend\apps\core\src\controllers\roomAccessController.ts` (line 53)
- Backend environment configuration
- Supabase client configuration

### Notes

- The RPC fallback is already working perfectly and returning correct user data
- Frontend API client (`src/lib/apiClient.ts`) is correctly calling `/api/rooms/{id}/participants`
- API documentation matches the frontend implementation
- No frontend changes required - this is purely a backend configuration/implementation issue
