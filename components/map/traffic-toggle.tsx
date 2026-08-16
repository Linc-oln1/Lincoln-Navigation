"use client"

import { Car, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface TrafficToggleProps {
  showTraffic: boolean
  onToggle: () => void
}

export function TrafficToggle({ showTraffic, onToggle }: TrafficToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "absolute top-20 left-4 z-[1000] flex items-center gap-2 px-3 py-2 rounded-xl border shadow-lg transition-all",
        showTraffic
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card/90 backdrop-blur-sm text-foreground border-border hover:bg-card"
      )}
    >
      <Car className="w-4 h-4" />
      <span className="text-sm font-medium">Traffic</span>
      {showTraffic && (
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      )}
    </button>
  )
}
