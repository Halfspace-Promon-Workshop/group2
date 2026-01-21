# Rate Limit Error Fix

## Issue
Monitors showing "Error rate limited" status that persists even after rate limits should have reset.

## Fixes Applied

### 1. Proactive Rate Limit Checking
- Added check before starting searches to see if rate limit is low
- If rate limit is below 5 requests, waits until reset before running
- Provides clear message about when rate limit will reset

### 2. Better Error Messages
- Rate limit errors now show:
  - How many requests are remaining
  - When the rate limit will reset
  - Estimated wait time

### 3. Auto-Recovery
- Monitors automatically clear rate limit errors after 70 minutes
- Errors are cleared when monitor successfully completes
- Status returns to "active" when rate limit resets

### 4. Improved UI Display
- Rate limit errors shown in yellow (warning) instead of red (error)
- Clear message that monitor will auto-resume
- Suggestion to try "Run Now" after waiting

## How It Works

1. **Before Search**: Checks if rate limit is low (< 5 requests)
   - If low, waits until reset time
   - Updates monitor status with reset time
   - Reschedules job for after reset

2. **During Search**: If rate limited during search
   - Extracts reset time from GitHub response
   - Updates monitor with clear error message
   - Reschedules for after reset

3. **After Reset**: On next run
   - Clears old rate limit errors (if > 70 minutes old)
   - Proceeds with search normally
   - Clears error status on successful completion

## What You'll See

**In the UI:**
- Yellow warning box (not red error) for rate limits
- Message: "Rate limit: X requests remaining. Resets at [time]"
- Note that monitor will auto-resume

**In Worker Logs:**
- "Rate limit warning: X requests remaining"
- "Rate limit low. Waiting Xs until reset"
- "Clearing old rate limit error"

## Manual Recovery

If you see a rate limit error:

1. **Wait**: Rate limits reset every hour
2. **Check Reset Time**: Look at the error message for reset time
3. **Try "Run Now"**: After the reset time, click "Run Now"
4. **Or Wait**: The monitor will automatically retry after reset

## Rate Limit Details

- **GitHub Search API**: 30 requests per minute (authenticated)
- **Reset Time**: Every hour on the hour
- **Per User**: Each user's token has its own rate limit
- **Budget**: ~25 requests per monitor run (code + repo + issues + PRs)

## Tips to Avoid Rate Limits

1. **Increase Intervals**: Use 6-hour intervals instead of 5 minutes
2. **Fewer Surfaces**: Search only "code" instead of all surfaces
3. **One Monitor at a Time**: Don't run multiple monitors simultaneously
4. **Check Before Manual Run**: Wait if you see rate limit warnings

The rate limit error should now clear automatically when the limit resets!
