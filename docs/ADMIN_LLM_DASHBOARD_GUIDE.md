# Admin LLM Dashboard — Complete Setup Guide

## Overview

The Admin LLM Dashboard provides comprehensive management, monitoring, and configuration of the OpenRouter and OpenAI LLM providers integrated into Accoustica AI. It includes 4 specialized sub-tabs for complete LLM infrastructure control.

**Location:** Admin Console → "LLM Settings" tab (main tab bar)

## Dashboard Sub-Tabs

### 1. **Settings Tab** — Provider Configuration

Configure OpenRouter and OpenAI API keys, select primary provider, and manage retry/fallback logic.

**Features:**
- ✅ Primary provider selection (OpenRouter or OpenAI)
- ✅ Secure API key management (encrypted in localStorage)
- ✅ Individual "Test Connection" buttons for each provider
- ✅ Fallback enable/disable toggle
- ✅ Max retries configuration (0-5)
- ✅ Timeout settings (5s - 2m)
- ✅ Metrics collection toggle
- ✅ Debug mode for console logging
- ✅ Direct links to get API keys
- ✅ Copy-to-clipboard for sharing keys (safely)

**Configuration Persistence:**
All settings are saved to browser localStorage under `admin_llm_config`. Changes are immediate and don't require page reload.

```javascript
// Sample config structure
{
  primaryProvider: 'openrouter',
  enableFallback: true,
  openrouterKey: 'sk_live_...',
  openaiKey: 'sk-...',
  timeoutMs: 30000,
  maxRetries: 2,
  debugMode: false,
  enableMetrics: true,
  retryOnErrors: ['TIMEOUT', 'RATE_LIMIT', 'NETWORK_ERROR'],
}
```

**Test Connection:**
Click the blue "Test" button next to each API key to validate:
- ✅ Connection successful (status 200/400)
- ❌ Connection failed (detailed error message)
- ✅ Green checkmark = ready to use
- ❌ Red X = requires attention

---

### 2. **Health Tab** — Real-Time Provider Status

Monitor provider health, performance metrics, and call statistics in real-time.

**Key Metrics:**
- 📊 Total Calls (all time in current session)
- 📈 Success Rate (%)
- ⏱️ Average Duration (ms)
- 🔴 Errors in last 24h

**Provider Status Cards:**

Each provider (OpenRouter & OpenAI) displays:
- ✅ Health indicator (Healthy/Warning/Error)
- 📍 Success count
- ❌ Failed count
- ⏱️ Average response time
- 🕐 Last call timestamp

**Usage Distribution:**
- Real-time percentage split between providers
- Visual bar chart showing provider usage ratio
- Helps identify if fallback is working correctly

**Recent Calls Timeline:**
- Last 10 calls with status indicators
- Timestamp and duration for each call
- Provider and model information
- Error details if applicable
- Auto-updates every 2 seconds

---

### 3. **Metrics Tab** — Usage & Cost Tracking

Track API consumption, costs, and per-user analytics with advanced reporting.

**Cost Summary Cards:**
- 💰 Total Cost ($)
- ⚡ Total Tokens consumed
- 📞 Total API Calls
- 💵 Average cost per call

**Visual Analytics:**
- 📈 Daily Cost Trend (line chart, last 7 days)
- 🥧 Provider Cost Breakdown (pie chart)
- 📊 Top 10 Users by Cost (bar chart)

**Provider Breakdown Table:**
Shows for each provider:
- Calls made
- Tokens consumed
- Total cost
- Average cost per call

**Cost Calculation Model:**
```javascript
COSTS = {
  openrouter: $0.000001 per token (average)
  openai_gpt4: $0.00003 per input token
  openai_gpt35: $0.000001 per token (average)
}
```

**Time Range Filter:**
- Last 24h
- Last 7d
- Last 30d

---

### 4. **Error Log Tab** — Failure Tracking & Diagnostics

Monitor errors, retry attempts, and diagnostic information for troubleshooting.

**Error Statistics:**
- 📋 Total Logs
- 📊 Error Rate (%)
- ❌ Failed Calls
- 🔄 Retry Attempts
- ↩️ Fallback Used

**Error Analysis:**
- 🔴 Most Common Errors (top 6 types)
- 📈 Provider Error Rates
- 🔍 Error trend visualization

**Clickable Error Logs:**
View detailed information for any error:
- Provider that failed
- Model used
- Exact error message
- Timestamp
- Duration
- Whether it was retried
- Whether fallback was used

**Export Functionality:**
- 📥 Export error logs to CSV
- Includes all failures with timestamps and details
- Useful for reporting and analysis

**Filters:**
- All Events
- Errors Only
- Retries
- Successful Calls

---

## Setup Instructions

### Step 1: Access the Admin Console

1. Navigate to `/admin` route
2. Authenticate as admin user
3. Click "LLM Settings" tab in the main tab bar

### Step 2: Configure API Keys

1. **Get OpenRouter Key:**
   - Click "Get Key →" link in OpenRouter section
   - Sign up at https://openrouter.ai
   - Create API key from dashboard
   - Copy and paste into "OpenRouter API Key" field

2. **Get OpenAI Key (Optional):**
   - Click "Get Key →" link in OpenAI section
   - Sign up at https://platform.openai.com
   - Create API key from https://platform.openai.com/api-keys
   - Copy and paste into "OpenAI API Key" field

### Step 3: Test Connections

1. Click blue "Test" button next to each configured API key
2. Wait for connection test result (shows ✅ or ❌)
3. Both should show green checkmark before proceeding
4. If either fails, verify the API key is valid and has remaining quota

### Step 4: Configure Settings

1. **Select Primary Provider:**
   - Click "OpenRouter" or "OpenAI" button
   - Selected provider will be highlighted in green
   - This is used first for all LLM calls

2. **Enable Fallback:**
   - Toggle "Enable Fallback" switch
   - When ON, if primary provider fails, automatically switches to secondary
   - Recommended: ON (for reliability)

3. **Set Retry Limits:**
   - Adjust "Max Retries" (default: 2)
   - Range: 0-5 attempts
   - Higher = more resilient but slower

4. **Set Timeout:**
   - Adjust "Timeout (ms)" (default: 30000 = 30 seconds)
   - Range: 5000ms - 120000ms
   - Longer timeout for slower connections

5. **Enable Monitoring:**
   - Toggle "Enable Metrics" (recommended: ON)
   - Tracks usage for cost analysis
   - Toggle "Debug Mode" for console logging (dev only)

### Step 5: Save Configuration

Click "Save Changes" button when all settings are configured:
- Green button = changes ready to save
- Gray button = no changes to save
- Changes are persisted to browser localStorage

---

## Monitoring & Troubleshooting

### Health Status Indicators

| Status | Meaning | Action |
|--------|---------|--------|
| ✅ Healthy | Provider working | No action needed |
| ⚠️ Warning | Some errors but mostly working | Monitor closely |
| ❌ Error | Provider frequently failing | Check API key or quota |

### Common Issues

**Q: "Unauthorized" error when testing connection**
- A: Check API key is correct and not expired
- Copy key directly from provider dashboard (no spaces)
- Verify key has necessary permissions

**Q: "Rate Limited" error**
- A: Provider API rate limit reached
- Wait a few minutes before retrying
- Consider upgrading API plan
- Fallback to secondary provider should handle this automatically

**Q: "Timeout" errors**
- A: Increase timeout setting in Configuration tab
- Default 30s may be too short for complex requests
- Try 45000ms or 60000ms

**Q: No calls showing in metrics/error log**
- A: LLM calls haven't been made yet in this session
- Try generating music or running LLM-based feature
- Call history persists per browser session

### Monitoring Best Practices

1. **Check Health Status Weekly:** Review provider status for any patterns
2. **Track Costs:** Monitor daily cost trend to catch runaway usage
3. **Review Errors:** Check error log weekly for recurring issues
4. **Test Connections:** Re-test API connections monthly
5. **Backup Config:** Note your settings in case of browser cache clear

---

## Performance & Cost Optimization

### Recommendations

1. **Primary Provider Selection:**
   - Use OpenRouter as primary for **wider model variety** (100+ models)
   - Use OpenAI as primary for **maximum reliability** (GPT-4 only)
   - Most deployments use OpenRouter primary + OpenAI fallback

2. **Retry Configuration:**
   - Set to 2 retries for **most use cases**
   - Set to 1 retry for **low-latency requirements**
   - Set to 3+ retries for **reliability-critical features**

3. **Timeout Configuration:**
   - 30s (default) works for most requests
   - Increase to 45-60s for **complex generations**
   - Decrease to 15-20s for **real-time features**

### Cost Reduction Tips

1. Monitor top users by cost in Metrics tab
2. Consider rate limiting high-volume users
3. Use more cost-efficient models (OpenRouter auto-selection)
4. Enable metrics to track cost trends
5. Review daily cost trend in Metrics tab

---

## API Integration with Backend

The admin LLM configuration can be synced to backend via environment variables:

```bash
# Backend environment variables (optional)
OPENROUTER_API_KEY=sk_live_...
OPENAI_API_KEY=sk-...
LLM_PRIMARY_PROVIDER=openrouter
LLM_ENABLE_FALLBACK=true
LLM_TIMEOUT_MS=30000
LLM_MAX_RETRIES=2
LLM_DEBUG=false
```

The admin dashboard stores settings locally, but to use them on backend functions, manually configure these environment variables on your server.

---

## Data Storage

All LLM admin settings are stored in:

- **Browser localStorage:** `admin_llm_config` (JSON)
- **Call history:** `window.__LLM_CALL_HISTORY__` (up to 1000 recent calls)
- **Error logs:** Same as call history (filtered to errors)

**Important:** Clearing browser cache will reset these settings. Always save important configurations elsewhere.

---

## Statistics Reference

### Call History Structure
```javascript
{
  timestamp: "2024-01-15T10:30:45Z",
  provider: "openrouter",
  model: "openrouter/auto",
  success: true,
  duration: 1250,
  tokens: 450,
  retried: false,
  usedFallback: false,
  error: null,
  userId: "user@example.com"
}
```

### Metrics Calculations

- **Success Rate:** (successful_calls / total_calls) × 100
- **Avg Duration:** total_duration_ms / successful_calls
- **Cost:** tokens_consumed × cost_per_token_for_provider
- **Error Rate:** (failed_calls / total_calls) × 100

---

## Next Steps

After initial setup:

1. ✅ Monitor Health tab for 1 week
2. ✅ Review costs in Metrics tab
3. ✅ Check Error Log weekly
4. ✅ Optimize configuration based on usage patterns
5. ✅ Document your settings in team wiki

For questions or issues, contact the platform admin team.
