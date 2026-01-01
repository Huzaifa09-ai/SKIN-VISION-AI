
export interface SkinAnalysis {
  skin_type: string;
  skin_score: number;
  concerns: string[];
  summary: string;
  texture?: string;
  pores?: string;
  acne?: string;
  pigmentation?: string;
  oiliness?: string;
  redness?: string;
  eye_area?: string;
}

export interface RoutineStep {
  step: string;
  type: string;
  how_to_use: string;
}

export interface ProductRoutine {
  morning: RoutineStep[];
  night: RoutineStep[];
}

export interface HomemadeRemedy {
  purpose: string;
  recipe_name: string;
  ingredients: string[];
  how_to_make: string[];
  how_to_apply: string[];
  frequency: string;
  safety_notes: string[];
}

export interface SkinVisionResult {
  skin_analysis: SkinAnalysis;
  product_routine: ProductRoutine;
  homemade_skincare: HomemadeRemedy[];
  safety_notice: string;
  is_valid_face?: boolean;
  validation_error?: string;
  comparison_note?: string;
}

export type TierID = 'FREE' | 'BASIC' | 'PRO' | 'ELITE';
export type SensitivityLevel = 'Gentle' | 'Balanced' | 'Intensive';

export type ScreenID = 
  | 'onboarding'
  | 'auth'
  | 'home'
  | 'camera'
  | 'analyzing'
  | 'report'
  | 'routine'
  | 'nature'
  | 'profile'
  | 'premium'
  | 'admin_login'
  | 'admin_dashboard';

export interface User {
  name: string;
  email: string;
  password: string;
  tier: TierID;
  pendingTier?: TierID;
  scansPerformed: number;
  uploadsPerformed: number;
  sensitivity?: SensitivityLevel;
}
