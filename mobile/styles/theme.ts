// Design System - Theme Constants
export const theme = {
  // Primary Colors
  colors: {
    // Brand Colors
    primary: '#3B82F6',      // Blue - main action color
    primaryDark: '#2563EB',  // Darker blue for pressed states
    primaryLight: '#60A5FA', // Lighter blue for highlights
    
    // Accent Colors  
    accent: '#8B5CF6',       // Purple - for special elements
    success: '#10B981',      // Green - for success states
    warning: '#F59E0B',      // Amber - for warnings
    error: '#EF4444',        // Red - for errors/delete
    
    // Background Colors
    background: '#0F172A',      // Main dark background
    backgroundLight: '#1E293B', // Card backgrounds
    backgroundLighter: '#334155', // Elevated cards
    surface: '#1E293B',         // Surface color for cards
    
    // Text Colors
    text: '#FFFFFF',            // Primary text
    textSecondary: '#94A3B8',   // Secondary text
    textMuted: '#64748B',       // Muted text
    
    // Border Colors
    border: '#334155',          // Default border
    borderLight: '#475569',     // Lighter border
    
    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.5)',
  },
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Border Radius
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  
  // Typography
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700' as const,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400' as const,
    },
    caption: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
  },
  
  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    glow: {
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },
  },
};

// Fish type colors for charts
export const FISH_COLORS: Record<string, string> = {
  DalagangBukid: '#FF6B6B',
  Tunsoy: '#4ECDC4',
  Galunggong: '#45B7D1',
  Espada: '#96CEB4',
  Pusit: '#FFEAA7',
  Danggit: '#DDA0DD',
  Bangus: '#98D8C8',
  default: '#A0AEC0',
};

export const getColor = (fishType: string): string => {
  return FISH_COLORS[fishType] || FISH_COLORS.default;
};
