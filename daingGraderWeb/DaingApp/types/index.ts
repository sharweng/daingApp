export type Screen =
  | "home"
  | "scan"
  | "analytics"
  | "dataGathering"
  | "history"
  | "dataset";

export type FishType = "danggit" | "galunggong" | "espada" | "bangus" | "pusit";

export type Condition = "local_quality" | "export_quality" | "moldy" | "fresh";

export interface HistoryEntry {
  id: string;
  url: string;
  timestamp: string;
  folder?: string;
}
