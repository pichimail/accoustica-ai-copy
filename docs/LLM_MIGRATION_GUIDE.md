# Complete LLM Migration: InvokeLLM → OpenRouter + OpenAI with Fallback

## Executive Summary

This guide covers replacing all 18 InvokeLLM calls (across 9 files) with OpenRouter API (primary) + OpenAI API (fallback), while preserving all existing prompts and functionality.

### Current Implementation
- **Current Service**: Base44 InvokeLLM integration
- **Usage**: 18 calls across 9 files
- **Files Affected**: 
  - Frontend: 8 components (4 in src/components/)
  - Backend: 1 function (base44/functions/masterAudio/)
  
### New Implementation
- **Primary API**: OpenRouter (supports 100+ models)
- **Fallback API**: OpenAI (GPT-4, GPT-3.5-turbo)
- **Admin Control**: Feature flags for API selection
- **Cost Tracking**: Per-call logging with model and cost
- **Error Recovery**: Automatic fallback with retry logic

---

## Phase 1: Setup & Configuration

### 1.1 Environment Variables

Create/update your `.env.local` file:

```bash
# OpenRouter Configuration
VITE_OPENROUTER_API_KEY=sk_live_your_key_here
VITE_OPENROUTER_MODEL=openrouter/auto
VITE_OPENROUTER_ENABLED=true

# OpenAI Fallback Configuration
VITE_OPENAI_API_KEY=sk-your_key_here
VITE_OPENAI_MODEL=gpt-4-turbo-preview
VITE_OPENAI_ENABLED=true

# LLM Service Configuration
VITE_LLM_PRIMARY_PROVIDER=openrouter
VITE_LLM_ENABLE_FALLBACK=true
VITE_LLM_TIMEOUT_MS=30000
VITE_LLM_MAX_RETRIES=2
VITE_LLM_DEBUG=false
```

### 1.2 Dependencies

```bash
npm install openai axios
```

---

## Phase 2: LLM Service Architecture

### 2.1 Service Structure

```
src/services/
├─ llmService.js           (Main LLM wrapper)
├─ llmErrorHandler.js      (Error classification)
└─ llmCallLogger.js        (Call tracking)

src/lib/
└─ llmServiceBackend.ts    (Backend LLM service)
```

### 2.2 Key Features

- **Unified API**: Single `llmService.invoke()` call
- **Transparent Fallback**: Automatic provider switching
- **Error Recovery**: Configurable retry logic
- **Call Logging**: Full audit trail
- **Admin Control**: Feature flags override
- **Cost Tracking**: Per-call cost calculation

---

## Phase 3: Migration Files (18 total)

### Frontend Components (17 calls)
1. SongStructureBuilder.jsx - 1 call
2. CreateMusicForm.jsx - 3 calls
3. AICollaborationPanel.jsx - 3 calls
4. StudioGeneratePanel.jsx - 2 calls
5. AdvancedMasteringStudio.jsx - 1 call
6. EnhancedMasteringDialog.jsx - 1 call
7. MusicTheoryAssistant.jsx - 2 calls
8. ForYou.jsx - 1 call
9. masterAudio/entry.ts - 1 call
10. analyzeAudio/entry.ts - 1 call

### Pattern
**Before**: 
```javascript
const response = await base44.integrations.Core.InvokeLLM({ prompt, ... })
```

**After**:
```javascript
import { llmService } from '@/services/llmService';
const response = await llmService.invoke({ prompt, ... })
```

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] LLM service files created
- [ ] All 18 calls migrated
- [ ] Admin dashboard updated
- [ ] Testing complete
- [ ] Staging deployment
- [ ] Production deployment
