import { base44 } from './base44Client';
import { llmService } from '@/services/llmService';

export const Core = base44.integrations.Core;

// DEPRECATED: Use llmService instead for AI/LLM calls
export const InvokeLLM = (params) => {
  console.warn('[DEPRECATED] InvokeLLM is deprecated. Use llmService.invoke() instead');
  return llmService.invoke(params);
};

export const SendEmail = base44.integrations.Core.SendEmail;

export const SendSMS = base44.integrations.Core.SendSMS;

export const UploadFile = base44.integrations.Core.UploadFile;

export const GenerateImage = base44.integrations.Core.GenerateImage;

export const ExtractDataFromUploadedFile = base44.integrations.Core.ExtractDataFromUploadedFile;

// Export llmService for direct use
export { llmService };






