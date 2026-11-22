"use client";

import React, { useEffect, useRef, useState } from "react";
import { GraphNode, GraphEdge } from "@/types";
import { Database, RefreshCw, ZoomIn, ZoomOut, CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";

interface GraphVisualizerProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode?: (node: GraphNode | null) => void;
  selectedNodeId?: string | null;
}

export const Neo4jGraphVisualizer: React.FC<GraphVisualizerProps> = ({
  nodes,
  edges,
  onSelectNode,
  selectedNodeId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [cypherQuery, setCypherQuery] = useState(
    "MATCH (c:Creator)-[:TARGETS]->(n:Niche)<-[:TRENDING_IN]-(t:Trend) RETURN c, n, t"
  );
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const getNodeColor = (node: GraphNode) => {
    if (node.status === "debunked") return "#ef4444"; // red
    if (node.status === "disputed") return "#f59e0b"; // yellow
    if (node.status === "verified") return "#10b981"; // green
    if (node.type === "creator") return "#6366f1"; // indigo
    if (node.type === "niche") return "#8b5cf6"; // purple
    if (node.type === "trend") return "#ec4899"; // pink
    if (node.type === "brand") return "#06b6d4"; // cyan
    if (node.type === "format") return "#f97316"; // orange
    return "#64748b";
  };

  const filteredNodes = nodes.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "claims") return n.type === "claim" || n.type === "source";
    if (activeFilter === "trends") return n.type === "trend" || n.type === "niche";
    if (activeFilter === "sponsors") return n.type === "brand" || n.type === "creator";
    return true;
  });

  const filteredEdges = edges.filter((e) => {
    const sourceExists = filteredNodes.some((n) => n.id === e.source);
    const targetExists = filteredNodes.some((n) => n.id === e.target);
    return sourceExists && targetExists;
  });

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 overflow-hidden flex flex-col h-full shadow-xl">
      {/* Visualizer Header */}
      <div className="px-4 py-3 border-b border-neutral-800/80 bg-neutral-900/40 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-semibold text-neutral-200">
            GraphRAG Relational Knowledge Graph (Neo4j AuraDB)
          </h3>
          <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full font-mono">
            {filteredNodes.length} Nodes • {filteredEdges.length} Relationships
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 text-[11px]">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-2 py-1 rounded transition ${
              activeFilter === "all" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter("claims")}
            className={`px-2 py-1 rounded transition ${
              activeFilter === "claims" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            Fact Checks
          </button>
          <button
            onClick={() => setActiveFilter("trends")}
            className={`px-2 py-1 rounded transition ${
              activeFilter === "trends" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            Trends
          </button>
          <button
            onClick={() => setActiveFilter("sponsors")}
            className={`px-2 py-1 rounded transition ${
              activeFilter === "sponsors" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            Sponsors
          </button>
        </div>
      </div>

      {/* Graph Interactive Surface */}
      <div className="relative flex-1 bg-gradient-to-b from-neutral-950 via-neutral-900/60 to-neutral-950 min-h-[300px] p-4 overflow-hidden">
        {/* Visual Graph Representation using SVG Nodes & Connectors */}
        <div className="relative w-full h-full flex flex-wrap items-center justify-around gap-4 p-4">
          {filteredNodes.map((node, idx) => {
            const isSelected = selectedNode?.id === node.id || selectedNodeId === node.id;
            const color = getNodeColor(node);

            return (
              <div
                key={node.id}
                onClick={() => {
                  setSelectedNode(node);
                  if (onSelectNode) onSelectNode(node);
                }}
                style={{ borderColor: isSelected ? "#ffffff" : `${color}60` }}
                className={`group cursor-pointer relative p-3 rounded-xl border bg-neutral-900/90 hover:bg-neutral-850 transition-all shadow-lg hover:shadow-indigo-500/10 hover:scale-105 min-w-[130px] max-w-[180px] ${
                  isSelected ? "ring-2 ring-white scale-105" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${color}20`, color: color }}
                  >
                    {node.type}
                  </span>
                  {node.status === "verified" && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                  {node.status === "debunked" && <XCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />}
                  {node.status === "disputed" && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                </div>

                <div className="text-xs font-semibold text-neutral-200 truncate group-hover:text-white">
                  {node.label}
                </div>

                <div className="mt-1 text-[10px] text-neutral-400 flex items-center justify-between">
                  <span>ID: {node.id.slice(0, 10)}</span>
                  <span className="capitalize text-[9px] opacity-70">{node.status || "active"}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-96 rounded-xl bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 p-3.5 shadow-2xl z-20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">Node Inspector</span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-neutral-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-neutral-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-300">
                <span className="text-neutral-500">Label:</span>
                <span className="font-semibold">{selectedNode.label}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span className="text-neutral-500">Type:</span>
                <span className="font-mono uppercase text-indigo-400">{selectedNode.type}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span className="text-neutral-500">Status:</span>
                <span className={`font-semibold capitalize ${
                  selectedNode.status === "verified" ? "text-emerald-400" :
                  selectedNode.status === "debunked" ? "text-rose-400" :
                  selectedNode.status === "disputed" ? "text-amber-400" : "text-neutral-400"
                }`}>
                  {selectedNode.status || "Active"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cypher Console Footer */}
      <div className="px-4 py-2 border-t border-neutral-800 bg-neutral-950 font-mono text-[11px] text-neutral-400 flex items-center justify-between">
        <div className="flex items-center space-x-2 overflow-hidden truncate">
          <span className="text-purple-400 font-bold">CYPHER:</span>
          <span className="truncate text-neutral-300">{cypherQuery}</span>
        </div>
        <button
          onClick={() => {
            setCypherQuery("MATCH (t:Trend)-[:VERIFIED_BY]->(s:Source) RETURN t, s LIMIT 10");
          }}
          className="ml-2 text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Sync</span>
        </button>
      </div>
    </div>
  );
};
