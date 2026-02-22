import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, {
  Circle,
  G,
  Path,
  Line,
  Text as SvgText,
  Polyline,
} from "react-native-svg";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { commonStyles, theme } from "../../styles/common";
import { fetchAnalytics, fetchAllAnalytics } from "../../services/api";
import type { Screen, AnalyticsSummary, User } from "../../types";

// Graph types that can be selected for export
type GraphType =
  | "detection_overview"
  | "fish_type_distribution"
  | "average_confidence"
  | "color_consistency"
  | "mold_analysis"
  | "defect_patterns"
  | "quality_classification"
  | "confidence_vs_color"
  | "daily_scans"
  | "fish_type_pie";

interface GraphOption {
  id: GraphType;
  label: string;
  description: string;
}

type ExportFormat = "pdf" | "word" | "excel";

const screenWidth = Dimensions.get("window").width;

type AnalyticsTab = "my" | "all";

// Available graphs for export
const AVAILABLE_GRAPHS: GraphOption[] = [
  {
    id: "detection_overview",
    label: "Detection Overview",
    description: "Daing vs Non-Daing distribution pie chart",
  },
  {
    id: "fish_type_distribution",
    label: "Fish Type Distribution",
    description: "Bar chart showing count per fish species",
  },
  {
    id: "average_confidence",
    label: "Average Confidence",
    description: "Detection confidence scores by fish type",
  },
  {
    id: "color_consistency",
    label: "Color Consistency Analysis",
    description: "Color quality scores and grade distribution",
  },
  {
    id: "mold_analysis",
    label: "Mold Analysis",
    description: "Contamination severity and spatial distribution",
  },
  {
    id: "defect_patterns",
    label: "Defect Patterns",
    description: "Defect frequency and species susceptibility",
  },
  {
    id: "quality_classification",
    label: "Quality Classification",
    description: "Export/Local/Reject grade breakdown",
  },
  {
    id: "confidence_vs_color",
    label: "Confidence vs Color Score",
    description: "Scatter plot correlation analysis",
  },
  {
    id: "daily_scans",
    label: "Daily Scans Trend",
    description: "Line graph showing scan activity over time",
  },
  {
    id: "fish_type_pie",
    label: "Fish Type Pie Chart",
    description: "Donut chart of fish species distribution",
  },
];

interface AnalyticsScreenProps {
  onNavigate: (screen: Screen) => void;
  analyticsUrl: string;
  serverBaseUrl: string;
  user?: User | null;
}

// Fish type colors for charts - distinct colors for each type
const FISH_COLORS: Record<string, string> = {
  DalagangBukid: "#FF6B6B", // Red
  Tunsoy: "#4ECDC4", // Teal
  Galunggong: "#3498DB", // Blue
  Espada: "#2ECC71", // Green
  Pusit: "#9B59B6", // Purple
  Danggit: "#E67E22", // Orange
  Bangus: "#1ABC9C", // Turquoise
  Bisugo: "#F1C40F", // Yellow
  FlyingFish: "#E91E63", // Pink
  "Flying Fish": "#E91E63", // Pink (alternative name)
  Tilapia: "#00BCD4", // Cyan
  Dilis: "#8BC34A", // Light Green
  Tamban: "#FF5722", // Deep Orange
  Alumahan: "#673AB7", // Deep Purple
  Salay: "#795548", // Brown
  Matambaka: "#607D8B", // Blue Grey
  default: "#A0AEC0", // Grey
};

const getColor = (fishType: string): string => {
  return FISH_COLORS[fishType] || FISH_COLORS.default;
};

// Helper function to get heat map color based on contamination rate
const getZoneHeatColor = (affected: number, total: number): string => {
  if (total === 0 || affected === 0) return "rgba(76, 175, 80, 0.2)"; // Green - no contamination
  const rate = (affected / total) * 100;
  if (rate > 30) return "rgba(244, 67, 54, 0.6)"; // Red - high
  if (rate > 15) return "rgba(255, 152, 0, 0.5)"; // Orange - moderate
  if (rate > 5) return "rgba(255, 193, 7, 0.4)"; // Yellow - low
  return "rgba(76, 175, 80, 0.3)"; // Green - minimal
};

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  onNavigate,
  analyticsUrl,
  serverBaseUrl,
  user,
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("my");
  const [selectedDays, setSelectedDays] = useState<number>(7);

  // Download/Export state
  const [showGraphSelectModal, setShowGraphSelectModal] = useState(false);
  const [showFormatSelectModal, setShowFormatSelectModal] = useState(false);
  const [selectedGraphs, setSelectedGraphs] = useState<GraphType[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const isLoggedIn = !!user;
  const isAdmin = user?.role === "admin";

  const timeRangeOptions = [
    { value: 7, label: "7 Days" },
    { value: 30, label: "30 Days" },
    { value: 90, label: "90 Days" },
    { value: 365, label: "1 Year" },
  ];

  const loadAnalytics = useCallback(async () => {
    try {
      let data: AnalyticsSummary;
      // Non-logged-in users always see overall analytics
      if (!isLoggedIn) {
        data = await fetchAllAnalytics(serverBaseUrl, selectedDays);
      } else if (activeTab === "all") {
        // Logged-in users viewing "Overall" tab
        data = await fetchAllAnalytics(serverBaseUrl, selectedDays);
      } else {
        // Logged-in users viewing "My Analytics" tab
        data = await fetchAnalytics(analyticsUrl, selectedDays);
      }
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [analyticsUrl, serverBaseUrl, activeTab, isLoggedIn, selectedDays]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  // Calculate percentages for pie chart
  const getDaingPercentage = () => {
    if (!analytics || analytics.total_scans === 0) return 0;
    return Math.round((analytics.daing_scans / analytics.total_scans) * 100);
  };

  const getNonDaingPercentage = () => {
    if (!analytics || analytics.total_scans === 0) return 0;
    return Math.round(
      (analytics.non_daing_scans / analytics.total_scans) * 100,
    );
  };

  // Get max count for bar chart scaling
  const getMaxFishCount = () => {
    if (
      !analytics ||
      Object.keys(analytics.fish_type_distribution).length === 0
    )
      return 1;
    return Math.max(...Object.values(analytics.fish_type_distribution));
  };

  // Check which graphs have data
  const hasGraphData = (graphId: GraphType): boolean => {
    if (!analytics) return false;
    switch (graphId) {
      case "detection_overview":
        return analytics.total_scans > 0;
      case "fish_type_distribution":
        return Object.keys(analytics.fish_type_distribution).length > 0;
      case "average_confidence":
        return Object.keys(analytics.average_confidence).length > 0;
      case "color_consistency":
        return !!(
          analytics.color_consistency &&
          analytics.color_consistency.average_score > 0
        );
      case "mold_analysis":
        return !!analytics.mold_analysis;
      case "defect_patterns":
        return !!analytics.defect_patterns;
      case "quality_classification":
        return !!analytics.quality_classification;
      case "confidence_vs_color":
        return !!(
          analytics.quality_classification &&
          Object.keys(analytics.quality_classification.by_species).length > 0
        );
      case "daily_scans":
        return Object.keys(analytics.daily_scans).length > 0;
      case "fish_type_pie":
        return Object.keys(analytics.fish_type_distribution).length > 0;
      default:
        return false;
    }
  };

  // Get available graphs with data
  const getAvailableGraphs = () =>
    AVAILABLE_GRAPHS.filter((g) => hasGraphData(g.id));

  // Toggle graph selection
  const toggleGraphSelection = (graphId: GraphType) => {
    setSelectedGraphs((prev) =>
      prev.includes(graphId)
        ? prev.filter((id) => id !== graphId)
        : [...prev, graphId],
    );
  };

  // Toggle select all / deselect all
  const toggleSelectAll = () => {
    const available = getAvailableGraphs();
    const allSelected = selectedGraphs.length === available.length;
    if (allSelected) {
      setSelectedGraphs([]);
    } else {
      setSelectedGraphs(available.map((g) => g.id));
    }
  };

  // Generate summary for each graph
  const getGraphSummary = (graphId: GraphType): string => {
    if (!analytics) return "";

    switch (graphId) {
      case "detection_overview":
        const daingPct =
          analytics.total_scans > 0
            ? ((analytics.daing_scans / analytics.total_scans) * 100).toFixed(1)
            : "0";
        const nonDaingPct =
          analytics.total_scans > 0
            ? (
                (analytics.non_daing_scans / analytics.total_scans) *
                100
              ).toFixed(1)
            : "0";
        return `Out of ${analytics.total_scans} total scans, ${analytics.daing_scans} (${daingPct}%) were identified as Daing (dried fish), while ${analytics.non_daing_scans} (${nonDaingPct}%) were classified as Non-Daing. This breakdown helps assess the overall detection accuracy and the proportion of valid dried fish samples in the dataset.`;

      case "fish_type_distribution":
        const fishTypes = Object.entries(analytics.fish_type_distribution).sort(
          ([, a], [, b]) => b - a,
        );
        const topFish = fishTypes
          .slice(0, 3)
          .map(([type, count]) => `${type} (${count})`)
          .join(", ");
        return `The fish type distribution shows ${fishTypes.length} different species detected. The most commonly identified types are: ${topFish}. This data provides insights into the variety of dried fish being processed and which species are most prevalent in the scanned samples.`;

      case "average_confidence":
        const confEntries = Object.entries(analytics.average_confidence);
        const avgOverall =
          confEntries.length > 0
            ? (
                (confEntries.reduce((sum, [, conf]) => sum + conf, 0) /
                  confEntries.length) *
                100
              ).toFixed(1)
            : "0";
        const highestConf =
          confEntries.length > 0
            ? confEntries.sort(([, a], [, b]) => b - a)[0]
            : null;
        return `The detection confidence analysis shows an overall average of ${avgOverall}% across all fish types. ${highestConf ? `${highestConf[0]} has the highest detection confidence at ${(highestConf[1] * 100).toFixed(1)}%.` : ""} Higher confidence scores indicate more reliable detections, helping identify which fish types are most consistently recognized by the system.`;

      case "color_consistency":
        if (!analytics.color_consistency) return "";
        const colorScore = analytics.color_consistency.average_score.toFixed(1);
        const grades = analytics.color_consistency.grade_distribution;
        const totalGraded = grades.Export + grades.Local + grades.Reject;
        const exportPct =
          totalGraded > 0
            ? ((grades.Export / totalGraded) * 100).toFixed(1)
            : "0";
        return `The color consistency analysis reveals an average score of ${colorScore}%, indicating the uniformity of color distribution across samples. Grade distribution shows ${exportPct}% Export quality, ${totalGraded > 0 ? ((grades.Local / totalGraded) * 100).toFixed(1) : "0"}% Local quality, and ${totalGraded > 0 ? ((grades.Reject / totalGraded) * 100).toFixed(1) : "0"}% Reject. Higher color consistency correlates with better processing quality and market value.`;

      case "mold_analysis":
        if (!analytics.mold_analysis) return "";
        const moldCoverage =
          analytics.mold_analysis.average_coverage.toFixed(2);
        const severityDist = analytics.mold_analysis.severity_distribution;
        const contaminated =
          (severityDist.Low || 0) +
          (severityDist.Moderate || 0) +
          (severityDist.Severe || 0);
        return `Mold contamination analysis shows an average coverage of ${moldCoverage}% across all samples. Severity distribution indicates ${contaminated} contaminated samples: ${severityDist.Low || 0} Low, ${severityDist.Moderate || 0} Moderate, and ${severityDist.Severe || 0} Severe cases. This analysis helps identify potential food safety concerns and storage issues affecting product quality.`;

      case "defect_patterns":
        if (!analytics.defect_patterns) return "";
        const freq = analytics.defect_patterns.frequency;
        const mostCommon =
          analytics.defect_patterns.most_common_defect || "None identified";
        return `Defect pattern analysis identified the following issues: ${freq.poor_color_uniformity || 0} cases of poor color uniformity, ${freq.color_discoloration || 0} cases of discoloration, and ${freq.acceptable_quality || 0} samples with acceptable quality. The most common defect observed is "${mostCommon.replace(/_/g, " ")}". This data helps identify areas for improvement in production and quality control processes.`;

      case "quality_classification":
        if (!analytics.quality_classification) return "";
        const summary = analytics.quality_classification.summary;
        return `Quality grade classification reveals that ${summary.export_rate.toFixed(1)}% of samples meet Export standards (highest quality), ${summary.local_rate.toFixed(1)}% qualify for Local market sale, and ${summary.reject_rate.toFixed(1)}% are rejected. This classification system helps producers meet market requirements and maintain consistent quality standards for different distribution channels.`;

      case "confidence_vs_color":
        if (!analytics.quality_classification) return "";
        const speciesCount = Object.keys(
          analytics.quality_classification.by_species,
        ).length;
        return `The scatter plot visualization correlates detection confidence with color consistency scores across ${speciesCount} fish species. This analysis helps identify patterns between detection reliability and visual quality indicators. Species with both high confidence and color scores represent the most consistently processed samples, while outliers may indicate processing or detection issues.`;

      case "daily_scans":
        const dailyEntries = Object.entries(analytics.daily_scans);
        const totalDaily = dailyEntries.reduce(
          (sum, [, count]) => sum + count,
          0,
        );
        const avgDaily =
          dailyEntries.length > 0
            ? (totalDaily / dailyEntries.length).toFixed(1)
            : "0";
        const peakDay =
          dailyEntries.length > 0
            ? dailyEntries.sort(([, a], [, b]) => b - a)[0]
            : null;
        return `Daily scan activity over the selected period shows an average of ${avgDaily} scans per day. ${peakDay ? `Peak activity occurred on ${new Date(peakDay[0]).toLocaleDateString("en", { month: "long", day: "numeric" })} with ${peakDay[1]} scans.` : ""} This trend data helps monitor system usage patterns and identify periods of high or low activity for resource planning.`;

      case "fish_type_pie":
        const totalFish = Object.values(
          analytics.fish_type_distribution,
        ).reduce((a, b) => a + b, 0);
        const topSpecies = Object.entries(analytics.fish_type_distribution)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(
            ([type, count]) =>
              `${type} (${((count / totalFish) * 100).toFixed(1)}%)`,
          );
        return `The fish type distribution pie chart visualizes the proportion of each species in the dataset. With ${totalFish} total fish detected, the dominant species are: ${topSpecies.join(", ")}. This visualization provides a quick overview of species composition for inventory and market analysis purposes.`;

      default:
        return "";
    }
  };

  // SVG Chart Generation Helpers for HTML Reports
  const generateDonutChartSVG = (
    data: Array<{ label: string; value: number; color: string }>,
    size: number = 200,
    title?: string,
  ): string => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) return "";

    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = size / 2 - 10;
    const innerRadius = outerRadius * 0.6;

    let currentAngle = -90;
    let paths = "";

    data.forEach(({ label, value, color }) => {
      if (value === 0) return;
      const percentage = (value / total) * 100;
      const angle = (percentage / 100) * 360;
      const startRad = (currentAngle * Math.PI) / 180;
      const endRad = ((currentAngle + angle) * Math.PI) / 180;

      const x1Outer = cx + outerRadius * Math.cos(startRad);
      const y1Outer = cy + outerRadius * Math.sin(startRad);
      const x2Outer = cx + outerRadius * Math.cos(endRad);
      const y2Outer = cy + outerRadius * Math.sin(endRad);
      const x1Inner = cx + innerRadius * Math.cos(endRad);
      const y1Inner = cy + innerRadius * Math.sin(endRad);
      const x2Inner = cx + innerRadius * Math.cos(startRad);
      const y2Inner = cy + innerRadius * Math.sin(startRad);

      const largeArc = angle > 180 ? 1 : 0;

      if (angle >= 359.9) {
        // Full circle - draw two half circles
        paths += `<circle cx="${cx}" cy="${cy}" r="${outerRadius}" fill="none" stroke="${color}" stroke-width="${outerRadius - innerRadius}"/>`;
      } else {
        paths += `<path d="M ${x1Outer} ${y1Outer} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer} L ${x1Inner} ${y1Inner} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x2Inner} ${y2Inner} Z" fill="${color}"/>`;
      }
      currentAngle += angle;
    });

    // Add center text
    const centerText = `<text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="20" font-weight="bold" fill="#333">${total}</text>
      <text x="${cx}" y="${cy + 15}" text-anchor="middle" font-size="11" fill="#666">${title || "Total"}</text>`;

    // Add legend
    let legendY = size + 10;
    let legend = "";
    data.forEach(({ label, value, color }) => {
      if (value === 0) return;
      const pct = ((value / total) * 100).toFixed(1);
      legend += `<rect x="10" y="${legendY}" width="12" height="12" rx="2" fill="${color}"/>
        <text x="28" y="${legendY + 10}" font-size="11" fill="#333">${label}: ${value} (${pct}%)</text>`;
      legendY += 20;
    });

    return `<svg width="${size}" height="${legendY + 10}" viewBox="0 0 ${size} ${legendY + 10}" xmlns="http://www.w3.org/2000/svg">
      ${paths}
      ${centerText}
      ${legend}
    </svg>`;
  };

  const generateBarChartSVG = (
    data: Array<{ label: string; value: number; color?: string }>,
    width: number = 500,
    maxLabelWidth: number = 100,
  ): string => {
    if (data.length === 0) return "";

    const barHeight = 28;
    const barGap = 8;
    const height = data.length * (barHeight + barGap) + 20;
    const maxValue = Math.max(...data.map((d) => d.value), 1);
    const chartWidth = width - maxLabelWidth - 60;

    let bars = "";
    data.forEach(({ label, value, color = "#4CAF50" }, index) => {
      const y = index * (barHeight + barGap) + 10;
      const barWidth = (value / maxValue) * chartWidth;

      bars += `
        <text x="${maxLabelWidth - 5}" y="${y + barHeight / 2 + 4}" text-anchor="end" font-size="12" fill="#333">${label}</text>
        <rect x="${maxLabelWidth}" y="${y}" width="${chartWidth}" height="${barHeight}" rx="4" fill="#e0e0e0"/>
        <rect x="${maxLabelWidth}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${color}"/>
        <text x="${maxLabelWidth + barWidth + 5}" y="${y + barHeight / 2 + 4}" font-size="12" font-weight="600" fill="#333">${typeof value === "number" && value % 1 !== 0 ? value.toFixed(1) : value}</text>
      `;
    });

    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${bars}
    </svg>`;
  };

  const generateLineChartSVG = (
    data: Array<{ label: string; value: number }>,
    width: number = 500,
    height: number = 200,
  ): string => {
    if (data.length === 0) return "";

    const padding = { left: 50, right: 20, top: 20, bottom: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(...data.map((d) => d.value), 1);

    // Generate points
    const points = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - (d.value / maxValue) * chartHeight;
      return { x, y, ...d };
    });

    // Create line path
    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");

    // Create area path
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

    // Grid lines
    let gridLines = "";
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * chartHeight;
      const value = Math.round(maxValue * (1 - i / 4));
      gridLines += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>
        <text x="${padding.left - 5}" y="${y + 4}" text-anchor="end" font-size="10" fill="#666">${value}</text>`;
    }

    // Data points and labels
    let pointsAndLabels = "";
    points.forEach((p, i) => {
      pointsAndLabels += `
        <circle cx="${p.x}" cy="${p.y}" r="5" fill="#4CAF50" stroke="white" stroke-width="2"/>
        <text x="${p.x}" y="${height - 10}" text-anchor="middle" font-size="9" fill="#666" transform="rotate(-45 ${p.x} ${height - 10})">${p.label}</text>
      `;
    });

    return `<svg width="${width}" height="${height + 30}" viewBox="0 0 ${width} ${height + 30}" xmlns="http://www.w3.org/2000/svg">
      ${gridLines}
      <path d="${areaPath}" fill="rgba(76, 175, 80, 0.2)"/>
      <path d="${linePath}" fill="none" stroke="#4CAF50" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${pointsAndLabels}
    </svg>`;
  };

  const generateScatterPlotSVG = (
    data: Array<{
      x: number;
      y: number;
      label: string;
      color: string;
      size?: number;
    }>,
    width: number = 500,
    height: number = 300,
    xAxisLabel: string = "X Axis",
    yAxisLabel: string = "Y Axis",
    xMax: number = 100,
    yMax: number = 100,
  ): string => {
    if (data.length === 0) return "";

    const padding = { left: 60, right: 30, top: 30, bottom: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Grid lines
    let gridLines = "";
    for (let i = 0; i <= 5; i++) {
      const xPos = padding.left + (i / 5) * chartWidth;
      const yPos = padding.top + (i / 5) * chartHeight;
      const xVal = Math.round((i / 5) * xMax);
      const yVal = Math.round(yMax - (i / 5) * yMax);

      // Vertical grid lines
      gridLines += `<line x1="${xPos}" y1="${padding.top}" x2="${xPos}" y2="${height - padding.bottom}" stroke="#e0e0e0" stroke-width="1"/>`;
      gridLines += `<text x="${xPos}" y="${height - padding.bottom + 20}" text-anchor="middle" font-size="10" fill="#666">${xVal}%</text>`;

      // Horizontal grid lines
      gridLines += `<line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="#e0e0e0" stroke-width="1"/>`;
      gridLines += `<text x="${padding.left - 10}" y="${yPos + 4}" text-anchor="end" font-size="10" fill="#666">${yVal}%</text>`;
    }

    // Axis labels
    const axisLabels = `
      <text x="${width / 2}" y="${height - 10}" text-anchor="middle" font-size="12" font-weight="600" fill="#333">${xAxisLabel}</text>
      <text x="15" y="${height / 2}" text-anchor="middle" font-size="12" font-weight="600" fill="#333" transform="rotate(-90 15 ${height / 2})">${yAxisLabel}</text>
    `;

    // Plot points with hover info
    let points = "";
    let labels = "";
    data.forEach(({ x, y, label, color, size = 8 }) => {
      const px = padding.left + (x / xMax) * chartWidth;
      const py = padding.top + chartHeight - (y / yMax) * chartHeight;

      points += `
        <circle cx="${px}" cy="${py}" r="${size}" fill="${color}" fill-opacity="0.7" stroke="${color}" stroke-width="2"/>
      `;

      // Add label near the point
      labels += `<text x="${px + size + 3}" y="${py + 4}" font-size="9" fill="#333">${label}</text>`;
    });

    // Legend for colors used
    const colorMap = new Map<string, string>();
    data.forEach((d) => {
      if (!colorMap.has(d.color)) {
        colorMap.set(d.color, d.label.split(" ")[0]); // Use first word as category
      }
    });

    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${padding.left}" y="${padding.top}" width="${chartWidth}" height="${chartHeight}" fill="#fafafa" stroke="#ddd"/>
      ${gridLines}
      ${axisLabels}
      ${points}
      ${labels}
    </svg>`;
  };

  const generateStackedBarChartSVG = (
    data: Array<{
      label: string;
      segments: Array<{ value: number; color: string; name: string }>;
    }>,
    width: number = 500,
  ): string => {
    if (data.length === 0) return "";

    const barHeight = 24;
    const barGap = 8;
    const labelWidth = 100;
    const chartWidth = width - labelWidth - 50;
    const height = data.length * (barHeight + barGap) + 60;

    let bars = "";
    const legendItems = new Set<string>();

    data.forEach(({ label, segments }, index) => {
      const total = segments.reduce((sum, s) => sum + s.value, 0);
      if (total === 0) return;

      const y = index * (barHeight + barGap) + 10;
      let xOffset = labelWidth;

      bars += `<text x="${labelWidth - 5}" y="${y + barHeight / 2 + 4}" text-anchor="end" font-size="11" fill="#333">${label}</text>`;
      bars += `<rect x="${labelWidth}" y="${y}" width="${chartWidth}" height="${barHeight}" rx="4" fill="#e0e0e0"/>`;

      segments.forEach(({ value, color, name }) => {
        if (value === 0) return;
        const segWidth = (value / total) * chartWidth;
        bars += `<rect x="${xOffset}" y="${y}" width="${segWidth}" height="${barHeight}" fill="${color}"/>`;
        legendItems.add(JSON.stringify({ name, color }));
        xOffset += segWidth;
      });

      bars += `<text x="${labelWidth + chartWidth + 5}" y="${y + barHeight / 2 + 4}" font-size="11" fill="#666">${total}</text>`;
    });

    // Legend
    let legendX = labelWidth;
    const legendY = data.length * (barHeight + barGap) + 25;
    let legend = "";
    Array.from(legendItems).forEach((item) => {
      const { name, color } = JSON.parse(item);
      legend += `<rect x="${legendX}" y="${legendY}" width="12" height="12" rx="2" fill="${color}"/>
        <text x="${legendX + 16}" y="${legendY + 10}" font-size="10" fill="#333">${name}</text>`;
      legendX += 80;
    });

    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${bars}
      ${legend}
    </svg>`;
  };

  // Generate HTML report content
  const generateReportHTML = (format: ExportFormat): string => {
    if (!analytics) return "";

    const timeRange =
      timeRangeOptions.find((o) => o.value === selectedDays)?.label || "7 Days";
    const reportDate = new Date().toLocaleDateString("en", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const reportTime = new Date().toLocaleTimeString("en", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const headerStyles = `
      body { 
        font-family: Arial, sans-serif; 
        padding: 20px; 
        color: #333;
        max-width: 800px;
        margin: 0 auto;
      }
      .header { 
        text-align: center; 
        border-bottom: 3px solid #2196F3; 
        padding-bottom: 20px; 
        margin-bottom: 30px;
      }
      .header h1 { 
        color: #1a1a2e; 
        margin-bottom: 8px;
        font-size: 28px;
      }
      .header .subtitle { 
        color: #666; 
        font-size: 14px; 
      }
      .header .meta {
        color: #888;
        font-size: 12px;
        margin-top: 10px;
      }
      .section { 
        margin-bottom: 30px; 
        page-break-inside: avoid;
        padding-top: 20px;
      }
      @media print {
        .section {
          padding-top: 25px;
        }
      }
      @page {
        margin-top: 20mm;
        margin-bottom: 15mm;
      }
      .section-title { 
        background: linear-gradient(135deg, #2196F3, #1565C0);
        color: white; 
        padding: 12px 16px; 
        border-radius: 8px;
        margin-bottom: 15px;
        font-size: 16px;
      }
      .summary { 
        background: #f8f9fa; 
        padding: 15px; 
        border-radius: 8px;
        border-left: 4px solid #2196F3;
        line-height: 1.7;
        font-size: 14px;
        color: #444;
        margin-top: 20px;
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        margin-top: 15px;
        font-size: 13px;
      }
      th, td { 
        border: 1px solid #ddd; 
        padding: 10px; 
        text-align: left; 
      }
      th { 
        background-color: #2196F3; 
        color: white; 
      }
      tr:nth-child(even) { 
        background-color: #f8f9fa; 
      }
      .stats-grid { 
        display: grid; 
        grid-template-columns: repeat(3, 1fr); 
        gap: 15px; 
        margin-bottom: 15px;
      }
      .stats-grid.single { 
        grid-template-columns: 1fr; 
        max-width: 200px;
        margin-left: auto;
        margin-right: auto;
      }
      .stat-card { 
        background: #f8f9fa; 
        padding: 15px; 
        border-radius: 8px; 
        text-align: center;
        border: 1px solid #e0e0e0;
      }
      .stat-value { 
        font-size: 24px; 
        font-weight: bold; 
        color: #2196F3; 
      }
      .stat-label { 
        font-size: 12px; 
        color: #666; 
        margin-top: 5px;
      }
      .bar-container { 
        margin: 8px 0; 
      }
      .bar-label { 
        display: inline-block; 
        width: 120px; 
        font-size: 13px;
      }
      .bar-track { 
        display: inline-block; 
        width: 60%; 
        height: 20px; 
        background: #e0e0e0; 
        border-radius: 10px; 
        vertical-align: middle;
        overflow: hidden;
      }
      .bar-fill { 
        height: 100%; 
        background: #2196F3; 
        border-radius: 10px; 
      }
      .bar-value { 
        display: inline-block; 
        width: 60px; 
        text-align: right;
        font-weight: 600;
        font-size: 13px;
      }
      .chart-container {
        text-align: center;
        margin: 20px 0;
        padding: 15px;
        background: #fafafa;
        border-radius: 8px;
      }
      .chart-container svg {
        max-width: 100%;
        height: auto;
      }
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        text-align: center;
        color: #888;
        font-size: 11px;
      }
    `;

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Daing Analytics Report</title>
        <style>${headerStyles}</style>
      </head>
      <body>
        <div class="header">
          <h1>🐟 Daing Analytics Report</h1>
          <div class="subtitle">${activeTab === "all" ? "Overall System Analytics" : "Personal Analytics"} - ${timeRange} Overview</div>
          <div class="meta">Generated on ${reportDate} at ${reportTime}${user ? ` • By ${user.username}` : ""}</div>
        </div>
    `;

    // Generate sections for each selected graph
    selectedGraphs.forEach((graphId) => {
      const graphInfo = AVAILABLE_GRAPHS.find((g) => g.id === graphId);
      if (!graphInfo || !hasGraphData(graphId)) return;

      html += `<div class="section">`;
      html += `<div class="section-title">${graphInfo.label}</div>`;

      // Add data tables/visuals
      switch (graphId) {
        case "detection_overview":
          {
            const pieData = [
              {
                label: "Daing",
                value: analytics.daing_scans,
                color: "#4CAF50",
              },
              {
                label: "Non-Daing",
                value: analytics.non_daing_scans,
                color: "#F44336",
              },
            ];
            html += `
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-value">${analytics.total_scans}</div>
                  <div class="stat-label">Total Scans</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value" style="color: #4CAF50;">${analytics.daing_scans}</div>
                  <div class="stat-label">Daing Detected</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value" style="color: #F44336;">${analytics.non_daing_scans}</div>
                  <div class="stat-label">Non-Daing</div>
                </div>
              </div>
              <div class="chart-container">
                ${generateDonutChartSVG(pieData, 200, "Scans")}
              </div>
            `;
          }
          break;

        case "fish_type_distribution":
          {
            const fishData = Object.entries(analytics.fish_type_distribution)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => ({
                label: type,
                value: count,
                color: FISH_COLORS[type] || FISH_COLORS.default,
              }));
            const totalDist = Object.values(
              analytics.fish_type_distribution,
            ).reduce((a, b) => a + b, 0);

            html += `<div class="chart-container">${generateBarChartSVG(fishData, 500, 120)}</div>`;
            html += `<table><tr><th>Fish Type</th><th>Count</th><th>Percentage</th></tr>`;
            Object.entries(analytics.fish_type_distribution)
              .sort(([, a], [, b]) => b - a)
              .forEach(([type, count]) => {
                const pct =
                  totalDist > 0 ? ((count / totalDist) * 100).toFixed(1) : "0";
                html += `<tr><td>${type}</td><td>${count}</td><td>${pct}%</td></tr>`;
              });
            html += `</table>`;
          }
          break;

        case "fish_type_pie":
          {
            const pieData = Object.entries(analytics.fish_type_distribution)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => ({
                label: type,
                value: count,
                color: FISH_COLORS[type] || FISH_COLORS.default,
              }));
            const totalPie = Object.values(
              analytics.fish_type_distribution,
            ).reduce((a, b) => a + b, 0);

            html += `<div class="chart-container">${generateDonutChartSVG(pieData, 220, "Fish")}</div>`;
            html += `<table><tr><th>Fish Type</th><th>Count</th><th>Percentage</th></tr>`;
            Object.entries(analytics.fish_type_distribution)
              .sort(([, a], [, b]) => b - a)
              .forEach(([type, count]) => {
                const pct =
                  totalPie > 0 ? ((count / totalPie) * 100).toFixed(1) : "0";
                html += `<tr><td>${type}</td><td>${count}</td><td>${pct}%</td></tr>`;
              });
            html += `</table>`;
          }
          break;

        case "average_confidence":
          {
            const confData = Object.entries(analytics.average_confidence)
              .sort(([, a], [, b]) => b - a)
              .map(([type, conf]) => ({
                label: type,
                value: Math.round(conf * 100),
                color:
                  conf >= 0.9 ? "#4CAF50" : conf >= 0.8 ? "#8BC34A" : "#FFC107",
              }));

            html += `<div class="chart-container">${generateBarChartSVG(confData, 500, 120)}</div>`;
            html += `<table><tr><th>Fish Type</th><th>Average Confidence</th></tr>`;
            Object.entries(analytics.average_confidence)
              .sort(([, a], [, b]) => b - a)
              .forEach(([type, conf]) => {
                html += `<tr><td>${type}</td><td>${(conf * 100).toFixed(1)}%</td></tr>`;
              });
            html += `</table>`;
          }
          break;

        case "color_consistency":
          if (analytics.color_consistency) {
            const gradeData = Object.entries(
              analytics.color_consistency.grade_distribution,
            ).map(([grade, count]) => ({
              label: grade,
              value: count,
              color:
                grade === "Export"
                  ? "#4CAF50"
                  : grade === "Local"
                    ? "#FFC107"
                    : "#F44336",
            }));

            html += `
              <div class="stats-grid single">
                <div class="stat-card">
                  <div class="stat-value">${analytics.color_consistency.average_score.toFixed(1)}%</div>
                  <div class="stat-label">Average Score</div>
                </div>
              </div>
              <h4>Grade Distribution</h4>
              <div class="chart-container">${generateBarChartSVG(gradeData, 400, 100)}</div>
              <table><tr><th>Grade</th><th>Count</th></tr>`;
            Object.entries(
              analytics.color_consistency.grade_distribution,
            ).forEach(([grade, count]) => {
              html += `<tr><td>${grade}</td><td>${count}</td></tr>`;
            });
            html += `</table>`;
            if (
              Object.keys(analytics.color_consistency.by_fish_type).length > 0
            ) {
              const byTypeData = Object.entries(
                analytics.color_consistency.by_fish_type,
              )
                .sort(([, a], [, b]) => b.avg_score - a.avg_score)
                .map(([type, data]) => ({
                  label: type,
                  value: Math.round(data.avg_score),
                  color:
                    data.avg_score >= 75
                      ? "#4CAF50"
                      : data.avg_score >= 50
                        ? "#FFC107"
                        : "#F44336",
                }));

              html += `<h4>By Fish Type</h4>`;
              html += `<div class="chart-container">${generateBarChartSVG(byTypeData, 500, 120)}</div>`;
              html += `<table><tr><th>Fish Type</th><th>Avg Score</th><th>Count</th></tr>`;
              Object.entries(analytics.color_consistency.by_fish_type)
                .sort(([, a], [, b]) => b.avg_score - a.avg_score)
                .forEach(([type, data]) => {
                  html += `<tr><td>${type}</td><td>${data.avg_score.toFixed(1)}%</td><td>${data.count}</td></tr>`;
                });
              html += `</table>`;
            }
          }
          break;

        case "mold_analysis":
          if (analytics.mold_analysis) {
            const severityData = Object.entries(
              analytics.mold_analysis.severity_distribution,
            )
              .filter(([severity]) => severity !== "None")
              .map(([severity, count]) => ({
                label: severity,
                value: count,
                color:
                  severity === "Severe"
                    ? "#F44336"
                    : severity === "Moderate"
                      ? "#FF9800"
                      : "#FFC107",
              }));

            html += `
              <div class="stats-grid single">
                <div class="stat-card">
                  <div class="stat-value" style="color: #F44336;">${analytics.mold_analysis.average_coverage.toFixed(2)}%</div>
                  <div class="stat-label">Avg Coverage</div>
                </div>
              </div>
              <h4>Severity Distribution</h4>`;
            if (severityData.length > 0) {
              html += `<div class="chart-container">${generateBarChartSVG(severityData, 400, 100)}</div>`;
            }
            html += `<table><tr><th>Severity</th><th>Count</th></tr>`;
            Object.entries(
              analytics.mold_analysis.severity_distribution,
            ).forEach(([severity, count]) => {
              html += `<tr><td>${severity}</td><td>${count}</td></tr>`;
            });
            html += `</table>`;
          }
          break;

        case "defect_patterns":
          if (analytics.defect_patterns) {
            const defectData = Object.entries(
              analytics.defect_patterns.frequency,
            ).map(([defect, count]) => {
              const defectColors: Record<string, string> = {
                poor_color_uniformity: "#FF9800",
                color_discoloration: "#F44336",
                acceptable_quality: "#FFC107",
              };
              return {
                label: defect
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase()),
                value: count,
                color: defectColors[defect] || "#888",
              };
            });

            html += `<h4>Defect Frequency</h4>`;
            html += `<div class="chart-container">${generateBarChartSVG(defectData, 500, 160)}</div>`;
            html += `<table><tr><th>Defect Type</th><th>Count</th></tr>`;
            Object.entries(analytics.defect_patterns.frequency).forEach(
              ([defect, count]) => {
                const label = defect
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase());
                html += `<tr><td>${label}</td><td>${count}</td></tr>`;
              },
            );
            html += `</table>`;
            if (analytics.defect_patterns.most_common_defect) {
              html += `<p><strong>Most Common Defect:</strong> ${analytics.defect_patterns.most_common_defect.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</p>`;
            }
          }
          break;

        case "quality_classification":
          if (analytics.quality_classification) {
            html += `
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-value" style="color: #4CAF50;">${analytics.quality_classification.summary.export_rate.toFixed(1)}%</div>
                  <div class="stat-label">Export Grade</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value" style="color: #FFC107;">${analytics.quality_classification.summary.local_rate.toFixed(1)}%</div>
                  <div class="stat-label">Local Grade</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value" style="color: #F44336;">${analytics.quality_classification.summary.reject_rate.toFixed(1)}%</div>
                  <div class="stat-label">Reject</div>
                </div>
              </div>`;

            if (
              Object.keys(analytics.quality_classification.by_species).length >
              0
            ) {
              const stackedData = Object.entries(
                analytics.quality_classification.by_species,
              ).map(([species, grades]) => ({
                label: species,
                segments: [
                  {
                    value: grades.Export.count,
                    color: "#4CAF50",
                    name: "Export",
                  },
                  {
                    value: grades.Local.count,
                    color: "#FFC107",
                    name: "Local",
                  },
                  {
                    value: grades.Reject.count,
                    color: "#F44336",
                    name: "Reject",
                  },
                ],
              }));

              html += `<h4>Quality by Species</h4>`;
              html += `<div class="chart-container">${generateStackedBarChartSVG(stackedData, 500)}</div>`;
              html += `<table><tr><th>Species</th><th>Export</th><th>Local</th><th>Reject</th><th>Total</th></tr>`;
              Object.entries(
                analytics.quality_classification.by_species,
              ).forEach(([species, grades]) => {
                const total =
                  grades.Export.count +
                  grades.Local.count +
                  grades.Reject.count;
                html += `<tr><td>${species}</td><td>${grades.Export.count}</td><td>${grades.Local.count}</td><td>${grades.Reject.count}</td><td>${total}</td></tr>`;
              });
              html += `</table>`;
            }
          }
          break;

        case "confidence_vs_color":
          if (analytics.quality_classification) {
            // Generate scatter plot data
            const scatterData: Array<{
              x: number;
              y: number;
              label: string;
              color: string;
              size?: number;
            }> = [];
            Object.entries(analytics.quality_classification.by_species).forEach(
              ([species, grades]) => {
                if (grades.Export.count > 0) {
                  scatterData.push({
                    x: grades.Export.avg_color_score,
                    y: grades.Export.avg_confidence * 100,
                    label: `${species} (E)`,
                    color: "#4CAF50",
                    size: Math.min(Math.max(grades.Export.count, 5), 15),
                  });
                }
                if (grades.Local.count > 0) {
                  scatterData.push({
                    x: grades.Local.avg_color_score,
                    y: grades.Local.avg_confidence * 100,
                    label: `${species} (L)`,
                    color: "#FFC107",
                    size: Math.min(Math.max(grades.Local.count, 5), 15),
                  });
                }
                if (grades.Reject.count > 0) {
                  scatterData.push({
                    x: grades.Reject.avg_color_score,
                    y: grades.Reject.avg_confidence * 100,
                    label: `${species} (R)`,
                    color: "#F44336",
                    size: Math.min(Math.max(grades.Reject.count, 5), 15),
                  });
                }
              },
            );

            html += `<div class="chart-container">${generateScatterPlotSVG(
              scatterData,
              500,
              300,
              "Color Score",
              "Confidence",
            )}</div>`;
            html += `<p style="text-align: center; font-size: 11px; color: #666; margin-top: -10px;">E = Export, L = Local, R = Reject | Point size indicates sample count</p>`;

            html += `<h4>Species Analysis Details</h4>`;
            html += `<table><tr><th>Species</th><th>Grade</th><th>Avg Confidence</th><th>Avg Color Score</th><th>Count</th></tr>`;
            Object.entries(analytics.quality_classification.by_species).forEach(
              ([species, grades]) => {
                if (grades.Export.count > 0) {
                  html += `<tr><td>${species}</td><td>Export</td><td>${(grades.Export.avg_confidence * 100).toFixed(1)}%</td><td>${grades.Export.avg_color_score.toFixed(1)}%</td><td>${grades.Export.count}</td></tr>`;
                }
                if (grades.Local.count > 0) {
                  html += `<tr><td>${species}</td><td>Local</td><td>${(grades.Local.avg_confidence * 100).toFixed(1)}%</td><td>${grades.Local.avg_color_score.toFixed(1)}%</td><td>${grades.Local.count}</td></tr>`;
                }
                if (grades.Reject.count > 0) {
                  html += `<tr><td>${species}</td><td>Reject</td><td>${(grades.Reject.avg_confidence * 100).toFixed(1)}%</td><td>${grades.Reject.avg_color_score.toFixed(1)}%</td><td>${grades.Reject.count}</td></tr>`;
                }
              },
            );
            html += `</table>`;
          }
          break;

        case "daily_scans":
          {
            const dailyData = Object.entries(analytics.daily_scans)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, count]) => ({
                label: new Date(date).toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                }),
                value: count,
              }));

            html += `<div class="chart-container">${generateLineChartSVG(dailyData, 500, 200)}</div>`;
            html += `<table><tr><th>Date</th><th>Scans</th></tr>`;
            Object.entries(analytics.daily_scans)
              .sort(([a], [b]) => a.localeCompare(b))
              .forEach(([date, count]) => {
                const formattedDate = new Date(date).toLocaleDateString("en", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
                html += `<tr><td>${formattedDate}</td><td>${count}</td></tr>`;
              });
            html += `</table>`;
          }
          break;
      }

      // Add detailed summary AFTER graphs for PDF and Word
      if (format === "pdf" || format === "word") {
        html += `<div class="summary">${getGraphSummary(graphId)}</div>`;
      }

      html += `</div>`;
    });

    html += `
        <div class="footer">
          <p>This report was automatically generated by the Daing Grader Analytics System.</p>
          <p>© ${new Date().getFullYear()} Daing Grader - Fish Quality Assessment Platform</p>
        </div>
      </body>
      </html>
    `;

    return html;
  };

  // Generate CSV content for Excel
  const generateCSVContent = (): string => {
    if (!analytics) return "";

    let csv = "Daing Analytics Report\n";
    csv += `Generated: ${new Date().toLocaleString()}\n`;
    csv += `Time Range: ${timeRangeOptions.find((o) => o.value === selectedDays)?.label || "7 Days"}\n\n`;

    selectedGraphs.forEach((graphId) => {
      if (!hasGraphData(graphId)) return;
      const graphInfo = AVAILABLE_GRAPHS.find((g) => g.id === graphId);
      if (!graphInfo) return;

      csv += `\n--- ${graphInfo.label} ---\n`;

      switch (graphId) {
        case "detection_overview":
          csv += "Metric,Value\n";
          csv += `Total Scans,${analytics.total_scans}\n`;
          csv += `Daing Scans,${analytics.daing_scans}\n`;
          csv += `Non-Daing Scans,${analytics.non_daing_scans}\n`;
          break;

        case "fish_type_distribution":
        case "fish_type_pie":
          csv += "Fish Type,Count,Percentage\n";
          const total = Object.values(analytics.fish_type_distribution).reduce(
            (a, b) => a + b,
            0,
          );
          Object.entries(analytics.fish_type_distribution)
            .sort(([, a], [, b]) => b - a)
            .forEach(([type, count]) => {
              csv += `${type},${count},${total > 0 ? ((count / total) * 100).toFixed(1) : 0}%\n`;
            });
          break;

        case "average_confidence":
          csv += "Fish Type,Average Confidence\n";
          Object.entries(analytics.average_confidence)
            .sort(([, a], [, b]) => b - a)
            .forEach(([type, conf]) => {
              csv += `${type},${(conf * 100).toFixed(1)}%\n`;
            });
          break;

        case "color_consistency":
          if (analytics.color_consistency) {
            csv += `Average Score,${analytics.color_consistency.average_score.toFixed(1)}%\n\n`;
            csv += "Grade,Count\n";
            Object.entries(
              analytics.color_consistency.grade_distribution,
            ).forEach(([grade, count]) => {
              csv += `${grade},${count}\n`;
            });
          }
          break;

        case "mold_analysis":
          if (analytics.mold_analysis) {
            csv += `Average Coverage,${analytics.mold_analysis.average_coverage.toFixed(2)}%\n\n`;
            csv += "Severity,Count\n";
            Object.entries(
              analytics.mold_analysis.severity_distribution,
            ).forEach(([severity, count]) => {
              csv += `${severity},${count}\n`;
            });
          }
          break;

        case "defect_patterns":
          if (analytics.defect_patterns) {
            csv += "Defect Type,Count\n";
            Object.entries(analytics.defect_patterns.frequency).forEach(
              ([defect, count]) => {
                csv += `${defect.replace(/_/g, " ")},${count}\n`;
              },
            );
          }
          break;

        case "quality_classification":
          if (analytics.quality_classification) {
            csv += "Grade,Rate\n";
            csv += `Export,${analytics.quality_classification.summary.export_rate.toFixed(1)}%\n`;
            csv += `Local,${analytics.quality_classification.summary.local_rate.toFixed(1)}%\n`;
            csv += `Reject,${analytics.quality_classification.summary.reject_rate.toFixed(1)}%\n`;
          }
          break;

        case "daily_scans":
          csv += "Date,Scans\n";
          Object.entries(analytics.daily_scans)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([date, count]) => {
              csv += `${date},${count}\n`;
            });
          break;
      }
    });

    return csv;
  };

  // Export report
  const exportReport = async (format: ExportFormat) => {
    setIsExporting(true);
    setShowFormatSelectModal(false);

    try {
      if (format === "excel") {
        // Generate CSV for Excel
        const csvContent = generateCSVContent();
        const fileName = `daing_analytics_${Date.now()}.csv`;
        const filePath = `${LegacyFileSystem.documentDirectory}${fileName}`;

        await LegacyFileSystem.writeAsStringAsync(filePath, csvContent, {
          encoding: LegacyFileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath, {
            mimeType: "text/csv",
            dialogTitle: "Export Analytics (CSV for Excel)",
          });
        } else {
          Alert.alert("Success", "File saved to documents folder");
        }
      } else {
        // Generate HTML content for the report
        const html = generateReportHTML(format);

        if (format === "pdf") {
          // Use expo-print to generate PDF from HTML
          const { uri } = await Print.printToFileAsync({
            html,
            base64: false,
          });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
              mimeType: "application/pdf",
              dialogTitle: "Export Analytics (PDF)",
            });
          } else {
            Alert.alert("Success", "File saved to documents folder");
          }
        } else {
          // For Word format, write HTML content directly to a .doc file
          // Word can natively open HTML content when saved with .doc extension
          const fileName = `daing_analytics_${Date.now()}.doc`;
          const filePath = `${LegacyFileSystem.documentDirectory}${fileName}`;

          await LegacyFileSystem.writeAsStringAsync(filePath, html, {
            encoding: LegacyFileSystem.EncodingType.UTF8,
          });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(filePath, {
              mimeType: "application/msword",
              dialogTitle: "Export Analytics (Word Document)",
            });
          } else {
            Alert.alert("Success", "File saved to documents folder");
          }
        }
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert(
        "Export Failed",
        "Unable to generate the report. Please try again.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Open download modal
  const openDownloadModal = () => {
    // Reset selection and show graph select modal
    setSelectedGraphs([]);
    setShowGraphSelectModal(true);
  };

  // Proceed to format selection
  const proceedToFormatSelection = () => {
    if (selectedGraphs.length === 0) {
      Alert.alert(
        "No Graphs Selected",
        "Please select at least one graph to include in the report.",
      );
      return;
    }
    setShowGraphSelectModal(false);
    setShowFormatSelectModal(true);
  };

  if (loading) {
    return (
      <View style={commonStyles.container}>
        <View style={commonStyles.screenHeader}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => onNavigate("home")}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={commonStyles.screenTitle}>Analytics</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading Analytics...</Text>
        </View>
      </View>
    );
  }

  if (!analytics || analytics.total_scans === 0) {
    return (
      <View style={commonStyles.container}>
        <View style={commonStyles.screenHeader}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => onNavigate("home")}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={commonStyles.screenTitle}>Analytics</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="bar-chart-outline"
              size={48}
              color={theme.colors.textMuted}
            />
          </View>
          <Text style={styles.emptyText}>No Scan Data Yet</Text>
          <Text style={styles.emptySubtext}>
            Start scanning fish to see analytics here
          </Text>
          <TouchableOpacity
            style={commonStyles.refreshButton}
            onPress={loadAnalytics}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color={theme.colors.text} />
            <Text style={commonStyles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const daingPercentage = getDaingPercentage();
  const nonDaingPercentage = getNonDaingPercentage();
  const maxFishCount = getMaxFishCount();

  return (
    <View style={commonStyles.container}>
      <View style={commonStyles.screenHeader}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => onNavigate("home")}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={commonStyles.screenTitle}>Analytics</Text>
        <View style={styles.headerActions}>
          {isAdmin && (
            <TouchableOpacity
              style={[styles.headerButton, styles.downloadButton]}
              onPress={openDownloadModal}
            >
              <Ionicons
                name="download-outline"
                size={22}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar for Logged-in Users */}
      {isLoggedIn && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "my" && styles.activeTab]}
            onPress={() => setActiveTab("my")}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={
                activeTab === "my"
                  ? theme.colors.primary
                  : theme.colors.textMuted
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "my" && styles.activeTabText,
              ]}
            >
              My Analytics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "all" && styles.activeTab]}
            onPress={() => setActiveTab("all")}
          >
            <Ionicons
              name="globe-outline"
              size={18}
              color={
                activeTab === "all"
                  ? theme.colors.primary
                  : theme.colors.textMuted
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "all" && styles.activeTabText,
              ]}
            >
              Overall Analytics
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <Text style={styles.timeRangeLabel}>Time Range:</Text>
        <View style={styles.timeRangeButtons}>
          {timeRangeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.timeRangeButton,
                selectedDays === option.value && styles.timeRangeButtonActive,
              ]}
              onPress={() => {
                setSelectedDays(option.value);
                setLoading(true);
              }}
            >
              <Text
                style={[
                  styles.timeRangeButtonText,
                  selectedDays === option.value &&
                    styles.timeRangeButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, styles.totalCard]}>
            <Ionicons
              name="scan-outline"
              size={24}
              color="rgba(255,255,255,0.7)"
              style={styles.summaryIcon}
            />
            <Text style={styles.summaryNumber}>{analytics.total_scans}</Text>
            <Text style={styles.summaryLabel}>Total Scans</Text>
          </View>
          <View style={[styles.summaryCard, styles.successCard]}>
            <Ionicons
              name="fish-outline"
              size={24}
              color="rgba(255,255,255,0.7)"
              style={styles.summaryIcon}
            />
            <Text style={styles.summaryNumber}>{analytics.daing_scans}</Text>
            <Text style={styles.summaryLabel}>Daing</Text>
          </View>
          <View style={[styles.summaryCard, styles.errorCard]}>
            <Ionicons
              name="close-circle-outline"
              size={24}
              color="rgba(255,255,255,0.7)"
              style={styles.summaryIcon}
            />
            <Text style={styles.summaryNumber}>
              {analytics.non_daing_scans}
            </Text>
            <Text style={styles.summaryLabel}>Non-Daing</Text>
          </View>
        </View>

        {/* Daing vs Non-Daing Pie Chart - Circular */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Detection Overview</Text>
          <View style={styles.pieChartContainer}>
            {/* Circular Pie Chart using SVG */}
            <View style={styles.circularPieContainer}>
              <Svg width={160} height={160} viewBox="0 0 100 100">
                <G transform="rotate(-90 50 50)">
                  {/* Background circle */}
                  <Circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#2A2A4A"
                    strokeWidth="20"
                  />
                  {/* Daing slice (green) */}
                  <Circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#4CAF50"
                    strokeWidth="20"
                    strokeDasharray={`${(daingPercentage / 100) * 251.2} 251.2`}
                    strokeLinecap="butt"
                  />
                  {/* Non-Daing slice (red) - offset by daing percentage */}
                  <Circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#F44336"
                    strokeWidth="20"
                    strokeDasharray={`${(nonDaingPercentage / 100) * 251.2} 251.2`}
                    strokeDashoffset={-((daingPercentage / 100) * 251.2)}
                    strokeLinecap="butt"
                  />
                </G>
                {/* Center text */}
                <SvgText
                  x="50"
                  y="46"
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="bold"
                  fill="#FFFFFF"
                >
                  {analytics.total_scans}
                </SvgText>
                <SvgText
                  x="50"
                  y="60"
                  textAnchor="middle"
                  fontSize="8"
                  fill="#888888"
                >
                  Total Scans
                </SvgText>
              </Svg>
            </View>
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: "#4CAF50" }]}
                />
                <Text style={styles.legendText}>
                  Daing: {daingPercentage}% ({analytics.daing_scans})
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: "#F44336" }]}
                />
                <Text style={styles.legendText}>
                  Non-Daing: {nonDaingPercentage}% ({analytics.non_daing_scans})
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Fish Type Distribution Bar Chart */}
        {Object.keys(analytics.fish_type_distribution).length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Fish Type Distribution</Text>
            <View style={styles.barChartContainer}>
              {Object.entries(analytics.fish_type_distribution)
                .sort(([, a], [, b]) => b - a)
                .map(([fishType, count]) => (
                  <View key={fishType} style={styles.barRow}>
                    <Text style={styles.barLabel} numberOfLines={1}>
                      {fishType}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${(count / maxFishCount) * 100}%`,
                            backgroundColor: getColor(fishType),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barValue}>{count}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Average Confidence by Type */}
        {Object.keys(analytics.average_confidence).length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Average Confidence by Type</Text>
            <View style={styles.confidenceContainer}>
              {Object.entries(analytics.average_confidence)
                .sort(([, a], [, b]) => b - a)
                .map(([fishType, confidence]) => (
                  <View key={fishType} style={styles.confidenceRow}>
                    <Text style={styles.confidenceType} numberOfLines={1}>
                      {fishType}
                    </Text>
                    <View style={styles.confidenceBarContainer}>
                      <View
                        style={[
                          styles.confidenceBar,
                          {
                            width: `${confidence * 100}%`,
                            backgroundColor:
                              confidence >= 0.9
                                ? "#4CAF50"
                                : confidence >= 0.8
                                  ? "#8BC34A"
                                  : "#FFC107",
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.confidenceValue}>
                      {(confidence * 100).toFixed(1)}%
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Color Consistency Analysis */}
        {analytics.color_consistency &&
          analytics.color_consistency.average_score > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Color Consistency Analysis</Text>

              {/* Average Score Display */}
              <View style={styles.colorScoreContainer}>
                <View style={styles.colorScoreCircle}>
                  <Text style={styles.colorScoreValue}>
                    {analytics.color_consistency.average_score.toFixed(0)}%
                  </Text>
                  <Text style={styles.colorScoreLabel}>Avg Score</Text>
                </View>
                <View style={styles.colorScoreInfo}>
                  <Text style={styles.colorInfoText}>
                    Higher scores indicate more uniform color distribution,
                    which correlates with better processing quality.
                  </Text>
                </View>
              </View>

              {/* Quality Grade Distribution */}
              <Text style={styles.chartSubtitle}>
                Quality Grade Distribution
              </Text>
              <View style={styles.gradeContainer}>
                {Object.entries(
                  analytics.color_consistency.grade_distribution,
                ).map(([grade, count]) => {
                  const total = Object.values(
                    analytics.color_consistency!.grade_distribution,
                  ).reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? (count / total) * 100 : 0;
                  const gradeColor =
                    grade === "Export"
                      ? "#4CAF50"
                      : grade === "Local"
                        ? "#FFC107"
                        : "#F44336";
                  return (
                    <View key={grade} style={styles.gradeRow}>
                      <View style={styles.gradeLabelContainer}>
                        <View
                          style={[
                            styles.gradeDot,
                            { backgroundColor: gradeColor },
                          ]}
                        />
                        <Text style={styles.gradeLabel}>{grade}</Text>
                      </View>
                      <View style={styles.gradeBarTrack}>
                        <View
                          style={[
                            styles.gradeBarFill,
                            {
                              width: `${percentage}%`,
                              backgroundColor: gradeColor,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.gradeValue}>
                        {count} ({percentage.toFixed(0)}%)
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Color Consistency by Fish Type */}
              {Object.keys(analytics.color_consistency.by_fish_type).length >
                0 && (
                <>
                  <Text style={styles.chartSubtitle}>By Fish Type</Text>
                  <View style={styles.colorByTypeContainer}>
                    {Object.entries(analytics.color_consistency.by_fish_type)
                      .sort(([, a], [, b]) => b.avg_score - a.avg_score)
                      .map(([fishType, data]) => (
                        <View key={fishType} style={styles.colorTypeRow}>
                          <Text style={styles.colorTypeLabel} numberOfLines={1}>
                            {fishType}
                          </Text>
                          <View style={styles.colorTypeBarContainer}>
                            <View
                              style={[
                                styles.colorTypeBar,
                                {
                                  width: `${data.avg_score}%`,
                                  backgroundColor:
                                    data.avg_score >= 75
                                      ? "#4CAF50"
                                      : data.avg_score >= 50
                                        ? "#FFC107"
                                        : "#F44336",
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.colorTypeValue}>
                            {data.avg_score.toFixed(0)}%
                          </Text>
                        </View>
                      ))}
                  </View>
                </>
              )}
            </View>
          )}

        {/* Mold Analysis Section */}
        {analytics.mold_analysis && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Mold Contamination Analysis</Text>

            {/* Mold Summary Stats */}
            <View style={styles.moldSummaryContainer}>
              <View style={styles.moldSummaryCard}>
                <Text style={styles.moldSummaryValue}>
                  {analytics.mold_analysis.average_coverage.toFixed(1)}%
                </Text>
                <Text style={styles.moldSummaryLabel}>Avg Coverage</Text>
              </View>
              <View style={styles.moldSummaryCard}>
                <Text style={styles.moldSummaryValue}>
                  {Object.values(
                    analytics.mold_analysis.severity_distribution,
                  ).reduce((a, b) => a + b, 0) -
                    (analytics.mold_analysis.severity_distribution.None || 0)}
                </Text>
                <Text style={styles.moldSummaryLabel}>Contaminated</Text>
              </View>
            </View>

            {/* Severity Distribution */}
            <Text style={styles.chartSubtitle}>Severity Distribution</Text>
            <View style={styles.moldSeverityContainer}>
              {Object.entries(analytics.mold_analysis.severity_distribution)
                .filter(([severity]) => severity !== "None")
                .map(([severity, count]) => {
                  const totalWithMold = Object.entries(
                    analytics.mold_analysis!.severity_distribution,
                  )
                    .filter(([s]) => s !== "None")
                    .reduce((sum, [, c]) => sum + c, 0);
                  const percentage =
                    totalWithMold > 0 ? (count / totalWithMold) * 100 : 0;
                  const severityColor =
                    severity === "Severe"
                      ? "#F44336"
                      : severity === "Moderate"
                        ? "#FF9800"
                        : "#FFC107";

                  return (
                    <View key={severity} style={styles.moldSeverityRow}>
                      <View style={styles.moldSeverityLabel}>
                        <View
                          style={[
                            styles.moldSeverityDot,
                            { backgroundColor: severityColor },
                          ]}
                        />
                        <Text style={styles.moldSeverityText}>{severity}</Text>
                      </View>
                      <View style={styles.moldSeverityBarTrack}>
                        <View
                          style={[
                            styles.moldSeverityBarFill,
                            {
                              width: `${percentage}%`,
                              backgroundColor: severityColor,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.moldSeverityCount}>{count}</Text>
                    </View>
                  );
                })}
            </View>

            {/* Spatial Distribution - Heat Map Style */}
            <Text style={styles.chartSubtitle}>
              Spatial Distribution (Split Fish)
            </Text>
            <View style={styles.spatialDistributionContainer}>
              <View style={styles.fishDiagramContainer}>
                {/* Split fish representation - Top and Bottom */}
                <View style={styles.splitFishDiagram}>
                  {/* Top zone */}
                  <View
                    style={[
                      styles.splitFishZone,
                      styles.splitFishZoneTop,
                      {
                        backgroundColor: getZoneHeatColor(
                          analytics.mold_analysis.spatial_zones.top
                            ?.fish_affected || 0,
                          analytics.total_scans,
                        ),
                      },
                    ]}
                  >
                    <Text style={styles.fishZoneLabel}>Top Half</Text>
                    <Text style={styles.fishZoneValue}>
                      {analytics.mold_analysis.spatial_zones.top
                        ?.fish_affected || 0}
                    </Text>
                  </View>
                  {/* Bottom zone */}
                  <View
                    style={[
                      styles.splitFishZone,
                      styles.splitFishZoneBottom,
                      {
                        backgroundColor: getZoneHeatColor(
                          analytics.mold_analysis.spatial_zones.bottom
                            ?.fish_affected || 0,
                          analytics.total_scans,
                        ),
                      },
                    ]}
                  >
                    <Text style={styles.fishZoneLabel}>Bottom Half</Text>
                    <Text style={styles.fishZoneValue}>
                      {analytics.mold_analysis.spatial_zones.bottom
                        ?.fish_affected || 0}
                    </Text>
                  </View>
                </View>
                {/* Heat map legend */}
                <View style={styles.heatMapLegend}>
                  <Text style={styles.heatMapLegendText}>Low</Text>
                  <View style={styles.heatMapGradient}>
                    <View
                      style={[
                        styles.heatMapGradientStep,
                        { backgroundColor: "rgba(76, 175, 80, 0.3)" },
                      ]}
                    />
                    <View
                      style={[
                        styles.heatMapGradientStep,
                        { backgroundColor: "rgba(255, 193, 7, 0.5)" },
                      ]}
                    />
                    <View
                      style={[
                        styles.heatMapGradientStep,
                        { backgroundColor: "rgba(255, 152, 0, 0.6)" },
                      ]}
                    />
                    <View
                      style={[
                        styles.heatMapGradientStep,
                        { backgroundColor: "rgba(244, 67, 54, 0.7)" },
                      ]}
                    />
                  </View>
                  <Text style={styles.heatMapLegendText}>High</Text>
                </View>
              </View>
            </View>

            {/* Mold Susceptibility by Fish Type */}
            {Object.keys(analytics.mold_analysis.by_fish_type).length > 0 && (
              <>
                <Text style={styles.chartSubtitle}>
                  Contamination Rate by Fish Type
                </Text>
                <View style={styles.moldByTypeContainer}>
                  {Object.entries(analytics.mold_analysis.by_fish_type)
                    .sort(
                      ([, a], [, b]) =>
                        b.contamination_rate - a.contamination_rate,
                    )
                    .map(([fishType, data]) => (
                      <View key={fishType} style={styles.moldTypeRow}>
                        <Text style={styles.moldTypeLabel} numberOfLines={1}>
                          {fishType}
                        </Text>
                        <View style={styles.moldTypeBarContainer}>
                          <View
                            style={[
                              styles.moldTypeBar,
                              {
                                width: `${Math.min(data.contamination_rate, 100)}%`,
                                backgroundColor:
                                  data.contamination_rate > 30
                                    ? "#F44336"
                                    : data.contamination_rate > 15
                                      ? "#FF9800"
                                      : data.contamination_rate > 5
                                        ? "#FFC107"
                                        : "#4CAF50",
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.moldTypeValue}>
                          {data.contamination_rate.toFixed(1)}%
                        </Text>
                      </View>
                    ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* Defect Pattern Analysis Section */}
        {analytics.defect_patterns && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Defect Pattern Analysis</Text>

            {/* Defect Frequency */}
            <Text style={styles.chartSubtitle}>Defect Frequency</Text>
            <View style={styles.defectFrequencyContainer}>
              {Object.entries(analytics.defect_patterns.frequency).map(
                ([defect, count]) => {
                  const totalAffected = Object.values(
                    analytics.defect_patterns!.frequency,
                  ).reduce((a, b) => a + b, 0);
                  const percentage =
                    totalAffected > 0
                      ? (count / analytics.daing_scans) * 100
                      : 0;
                  const defectLabels: Record<string, string> = {
                    poor_color_uniformity: "Poor Color Uniformity",
                    color_discoloration: "Color Discoloration",
                    acceptable_quality: "Acceptable (Local Grade)",
                  };
                  const defectColors: Record<string, string> = {
                    poor_color_uniformity: "#FF9800",
                    color_discoloration: "#F44336",
                    acceptable_quality: "#FFC107",
                  };

                  return (
                    <View key={defect} style={styles.defectRow}>
                      <View style={styles.defectLabelContainer}>
                        <View
                          style={[
                            styles.defectDot,
                            { backgroundColor: defectColors[defect] || "#888" },
                          ]}
                        />
                        <Text style={styles.defectLabel}>
                          {defectLabels[defect] || defect}
                        </Text>
                      </View>
                      <View style={styles.defectBarTrack}>
                        <View
                          style={[
                            styles.defectBarFill,
                            {
                              width: `${Math.min(percentage, 100)}%`,
                              backgroundColor: defectColors[defect] || "#888",
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.defectValue}>
                        {count} ({percentage.toFixed(1)}%)
                      </Text>
                    </View>
                  );
                },
              )}
            </View>

            {/* Most Common Defect */}
            {analytics.defect_patterns.most_common_defect && (
              <View style={styles.mostCommonDefect}>
                <Ionicons name="warning-outline" size={18} color="#FF9800" />
                <Text style={styles.mostCommonDefectText}>
                  Most Common Issue:{" "}
                  <Text style={styles.mostCommonDefectHighlight}>
                    {analytics.defect_patterns.most_common_defect
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                </Text>
              </View>
            )}

            {/* Species Susceptibility */}
            {Object.keys(analytics.defect_patterns.species_susceptibility)
              .length > 0 && (
              <>
                <Text style={styles.chartSubtitle}>
                  Species Most Susceptible to Defects
                </Text>
                <View style={styles.speciesSusceptibilityContainer}>
                  {Object.entries(
                    analytics.defect_patterns.species_susceptibility,
                  )
                    .sort(([, a], [, b]) => b.defect_rate - a.defect_rate)
                    .slice(0, 5)
                    .map(([fishType, data]) => (
                      <View key={fishType} style={styles.susceptibilityRow}>
                        <View style={styles.susceptibilityInfo}>
                          <Text style={styles.susceptibilityFishType}>
                            {fishType}
                          </Text>
                          <Text style={styles.susceptibilityStats}>
                            {data.reject_count} reject, {data.local_count} local
                          </Text>
                        </View>
                        <View style={styles.susceptibilityBarContainer}>
                          <View
                            style={[
                              styles.susceptibilityBar,
                              {
                                width: `${Math.min(data.defect_rate, 100)}%`,
                                backgroundColor:
                                  data.defect_rate > 50
                                    ? "#F44336"
                                    : data.defect_rate > 25
                                      ? "#FF9800"
                                      : "#FFC107",
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.susceptibilityRate}>
                          {data.defect_rate.toFixed(1)}%
                        </Text>
                      </View>
                    ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* Quality Grade Classification */}
        {analytics.quality_classification && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Quality Grade Classification</Text>

            {/* Quality Summary Cards */}
            <View style={styles.qualitySummaryContainer}>
              <View
                style={[
                  styles.qualitySummaryCard,
                  { backgroundColor: "rgba(76, 175, 80, 0.15)" },
                ]}
              >
                <Text
                  style={[styles.qualitySummaryValue, { color: "#4CAF50" }]}
                >
                  {analytics.quality_classification.summary.export_rate.toFixed(
                    1,
                  )}
                  %
                </Text>
                <Text style={styles.qualitySummaryLabel}>Export Grade</Text>
              </View>
              <View
                style={[
                  styles.qualitySummaryCard,
                  { backgroundColor: "rgba(255, 193, 7, 0.15)" },
                ]}
              >
                <Text
                  style={[styles.qualitySummaryValue, { color: "#FFC107" }]}
                >
                  {analytics.quality_classification.summary.local_rate.toFixed(
                    1,
                  )}
                  %
                </Text>
                <Text style={styles.qualitySummaryLabel}>Local Grade</Text>
              </View>
              <View
                style={[
                  styles.qualitySummaryCard,
                  { backgroundColor: "rgba(244, 67, 54, 0.15)" },
                ]}
              >
                <Text
                  style={[styles.qualitySummaryValue, { color: "#F44336" }]}
                >
                  {analytics.quality_classification.summary.reject_rate.toFixed(
                    1,
                  )}
                  %
                </Text>
                <Text style={styles.qualitySummaryLabel}>Reject</Text>
              </View>
            </View>

            {/* Quality by Species */}
            {Object.keys(analytics.quality_classification.by_species).length >
              0 && (
              <>
                <Text style={styles.chartSubtitle}>
                  Quality by Fish Species
                </Text>
                <View style={styles.qualityBySpeciesContainer}>
                  {Object.entries(
                    analytics.quality_classification.by_species,
                  ).map(([fishType, grades]) => {
                    const total =
                      grades.Export.count +
                      grades.Local.count +
                      grades.Reject.count;
                    if (total === 0) return null;

                    return (
                      <View key={fishType} style={styles.qualitySpeciesRow}>
                        <Text style={styles.qualitySpeciesName}>
                          {fishType}
                        </Text>
                        <View style={styles.qualityStackedBar}>
                          {grades.Export.count > 0 && (
                            <View
                              style={[
                                styles.qualityStackedSegment,
                                {
                                  width: `${(grades.Export.count / total) * 100}%`,
                                  backgroundColor: "#4CAF50",
                                },
                              ]}
                            />
                          )}
                          {grades.Local.count > 0 && (
                            <View
                              style={[
                                styles.qualityStackedSegment,
                                {
                                  width: `${(grades.Local.count / total) * 100}%`,
                                  backgroundColor: "#FFC107",
                                },
                              ]}
                            />
                          )}
                          {grades.Reject.count > 0 && (
                            <View
                              style={[
                                styles.qualityStackedSegment,
                                {
                                  width: `${(grades.Reject.count / total) * 100}%`,
                                  backgroundColor: "#F44336",
                                },
                              ]}
                            />
                          )}
                        </View>
                        <Text style={styles.qualitySpeciesCount}>{total}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* Stacked bar legend */}
                <View style={styles.qualityLegend}>
                  <View style={styles.qualityLegendItem}>
                    <View
                      style={[
                        styles.qualityLegendDot,
                        { backgroundColor: "#4CAF50" },
                      ]}
                    />
                    <Text style={styles.qualityLegendText}>Export</Text>
                  </View>
                  <View style={styles.qualityLegendItem}>
                    <View
                      style={[
                        styles.qualityLegendDot,
                        { backgroundColor: "#FFC107" },
                      ]}
                    />
                    <Text style={styles.qualityLegendText}>Local</Text>
                  </View>
                  <View style={styles.qualityLegendItem}>
                    <View
                      style={[
                        styles.qualityLegendDot,
                        { backgroundColor: "#F44336" },
                      ]}
                    />
                    <Text style={styles.qualityLegendText}>Reject</Text>
                  </View>
                </View>
              </>
            )}

            {/* Quality by Date Chart */}
            {Object.keys(analytics.quality_classification.by_date).length >
              0 && (
              <>
                <Text style={styles.chartSubtitle}>
                  Quality Trend (
                  {timeRangeOptions.find((o) => o.value === selectedDays)
                    ?.label || "7 Days"}
                  )
                </Text>
                <View style={styles.qualityTrendContainer}>
                  {Object.entries(analytics.quality_classification.by_date)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, grades]) => {
                      const total =
                        grades.Export + grades.Local + grades.Reject;
                      const formattedDate = new Date(date).toLocaleDateString(
                        "en",
                        { month: "short", day: "numeric" },
                      );

                      return (
                        <View key={date} style={styles.qualityTrendDay}>
                          <View style={styles.qualityTrendBars}>
                            <View
                              style={[
                                styles.qualityTrendBar,
                                {
                                  height: `${(grades.Export / Math.max(total, 1)) * 100}%`,
                                  backgroundColor: "#4CAF50",
                                },
                              ]}
                            />
                            <View
                              style={[
                                styles.qualityTrendBar,
                                {
                                  height: `${(grades.Local / Math.max(total, 1)) * 100}%`,
                                  backgroundColor: "#FFC107",
                                },
                              ]}
                            />
                            <View
                              style={[
                                styles.qualityTrendBar,
                                {
                                  height: `${(grades.Reject / Math.max(total, 1)) * 100}%`,
                                  backgroundColor: "#F44336",
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.qualityTrendDate}>
                            {formattedDate}
                          </Text>
                        </View>
                      );
                    })}
                </View>
              </>
            )}
          </View>
        )}

        {/* Confidence vs Color Score Scatter Plot */}
        {analytics.quality_classification &&
          Object.keys(analytics.quality_classification.by_species).length >
            0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>
                Confidence vs Color Score Distribution
              </Text>
              {(() => {
                const chartWidth = screenWidth - 80;
                const chartHeight = 200;
                const padding = { left: 35, right: 15, top: 15, bottom: 30 };
                const graphWidth = chartWidth - padding.left - padding.right;
                const graphHeight = chartHeight - padding.top - padding.bottom;

                // Collect data points - one per fish type per grade (Export/Local/Reject)
                const dataPoints: Array<{
                  fishType: string;
                  confidence: number;
                  colorScore: number;
                  grade: string;
                }> = [];

                // Get unique fish types for legend
                const fishTypes = new Set<string>();

                Object.entries(
                  analytics.quality_classification.by_species,
                ).forEach(([fishType, grades]) => {
                  fishTypes.add(fishType);
                  // Add Export grade point
                  if (
                    grades.Export.count > 0 &&
                    grades.Export.avg_confidence > 0
                  ) {
                    dataPoints.push({
                      fishType,
                      confidence: grades.Export.avg_confidence,
                      colorScore: grades.Export.avg_color_score,
                      grade: "Export",
                    });
                  }
                  // Add Local grade point
                  if (
                    grades.Local.count > 0 &&
                    grades.Local.avg_confidence > 0
                  ) {
                    dataPoints.push({
                      fishType,
                      confidence: grades.Local.avg_confidence,
                      colorScore: grades.Local.avg_color_score,
                      grade: "Local",
                    });
                  }
                  // Add Reject grade point
                  if (
                    grades.Reject.count > 0 &&
                    grades.Reject.avg_confidence > 0
                  ) {
                    dataPoints.push({
                      fishType,
                      confidence: grades.Reject.avg_confidence,
                      colorScore: grades.Reject.avg_color_score,
                      grade: "Reject",
                    });
                  }
                });

                if (dataPoints.length === 0) return null;

                return (
                  <View style={styles.scatterPlotContainer}>
                    <Svg width={chartWidth} height={chartHeight}>
                      {/* Grid lines - horizontal */}
                      {[0, 25, 50, 75, 100].map((yVal) => {
                        const y =
                          padding.top +
                          graphHeight -
                          (yVal / 100) * graphHeight;
                        return (
                          <G key={`h-grid-${yVal}`}>
                            <Line
                              x1={padding.left}
                              y1={y}
                              x2={chartWidth - padding.right}
                              y2={y}
                              stroke="#2A2A4A"
                              strokeWidth="1"
                            />
                            <SvgText
                              x={padding.left - 5}
                              y={y + 3}
                              textAnchor="end"
                              fontSize="9"
                              fill="#888888"
                            >
                              {yVal}
                            </SvgText>
                          </G>
                        );
                      })}

                      {/* Grid lines - vertical */}
                      {[0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((xVal) => {
                        const x =
                          padding.left + ((xVal - 0.5) / 0.5) * graphWidth;
                        return (
                          <G key={`v-grid-${xVal}`}>
                            <Line
                              x1={x}
                              y1={padding.top}
                              x2={x}
                              y2={padding.top + graphHeight}
                              stroke="#2A2A4A"
                              strokeWidth="1"
                            />
                            <SvgText
                              x={x}
                              y={chartHeight - 5}
                              textAnchor="middle"
                              fontSize="9"
                              fill="#888888"
                            >
                              {(xVal * 100).toFixed(0)}%
                            </SvgText>
                          </G>
                        );
                      })}

                      {/* Axis labels */}
                      <SvgText
                        x={chartWidth / 2}
                        y={chartHeight - 1}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#AAAAAA"
                      >
                        Detection Confidence
                      </SvgText>

                      {/* Data points - fixed size, colored by fish type */}
                      {dataPoints.map((point, index) => {
                        const x =
                          padding.left +
                          ((point.confidence - 0.5) / 0.5) * graphWidth;
                        const y =
                          padding.top +
                          graphHeight -
                          (point.colorScore / 100) * graphHeight;
                        const color = getColor(point.fishType);

                        return (
                          <G key={`point-${index}`}>
                            <Circle
                              cx={Math.max(
                                padding.left,
                                Math.min(x, chartWidth - padding.right),
                              )}
                              cy={Math.max(
                                padding.top,
                                Math.min(y, padding.top + graphHeight),
                              )}
                              r={6}
                              fill={color}
                              opacity={0.85}
                              stroke="#FFFFFF"
                              strokeWidth={1}
                            />
                          </G>
                        );
                      })}
                    </Svg>

                    {/* Y-axis label */}
                    <Text style={styles.scatterYLabel}>Color Score</Text>

                    {/* Legend - fish types */}
                    <View style={styles.scatterLegend}>
                      {Array.from(
                        new Set(dataPoints.map((p) => p.fishType)),
                      ).map((fishType) => (
                        <View key={fishType} style={styles.scatterLegendItem}>
                          <View
                            style={[
                              styles.scatterLegendDot,
                              { backgroundColor: getColor(fishType) },
                            ]}
                          />
                          <Text style={styles.scatterLegendText}>
                            {fishType}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })()}
            </View>
          )}

        {/* Daily Scans - Line Graph */}
        {Object.keys(analytics.daily_scans).length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>
              Daily Scans Trend (
              {timeRangeOptions.find((o) => o.value === selectedDays)?.label ||
                "7 Days"}
              )
            </Text>
            {(() => {
              const dailyEntries = Object.entries(analytics.daily_scans).sort(
                ([a], [b]) => a.localeCompare(b),
              );
              const maxDaily = Math.max(
                ...Object.values(analytics.daily_scans),
                1,
              );
              const chartWidth = screenWidth - 80;
              const chartHeight = 120;
              const padding = { left: 30, right: 10, top: 10, bottom: 30 };
              const graphWidth = chartWidth - padding.left - padding.right;
              const graphHeight = chartHeight - padding.top - padding.bottom;

              // Generate line path points
              const points = dailyEntries
                .map(([, count], index) => {
                  const x =
                    padding.left +
                    (index / (dailyEntries.length - 1 || 1)) * graphWidth;
                  const y =
                    padding.top +
                    graphHeight -
                    (count / maxDaily) * graphHeight;
                  return `${x},${y}`;
                })
                .join(" ");

              return (
                <View style={styles.lineChartContainer}>
                  <Svg width={chartWidth} height={chartHeight}>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                      <Line
                        key={`grid-${i}`}
                        x1={padding.left}
                        y1={padding.top + graphHeight * (1 - ratio)}
                        x2={chartWidth - padding.right}
                        y2={padding.top + graphHeight * (1 - ratio)}
                        stroke="#2A2A4A"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Y-axis labels */}
                    <SvgText
                      x="5"
                      y={padding.top + 4}
                      fontSize="10"
                      fill="#888888"
                    >
                      {maxDaily}
                    </SvgText>
                    <SvgText
                      x="5"
                      y={padding.top + graphHeight / 2 + 4}
                      fontSize="10"
                      fill="#888888"
                    >
                      {Math.round(maxDaily / 2)}
                    </SvgText>
                    <SvgText
                      x="5"
                      y={padding.top + graphHeight + 4}
                      fontSize="10"
                      fill="#888888"
                    >
                      0
                    </SvgText>

                    {/* Area under the line */}
                    <Path
                      d={`M ${padding.left},${padding.top + graphHeight} ${dailyEntries
                        .map(([, count], index) => {
                          const x =
                            padding.left +
                            (index / (dailyEntries.length - 1 || 1)) *
                              graphWidth;
                          const y =
                            padding.top +
                            graphHeight -
                            (count / maxDaily) * graphHeight;
                          return `L ${x},${y}`;
                        })
                        .join(
                          " ",
                        )} L ${chartWidth - padding.right},${padding.top + graphHeight} Z`}
                      fill="rgba(76, 175, 80, 0.2)"
                    />

                    {/* Line */}
                    <Polyline
                      points={points}
                      fill="none"
                      stroke="#4CAF50"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Data points */}
                    {dailyEntries.map(([, count], index) => {
                      const x =
                        padding.left +
                        (index / (dailyEntries.length - 1 || 1)) * graphWidth;
                      const y =
                        padding.top +
                        graphHeight -
                        (count / maxDaily) * graphHeight;
                      return (
                        <G key={index}>
                          <Circle
                            cx={x}
                            cy={y}
                            r="6"
                            fill={theme.colors.backgroundLight}
                          />
                          <Circle cx={x} cy={y} r="4" fill="#4CAF50" />
                        </G>
                      );
                    })}

                    {/* X-axis labels */}
                    {dailyEntries.map(([date], index) => {
                      const x =
                        padding.left +
                        (index / (dailyEntries.length - 1 || 1)) * graphWidth;
                      const formattedDate = new Date(date).toLocaleDateString(
                        "en",
                        {
                          month: "short",
                          day: "numeric",
                        },
                      );
                      return (
                        <SvgText
                          key={`label-${index}`}
                          x={x}
                          y={chartHeight - 5}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#888888"
                        >
                          {formattedDate}
                        </SvgText>
                      );
                    })}
                  </Svg>

                  {/* Values above points */}
                  <View style={styles.lineChartValuesContainer}>
                    {dailyEntries.map(([date, count], index) => (
                      <View
                        key={date}
                        style={[
                          styles.lineChartValue,
                          {
                            left:
                              padding.left +
                              (index / (dailyEntries.length - 1 || 1)) *
                                graphWidth -
                              15,
                            top:
                              padding.top +
                              graphHeight -
                              (count / maxDaily) * graphHeight -
                              25,
                          },
                        ]}
                      >
                        <Text style={styles.lineChartValueText}>{count}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}
          </View>
        )}

        {/* Fish Type Distribution Pie Chart */}
        {Object.keys(analytics.fish_type_distribution).length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Fish Type Distribution</Text>
            {(() => {
              const fishEntries = Object.entries(
                analytics.fish_type_distribution,
              ).sort(([, a], [, b]) => b - a);
              const totalFish = fishEntries.reduce(
                (sum, [, count]) => sum + count,
                0,
              );
              let currentAngle = -90; // Start from top

              // Generate pie slices
              const slices = fishEntries.map(([fishType, count]) => {
                const percentage = (count / totalFish) * 100;
                const angle = (percentage / 100) * 360;
                const startAngle = currentAngle;
                currentAngle += angle;

                // Calculate arc path
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = ((startAngle + angle) * Math.PI) / 180;
                const x1 = 50 + 40 * Math.cos(startRad);
                const y1 = 50 + 40 * Math.sin(startRad);
                const x2 = 50 + 40 * Math.cos(endRad);
                const y2 = 50 + 40 * Math.sin(endRad);
                const largeArc = angle > 180 ? 1 : 0;

                return {
                  fishType,
                  count,
                  percentage,
                  color: getColor(fishType),
                  path:
                    angle >= 360
                      ? `M 50 10 A 40 40 0 1 1 49.99 10 Z` // Full circle
                      : `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`,
                };
              });

              return (
                <View style={styles.fishPieContainer}>
                  <Svg width={160} height={160} viewBox="0 0 100 100">
                    {slices.map(({ fishType, path, color }) => (
                      <Path key={fishType} d={path} fill={color} />
                    ))}
                    {/* Center hole for donut effect */}
                    <Circle
                      cx="50"
                      cy="50"
                      r="25"
                      fill={theme.colors.backgroundLight}
                    />
                    <SvgText
                      x="50"
                      y="48"
                      textAnchor="middle"
                      fontSize="14"
                      fontWeight="bold"
                      fill="#FFFFFF"
                    >
                      {totalFish}
                    </SvgText>
                    <SvgText
                      x="50"
                      y="58"
                      textAnchor="middle"
                      fontSize="7"
                      fill="#888888"
                    >
                      Fish
                    </SvgText>
                  </Svg>
                  <View style={styles.fishPieLegend}>
                    {slices.map(({ fishType, count, percentage, color }) => (
                      <View key={fishType} style={styles.fishPieLegendItem}>
                        <View
                          style={[
                            styles.fishPieLegendDot,
                            { backgroundColor: color },
                          ]}
                        />
                        <Text
                          style={styles.fishPieLegendText}
                          numberOfLines={1}
                        >
                          {fishType}: {count} ({percentage.toFixed(0)}%)
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Graph Selection Modal */}
      <Modal
        visible={showGraphSelectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGraphSelectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Graphs to Export</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowGraphSelectModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.selectAllContainer}>
              <TouchableOpacity
                style={[
                  styles.selectAllButton,
                  selectedGraphs.length === getAvailableGraphs().length &&
                    styles.selectAllButtonActive,
                ]}
                onPress={toggleSelectAll}
              >
                <Ionicons
                  name={
                    selectedGraphs.length === getAvailableGraphs().length
                      ? "checkbox"
                      : "square-outline"
                  }
                  size={18}
                  color={
                    selectedGraphs.length === getAvailableGraphs().length
                      ? theme.colors.primary
                      : theme.colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.selectAllText,
                    selectedGraphs.length !== getAvailableGraphs().length &&
                      styles.selectAllTextInactive,
                  ]}
                >
                  {selectedGraphs.length === getAvailableGraphs().length
                    ? "Deselect All"
                    : "Select All"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.graphListContainer}>
              {getAvailableGraphs().map((graph) => (
                <TouchableOpacity
                  key={graph.id}
                  style={[
                    styles.graphOption,
                    selectedGraphs.includes(graph.id) &&
                      styles.graphOptionSelected,
                  ]}
                  onPress={() => toggleGraphSelection(graph.id)}
                >
                  <View style={styles.graphCheckbox}>
                    <Ionicons
                      name={
                        selectedGraphs.includes(graph.id)
                          ? "checkbox"
                          : "square-outline"
                      }
                      size={22}
                      color={
                        selectedGraphs.includes(graph.id)
                          ? theme.colors.primary
                          : theme.colors.textMuted
                      }
                    />
                  </View>
                  <View style={styles.graphInfo}>
                    <Text style={styles.graphLabel}>{graph.label}</Text>
                    <Text style={styles.graphDescription}>
                      {graph.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Text style={styles.selectedCount}>
                {selectedGraphs.length} of {getAvailableGraphs().length}{" "}
                selected
              </Text>
              <TouchableOpacity
                style={[
                  styles.proceedButton,
                  selectedGraphs.length === 0 && styles.proceedButtonDisabled,
                ]}
                onPress={proceedToFormatSelection}
              >
                <Text style={styles.proceedButtonText}>
                  Next: Choose Format
                </Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Format Selection Modal */}
      <Modal
        visible={showFormatSelectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFormatSelectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.formatModalContent]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalBackButton}
                onPress={() => {
                  setShowFormatSelectModal(false);
                  setShowGraphSelectModal(true);
                }}
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Choose Export Format</Text>
              <View style={{ width: 40 }} />
            </View>

            <Text style={styles.formatSubtitle}>
              {selectedGraphs.length} graph
              {selectedGraphs.length !== 1 ? "s" : ""} selected for export
            </Text>

            <Text style={styles.formatNote}>
              Note: Files will open in share menu to save or send. This is
              required by mobile platforms for secure file access.
            </Text>

            <View style={styles.formatOptions}>
              <TouchableOpacity
                style={styles.formatOption}
                onPress={() => exportReport("pdf")}
                disabled={isExporting}
              >
                <View
                  style={[styles.formatIcon, { backgroundColor: "#F44336" }]}
                >
                  <Ionicons name="document-text" size={32} color="white" />
                </View>
                <Text style={styles.formatLabel}>PDF</Text>
                <Text style={styles.formatDescription}>
                  Best for printing. Includes charts, headers, and detailed
                  summaries.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.formatOption}
                onPress={() => exportReport("word")}
                disabled={isExporting}
              >
                <View
                  style={[styles.formatIcon, { backgroundColor: "#2196F3" }]}
                >
                  <Ionicons name="document" size={32} color="white" />
                </View>
                <Text style={styles.formatLabel}>Document</Text>
                <Text style={styles.formatDescription}>
                  HTML format with charts and summaries. Editable in any browser
                  or word processor.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.formatOption}
                onPress={() => exportReport("excel")}
                disabled={isExporting}
              >
                <View
                  style={[styles.formatIcon, { backgroundColor: "#4CAF50" }]}
                >
                  <Ionicons name="grid" size={32} color="white" />
                </View>
                <Text style={styles.formatLabel}>Spreadsheet</Text>
                <Text style={styles.formatDescription}>
                  CSV format with raw data. Import into Excel or Google Sheets.
                </Text>
              </TouchableOpacity>
            </View>

            {isExporting && (
              <View style={styles.exportingOverlay}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.exportingText}>Generating report...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: "center",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  downloadButton: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  // Time Range Selector Styles
  timeRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  timeRangeLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  timeRangeButtons: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  timeRangeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeRangeButtonActive: {
    backgroundColor: `${theme.colors.primary}20`,
    borderColor: theme.colors.primary,
  },
  timeRangeButtonText: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  timeRangeButtonTextActive: {
    color: theme.colors.primary,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.backgroundLight,
    gap: 6,
  },
  activeTab: {
    backgroundColor: `${theme.colors.primary}20`,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  summaryContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  summaryIcon: {
    marginBottom: 8,
  },
  totalCard: {
    backgroundColor: theme.colors.primary + "30",
    borderWidth: 1,
    borderColor: theme.colors.primary + "50",
  },
  successCard: {
    backgroundColor: theme.colors.success + "30",
    borderWidth: 1,
    borderColor: theme.colors.success + "50",
  },
  errorCard: {
    backgroundColor: theme.colors.error + "30",
    borderWidth: 1,
    borderColor: theme.colors.error + "50",
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chartContainer: {
    backgroundColor: theme.colors.backgroundLight,
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 16,
  },
  pieChartContainer: {
    alignItems: "center",
  },
  pieChart: {
    width: "100%",
    height: 24,
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
  },
  pieSlice: {
    height: "100%",
  },
  legendContainer: {
    marginTop: 16,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    color: "#CCC",
    fontSize: 14,
  },
  barChartContainer: {
    gap: 12,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barLabel: {
    width: 100,
    fontSize: 12,
    color: "#CCC",
  },
  barTrack: {
    flex: 1,
    height: 24,
    backgroundColor: "#2A2A4A",
    borderRadius: 12,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 12,
  },
  barValue: {
    width: 40,
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    textAlign: "right",
  },
  confidenceContainer: {
    gap: 12,
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  confidenceType: {
    width: 100,
    fontSize: 12,
    color: "#CCC",
  },
  confidenceBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: "#2A2A4A",
    borderRadius: 10,
    overflow: "hidden",
  },
  confidenceBar: {
    height: "100%",
    borderRadius: 10,
  },
  confidenceValue: {
    width: 50,
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    textAlign: "right",
  },
  dailyScansContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 150,
    gap: 8,
  },
  dailyBar: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  dailyCount: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 4,
  },
  dailyBarTrack: {
    width: "100%",
    height: 100,
    backgroundColor: "#2A2A4A",
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  dailyBarFill: {
    width: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 8,
  },
  dailyLabel: {
    fontSize: 10,
    color: "#888",
    marginTop: 4,
    textAlign: "center",
  },
  // Color Consistency Styles
  chartSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textSecondary,
    marginTop: 20,
    marginBottom: 12,
  },
  colorScoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  colorScoreCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.primary + "30",
    borderWidth: 3,
    borderColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  colorScoreValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  colorScoreLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  colorScoreInfo: {
    flex: 1,
  },
  colorInfoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  gradeContainer: {
    gap: 10,
  },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gradeLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 70,
    gap: 6,
  },
  gradeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  gradeLabel: {
    fontSize: 12,
    color: "#CCC",
  },
  gradeBarTrack: {
    flex: 1,
    height: 16,
    backgroundColor: "#2A2A4A",
    borderRadius: 8,
    overflow: "hidden",
  },
  gradeBarFill: {
    height: "100%",
    borderRadius: 8,
  },
  gradeValue: {
    width: 70,
    fontSize: 12,
    color: "#fff",
    textAlign: "right",
  },
  colorByTypeContainer: {
    gap: 10,
  },
  colorTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorTypeLabel: {
    width: 100,
    fontSize: 12,
    color: "#CCC",
  },
  colorTypeBarContainer: {
    flex: 1,
    height: 18,
    backgroundColor: "#2A2A4A",
    borderRadius: 9,
    overflow: "hidden",
  },
  colorTypeBar: {
    height: "100%",
    borderRadius: 9,
  },
  colorTypeValue: {
    width: 40,
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
    textAlign: "right",
  },
  // Circular Pie Chart Styles
  circularPieContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  // Scatter Plot Styles
  scatterPlotContainer: {
    position: "relative",
    marginTop: 10,
  },
  scatterYLabel: {
    position: "absolute",
    left: 0,
    top: "40%",
    fontSize: 10,
    color: "#AAAAAA",
    transform: [{ rotate: "-90deg" }],
    width: 80,
    textAlign: "center",
  },
  scatterLegend: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    flexWrap: "wrap",
  },
  scatterLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scatterLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scatterLegendText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  // Line Chart Styles
  lineChartContainer: {
    position: "relative",
    marginTop: 10,
  },
  lineChartValuesContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lineChartValue: {
    position: "absolute",
    width: 30,
    alignItems: "center",
  },
  lineChartValueText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4CAF50",
  },
  // Fish Type Pie Chart Styles
  fishPieContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fishPieLegend: {
    flex: 1,
    marginLeft: 16,
    gap: 6,
  },
  fishPieLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fishPieLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  fishPieLegendText: {
    fontSize: 11,
    color: "#CCC",
    flex: 1,
  },
  // Mold Analysis Styles
  moldSummaryContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  moldSummaryCard: {
    flex: 1,
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(244, 67, 54, 0.3)",
  },
  moldSummaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F44336",
  },
  moldSummaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  moldSeverityContainer: {
    gap: 10,
    marginBottom: 8,
  },
  moldSeverityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moldSeverityLabel: {
    flexDirection: "row",
    alignItems: "center",
    width: 90,
    gap: 8,
  },
  moldSeverityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  moldSeverityText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  moldSeverityBarTrack: {
    flex: 1,
    height: 16,
    backgroundColor: "#2A2A4A",
    borderRadius: 8,
    overflow: "hidden",
  },
  moldSeverityBarFill: {
    height: "100%",
    borderRadius: 8,
  },
  moldSeverityCount: {
    width: 30,
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "right",
  },
  spatialDistributionContainer: {
    marginBottom: 8,
  },
  fishDiagramContainer: {
    alignItems: "center",
  },
  // Split fish diagram for daing na hati sa gitna
  splitFishDiagram: {
    flexDirection: "column",
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  splitFishZone: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  splitFishZoneTop: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  splitFishZoneBottom: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomWidth: 0,
  },
  // Legacy horizontal fish diagram (kept for reference)
  fishDiagram: {
    flexDirection: "row",
    width: "100%",
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  fishZone: {
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.1)",
  },
  fishZoneHead: {
    flex: 1,
    borderTopLeftRadius: 50,
    borderBottomLeftRadius: 30,
  },
  fishZoneBodyUpper: {
    flex: 1.5,
  },
  fishZoneBelly: {
    flex: 1.5,
  },
  fishZoneTail: {
    flex: 1,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 40,
    borderRightWidth: 0,
  },
  fishZoneLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.text,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  fishZoneValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heatMapLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heatMapLegendText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  heatMapGradient: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  heatMapGradientStep: {
    width: 30,
    height: "100%",
  },
  moldByTypeContainer: {
    gap: 10,
  },
  moldTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moldTypeLabel: {
    width: 100,
    fontSize: 12,
    color: "#CCC",
  },
  moldTypeBarContainer: {
    flex: 1,
    height: 18,
    backgroundColor: "#2A2A4A",
    borderRadius: 9,
    overflow: "hidden",
  },
  moldTypeBar: {
    height: "100%",
    borderRadius: 9,
  },
  moldTypeValue: {
    width: 50,
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
    textAlign: "right",
  },
  // Defect Pattern Analysis Styles
  defectFrequencyContainer: {
    gap: 10,
    marginBottom: 16,
  },
  defectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  defectLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 140,
    gap: 8,
  },
  defectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  defectLabel: {
    fontSize: 12,
    color: "#CCC",
    flex: 1,
  },
  defectBarTrack: {
    flex: 1,
    height: 16,
    backgroundColor: "#2A2A4A",
    borderRadius: 8,
    overflow: "hidden",
  },
  defectBarFill: {
    height: "100%",
    borderRadius: 8,
  },
  defectValue: {
    width: 80,
    fontSize: 12,
    color: "#fff",
    textAlign: "right",
  },
  mostCommonDefect: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 152, 0, 0.3)",
  },
  mostCommonDefectText: {
    fontSize: 13,
    color: theme.colors.text,
    flex: 1,
  },
  mostCommonDefectHighlight: {
    fontWeight: "600",
    color: "#FF9800",
  },
  speciesSusceptibilityContainer: {
    gap: 10,
  },
  susceptibilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  susceptibilityInfo: {
    width: 110,
  },
  susceptibilityFishType: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: "600",
  },
  susceptibilityStats: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  susceptibilityBarContainer: {
    flex: 1,
    height: 16,
    backgroundColor: "#2A2A4A",
    borderRadius: 8,
    overflow: "hidden",
  },
  susceptibilityBar: {
    height: "100%",
    borderRadius: 8,
  },
  susceptibilityRate: {
    width: 45,
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    textAlign: "right",
  },
  // Quality Grade Classification Styles
  qualitySummaryContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  qualitySummaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  qualitySummaryValue: {
    fontSize: 22,
    fontWeight: "bold",
  },
  qualitySummaryLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  qualityBySpeciesContainer: {
    gap: 10,
    marginBottom: 12,
  },
  qualitySpeciesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qualitySpeciesName: {
    width: 100,
    fontSize: 12,
    color: theme.colors.text,
  },
  qualityStackedBar: {
    flex: 1,
    height: 18,
    flexDirection: "row",
    backgroundColor: "#2A2A4A",
    borderRadius: 9,
    overflow: "hidden",
  },
  qualityStackedSegment: {
    height: "100%",
  },
  qualitySpeciesCount: {
    width: 30,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "right",
  },
  qualityLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 16,
  },
  qualityLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  qualityLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  qualityLegendText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  qualityTrendContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 100,
    alignItems: "flex-end",
    gap: 4,
  },
  qualityTrendDay: {
    flex: 1,
    alignItems: "center",
  },
  qualityTrendBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 70,
    gap: 2,
  },
  qualityTrendBar: {
    width: 8,
    borderRadius: 4,
    minHeight: 2,
  },
  qualityTrendDate: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  formatModalContent: {
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    flex: 1,
    textAlign: "center",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: "center",
    alignItems: "center",
  },
  selectAllContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectAllButtonActive: {
    backgroundColor: `${theme.colors.primary}15`,
    borderColor: theme.colors.primary,
  },
  selectAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  selectAllTextInactive: {
    color: theme.colors.textMuted,
  },
  deselectAllText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
  graphListContainer: {
    maxHeight: 350,
    paddingHorizontal: 16,
  },
  graphOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginVertical: 4,
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  graphOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  graphCheckbox: {
    marginRight: 12,
  },
  graphInfo: {
    flex: 1,
  },
  graphLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  graphDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  proceedButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  proceedButtonDisabled: {
    backgroundColor: theme.colors.textMuted,
    opacity: 0.6,
  },
  proceedButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  formatSubtitle: {
    textAlign: "center",
    fontSize: 14,
    color: theme.colors.textSecondary,
    paddingVertical: 12,
  },
  formatNote: {
    textAlign: "center",
    fontSize: 12,
    color: theme.colors.textMuted,
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontStyle: "italic",
  },
  formatOptions: {
    padding: 16,
    gap: 12,
  },
  formatOption: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formatIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  formatLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
  },
  formatDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  exportingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  exportingText: {
    color: theme.colors.text,
    fontSize: 16,
    marginTop: 16,
    fontWeight: "500",
  },
});
