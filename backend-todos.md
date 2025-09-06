# Backend TODOs for User Management

## Issues Identified from Frontend

### 1. Participants API Response Format ✅ SHOULD BE FIXED

**Current Issue**: The `/api/rooms/{room_id}/participants` endpoint was returning incomplete or inconsistent user data.

**Frontend Updates Applied**:

- Updated UsersPane to use the new unified API format from the API docs
- Removed the separate call to `/api/rooms/{id}/access` for invited users
- Now expects the `/api/rooms/{id}/participants` endpoint to return both members and invited users
- Added proper handling for `user_id` being null for invited users
- Improved email validation and user display logic

**Expected API Response Format** (from updated API docs):

```json
{
  "message": "Room participants retrieved successfully",
  "participants": [
    {
      "user_id": "uuid-123",
      "email": "user@example.com",
      "status": "member",
      "user_type": "admin",
      "joined_at": "2024-01-15T10:30:00Z"
    },
    {
      "user_id": null,
      "email": "invited@example.com",
      "status": "invited",
      "user_type": "editor",
      "invited_at": "2024-01-16T10:30:00Z",
      "invited_by": "uuid-123"
    }
  ],
  "total_count": 2
}
```

### 2. User Profile Data ✅ IMPLEMENTED

**Frontend Solution**:

- Added `/api/users/profile` endpoint to apiClient
- UserContext already provides normalized user profile data from Supabase
- User display now uses email-based username extraction with proper fallbacks

### 3. Room Creator Information ✅ SHOULD BE WORKING

**Current Status**:

- Frontend caches room info including `created_by` field
- Admin detection works based on room creator ID
- Backup checks ensure room creator is always marked as admin

### 4. Duplicate User Prevention ✅ FRONTEND FIXED

**Frontend Fixes Applied**:

- Simplified user loading logic to rely on unified API response
- Removed duplicate user addition and update logic
- Added proper user existence checking
- Only manually add current user as absolute fallback (shouldn't happen with proper API)

### 5. User Display Issues ✅ FRONTEND FIXED

**Frontend Fixes Applied**:

- Improved `getDisplayName` function to show meaningful names
- Added fallback to show last 6 chars of user ID when email unavailable
- Better email validation in participant processing
- Proper handling of invited users vs members

## Backend Verification Checklist

### High Priority - Verify These Work Correctly:

1. **Unified Participants Endpoint**:

   - `/api/rooms/{id}/participants` should return both members AND invited users in one response
   - Members should have `status: "member"` and `user_id: "actual-id"`
   - Invited users should have `status: "invited"` and `user_id: null`
   - All participants should have valid `email` and `user_type` fields

2. **User Count Accuracy**:

   - Verify that the API doesn't return duplicate entries
   - Test with exactly 5 users in a room - should show exactly 5 in frontend
   - Ensure current user appears only once in the response

3. **Complete User Data**:

   - All participants should have valid `email` addresses
   - `user_type` should be one of: "admin", "editor", "viewer"
   - Room creator should be marked as `user_type: "admin"`

4. **User Profile Endpoint**:
   - `/api/users/profile` should return current user's complete profile
   - Should include `id`, `email`, and optionally `name`

### Medium Priority:

5. **Access Control**:

   - Ensure all room members (admin/editor/viewer) can access participants endpoint
   - Verify proper error responses for unauthorized users

6. **WebSocket Integration**:
   - Verify that WebSocket connections don't create duplicate participant records
   - Ensure real-time updates work correctly with the new unified format

## Testing Recommendations

1. **Test with exactly 5 users** in a room - frontend should show exactly 5
2. **Test with mix of members and invited users** - both should appear correctly
3. **Test user display** with various email formats and missing data
4. **Test permission levels** - ensure all room members can view participants
5. **Test real-time updates** - invite/join/leave should update participant list

## Status Summary

- ✅ **Frontend Issues Fixed**: User display, duplicate prevention, unified API handling
- 🔄 **Backend Verification Needed**: Ensure API matches expected format from API docs
- ⚠️ **Critical Test**: 5 users showing as 6 users issue should be resolved if API is correct
