import { base44 } from '@/api/base44Client';

// Feature tiers and their requirements
export const FEATURE_TIERS = {
  FREE: 'free',
  PRO: 'pro',
  PREMIUM: 'premium',
  ADMIN: 'admin'
};

// Define which features require which plan
export const FEATURE_REQUIREMENTS = {
  // Music Generation
  simple_mode: FEATURE_TIERS.FREE,
  custom_mode: FEATURE_TIERS.PRO,
  instrumental_mode: FEATURE_TIERS.PRO,
  advanced_parameters: FEATURE_TIERS.PRO,

  // Music Quality & Models
  model_v4: FEATURE_TIERS.FREE,
  model_v4_5: FEATURE_TIERS.PRO,
  model_v5: FEATURE_TIERS.PRO,

  // Daily Limits
  free_daily_limit: 3,
  pro_daily_limit: 20,
  premium_daily_limit: 100,

  // Advanced Features
  mastering: FEATURE_TIERS.PRO,
  advanced_mastering: FEATURE_TIERS.PREMIUM,
  stem_separation: FEATURE_TIERS.PRO,
  stem_12_split: FEATURE_TIERS.PREMIUM,

  // Video Features
  lyric_video: FEATURE_TIERS.PRO,
  runway_video: FEATURE_TIERS.PREMIUM,
  runway_extend: FEATURE_TIERS.PREMIUM,

  // Download Formats
  mp3_download: FEATURE_TIERS.FREE,
  wav_download: FEATURE_TIERS.PRO,
  lossless_download: FEATURE_TIERS.PREMIUM,

  // Collaboration
  collaboration: FEATURE_TIERS.PRO,
  team_collaboration: FEATURE_TIERS.PREMIUM,

  // Storage & Tracks
  track_storage_free: 10,
  track_storage_pro: 100,
  track_storage_premium: 1000,
};

// Plan feature matrix
export const PLAN_FEATURES = {
  [FEATURE_TIERS.FREE]: {
    name: 'Free',
    price: 0,
    daily_limit: 3,
    monthly_limit: 50,
    max_duration: 2,
    features: [
      'Simple mode generation',
      '3 tracks per day',
      'MP3 downloads',
      'Basic models (V4)',
      'Public track sharing',
    ],
    restrictions: {
      custom_mode: false,
      mastering: false,
      stem_separation: false,
      video_generation: false,
      wav_downloads: false,
    }
  },
  [FEATURE_TIERS.PRO]: {
    name: 'Pro',
    price: 9.99,
    daily_limit: 20,
    monthly_limit: 300,
    max_duration: 4,
    features: [
      'Custom mode with lyrics',
      'Instrumental mode',
      '20 tracks per day',
      'Advanced models (V4.5, V5)',
      'WAV & MP3 downloads',
      'Basic mastering',
      'Stem separation (2-stem)',
      'Lyric videos',
      'Priority generation',
    ],
    restrictions: {
      advanced_mastering: false,
      stem_12_split: false,
      runway_video: false,
      lossless_downloads: false,
    }
  },
  [FEATURE_TIERS.PREMIUM]: {
    name: 'Premium',
    price: 29.99,
    daily_limit: 100,
    monthly_limit: 1000,
    max_duration: 6,
    features: [
      'Everything in Pro',
      '100 tracks per day',
      'All models including latest',
      'Advanced mastering studio',
      '12-stem separation',
      'Runway video generation',
      'Lossless downloads',
      'Team collaboration',
      'Commercial license',
      'Priority support',
    ],
    restrictions: {}
  },
  [FEATURE_TIERS.ADMIN]: {
    name: 'Admin',
    price: 0,
    daily_limit: 999,
    monthly_limit: 9999,
    max_duration: 10,
    features: ['All features unlocked', 'Unlimited access'],
    restrictions: {}
  }
};

/**
 * Get user's current plan tier
 */
export async function getUserPlanTier(user) {
  if (!user) return FEATURE_TIERS.FREE;

  // Admins have full access
  if (user.role === 'admin') return FEATURE_TIERS.ADMIN;

  // Get user's plan
  if (user.plan_id) {
    try {
      const plans = await base44.entities.Plan.filter({ id: user.plan_id });
      const plan = plans[0];

      if (plan) {
        // Determine tier based on plan name or price
        if (plan.price_monthly >= 25) return FEATURE_TIERS.PREMIUM;
        if (plan.price_monthly >= 5) return FEATURE_TIERS.PRO;
      }
    } catch (error) {
      console.error('Error fetching user plan:', error);
    }
  }

  return FEATURE_TIERS.FREE;
}

/**
 * Check if user has access to a specific feature
 */
export async function hasFeatureAccess(user, featureName) {
  const userTier = await getUserPlanTier(user);
  const requiredTier = FEATURE_REQUIREMENTS[featureName];

  if (!requiredTier) {
    // Feature not in requirements, allow access
    return true;
  }

  // Admin has access to everything
  if (userTier === FEATURE_TIERS.ADMIN) return true;

  // Check tier hierarchy
  const tierOrder = [FEATURE_TIERS.FREE, FEATURE_TIERS.PRO, FEATURE_TIERS.PREMIUM, FEATURE_TIERS.ADMIN];
  const userTierIndex = tierOrder.indexOf(userTier);
  const requiredTierIndex = tierOrder.indexOf(requiredTier);

  return userTierIndex >= requiredTierIndex;
}

/**
 * Check if user has reached their daily limit
 */
export async function hasReachedDailyLimit(user) {
  if (!user) return true;

  const userTier = await getUserPlanTier(user);
  const planInfo = PLAN_FEATURES[userTier];

  // Admin never has limits
  if (userTier === FEATURE_TIERS.ADMIN) return false;

  // Check user's daily usage
  const dailyUsage = user.daily_usage || 0;
  return dailyUsage >= planInfo.daily_limit;
}

/**
 * Get remaining generations for today
 */
export async function getRemainingGenerations(user) {
  if (!user) return 0;

  const userTier = await getUserPlanTier(user);
  const planInfo = PLAN_FEATURES[userTier];

  if (userTier === FEATURE_TIERS.ADMIN) return 999;

  const dailyUsage = user.daily_usage || 0;
  return Math.max(0, planInfo.daily_limit - dailyUsage);
}

/**
 * Get upgrade suggestion for a feature
 */
export function getUpgradeRequirement(featureName) {
  const requiredTier = FEATURE_REQUIREMENTS[featureName];

  if (!requiredTier || requiredTier === FEATURE_TIERS.FREE) {
    return null;
  }

  return {
    tier: requiredTier,
    planInfo: PLAN_FEATURES[requiredTier],
    feature: featureName
  };
}

/**
 * Format tier name for display
 */
export function formatTierName(tier) {
  return PLAN_FEATURES[tier]?.name || 'Free';
}

/**
 * Check if user can download in specific format
 */
export async function canDownloadFormat(user, format) {
  const formatFeature = `${format}_download`;
  return await hasFeatureAccess(user, formatFeature);
}

/**
 * Get plan comparison data
 */
export function getPlanComparison() {
  return [
    PLAN_FEATURES[FEATURE_TIERS.FREE],
    PLAN_FEATURES[FEATURE_TIERS.PRO],
    PLAN_FEATURES[FEATURE_TIERS.PREMIUM],
  ];
}
