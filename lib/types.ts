export type ActivationCode = {
  id: string;
  code: string;
  customer_name?: string | null;
  total_uses: number;
  remaining_uses: number;
  expires_at?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProcessedImage = {
  id: string;
  activation_code_id: string;
  original_url: string;
  result_url: string;
  created_at: string;
};

export type PricingPlan = {
  id: string;
  name: string;
  uses: string;
  price: string;
  featured?: boolean;
};

export type DetectionBox = {
  id: string;
  label: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  accepted: boolean;
};
