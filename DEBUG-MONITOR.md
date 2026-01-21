# Debugging Monitor Issues

## Issue: Monitor Not Finding Repositories

### Fixes Applied

1. **Added Repository Search Qualifiers**
   - Repository searches now automatically include `in:name,description,readme` qualifiers
   - This ensures GitHub searches in repository names, descriptions, and README files

2. **Added Debug Logging**
   - Worker now logs the search query being used
   - Logs which search surfaces are being queried
   - Logs how many results are found per surface
   - GitHub client logs the actual query sent to GitHub API

### How to Debug

1. **Check Worker Logs**
   - Look at the terminal where `npm run worker` is running
   - You should see logs like:
     ```
     Monitor abc-123: Searching with query: "your-search-term"
     Monitor abc-123: Search surfaces: repo
     Monitor abc-123: Searching repo...
     [GitHub] Searching repositories with query: "your-search-term in:name,description,readme" (page 1)
     [GitHub] Repository search returned X total results, Y on this page
     Monitor abc-123: Found Y results in repo
     ```

2. **Check Monitor Status**
   - Go to Monitors page
   - Click on your monitor
   - Check the "Recent Runs" section
   - Look for error messages

3. **Verify Search Query**
   - The query should include `in:name,description,readme` for repo searches
   - For example: `"shield" in:name,description,readme`

### Common Issues

1. **Query Too Specific**
   - If your search term is very specific, try a broader term
   - GitHub search is case-insensitive but exact matches work better

2. **Repository is Private**
   - GitHub search only finds public repositories
   - Private repos won't appear in search results

3. **Repository Too New**
   - If using `createdAfter` filter, very new repos might be excluded
   - Check the monitor's last run time

4. **Rate Limiting**
   - Check if you're hitting GitHub rate limits
   - Look for "Rate limited" errors in monitor status

### Testing Your Query

You can test your search query directly on GitHub:
1. Go to https://github.com/search
2. Select "Repositories"
3. Enter your query with qualifiers: `your-term in:name,description,readme`
4. See if results appear

### Next Steps

1. **Restart the Worker** (if needed):
   ```powershell
   # Stop current worker (Ctrl+C)
   npm run worker
   ```

2. **Manually Trigger a Monitor Run**:
   - The monitor will run automatically on its schedule
   - Or wait for the next scheduled run

3. **Check Results**:
   - Go to Results page
   - Filter by your monitor
   - Results should appear if found

### If Still Not Working

1. Check worker terminal for error messages
2. Verify GitHub token has correct permissions
3. Test the query directly on GitHub's website
4. Check monitor configuration (query type, search surfaces)
5. Verify the repository is public and matches your search term
