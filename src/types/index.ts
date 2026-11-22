export type TrackType = "chef-pepper" | "knowledge-graph" | "dish-to-post" | "trend-radar" | "creator-scout" | "intel-desk";

export type {
  RestaurantProfile,
  BoardTrend,
  PostPlan,
  VettedCreator,
  RivalComplaint,
  Insight,
} from "@/lib/hospitalityGraph";
export type { WebSource, YouSearchResponse } from "@/lib/youSearch";

export interface GraphNode {
  id: string;
  label: string;
  /** Neo4j label: Restaurant, MenuItem, Ingredient, FoodTrend, LocalCreator, Competitor, Complaint, Strength, Neighborhood */
  type: string;
  details?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface MaskoAgentState {
  avatarId: string;
  mascotName: string;
  mood: "idle" | "speaking" | "thinking" | "alert" | "excited";
  currentSpeech: string;
  isVoiceActive: boolean;
  imageUrl?: string;
}

export interface GraphQueryTrace {
  name: string;
  cypher: string;
  rows: Record<string, unknown>[];
}
