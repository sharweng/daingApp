export type Screen =
  | "home"
  | "scan"
  | "analytics"
  | "history"
  | "autoDataset"
  | "login"
  | "register";

export type UserRole = "user" | "admin" | "seller";

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthResponse {
  status: string;
  user?: User;
  token?: string;
  message?: string;
}

export interface HistoryEntry {
  id: string;
  url: string;
  timestamp: string;
  folder?: string;
  user_id?: string;
}

export interface ColorConsistencyStats {
  average_score: number;
  grade_distribution: {
    Export: number;
    Local: number;
    Reject: number;
  };
  by_fish_type: Record<string, { avg_score: number; count: number }>;
}

// Mold Analysis Types
export interface MoldSpatialZone {
  patch_count: number;
  coverage_pixels: number;
  fish_pixels: number;
  coverage_percent: number;
}

export interface MoldFishResult {
  region_index: number;
  mold_detected: boolean;
  mold_coverage_percent: number;
  severity: "None" | "Low" | "Moderate" | "Severe";
  patch_count: number;
  spatial_distribution: {
    zones: Record<string, MoldSpatialZone>;
    center_coords: [number, number] | null;
    total_patches: number;
  };
  characteristics: {
    dominant_color: string | null;
    color_variance: number;
    avg_darkness: number;
  };
}

export interface MoldAnalysisResult {
  overall_severity: "None" | "Low" | "Moderate" | "Severe";
  avg_coverage_percent: number;
  fish_analyzed: number;
  fish_with_mold: number;
  total_patches: number;
  fish_results: MoldFishResult[];
  spatial_summary: {
    zones: Record<
      string,
      { total_patches: number; total_coverage: number; fish_affected: number }
    >;
    total_fish_analyzed: number;
    most_affected_zone: string | null;
  };
  characteristics: {
    most_common_color: string | null;
    avg_darkness: number;
    color_distribution: Record<string, number>;
  };
  analysis_method: string;
}

export interface MoldAnalyticsStats {
  severity_distribution: {
    None: number;
    Low: number;
    Moderate: number;
    Severe: number;
  };
  average_coverage: number;
  spatial_zones: Record<
    string,
    { fish_affected: number; total_patches: number }
  >;
  by_fish_type: Record<
    string,
    {
      total_scans: number;
      contaminated_scans: number;
      contamination_rate: number;
      avg_coverage: number;
    }
  >;
}

// Per-fish color analysis stats
export interface ColorFishStats {
  region_index: number;
  l_std: number;
  a_std: number;
  b_std: number;
  l_mean: number;
  a_mean: number;
  b_mean: number;
  combined_std: number;
  rgb_std: number[];
  pixel_count: number;
  coverage_percent: number;
}

export interface AnalysisScanResult {
  status: string;
  is_daing_detected: boolean;
  result_image: string;
  detections: Array<{ fish_type: string; confidence: number }>;
  color_analysis: {
    consistency_score: number;
    quality_grade: string;
    avg_std_deviation: number;
    color_stats?: ColorFishStats[];
  } | null;
  mold_analysis: MoldAnalysisResult | null;
}

// Defect Pattern Analysis Types
export interface DefectFrequency {
  poor_color_uniformity: number;
  color_discoloration: number;
  acceptable_quality: number;
}

export interface SpeciesSusceptibility {
  total_affected: number;
  total_scans: number;
  defect_rate: number;
  reject_count: number;
  local_count: number;
  avg_color_score: number;
  primary_issue: string;
}

export interface DefectPatterns {
  frequency: DefectFrequency;
  species_susceptibility: Record<string, SpeciesSusceptibility>;
  most_common_defect: string | null;
}

// Quality Grade Classification Types
export interface GradeStats {
  count: number;
  avg_confidence: number;
  avg_color_score: number;
}

export interface QualityBySpecies {
  Export: GradeStats;
  Local: GradeStats;
  Reject: GradeStats;
}

export interface QualityClassification {
  by_species: Record<string, QualityBySpecies>;
  by_date: Record<string, { Export: number; Local: number; Reject: number }>;
  summary: {
    export_rate: number;
    local_rate: number;
    reject_rate: number;
  };
}

export interface AnalyticsSummary {
  status: string;
  total_scans: number;
  daing_scans: number;
  non_daing_scans: number;
  fish_type_distribution: Record<string, number>;
  average_confidence: Record<string, number>;
  daily_scans: Record<string, number>;
  color_consistency?: ColorConsistencyStats;
  mold_analysis?: MoldAnalyticsStats;
  defect_patterns?: DefectPatterns;
  quality_classification?: QualityClassification;
}
