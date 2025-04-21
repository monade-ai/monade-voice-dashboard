'use client';

import { useRef, useEffect, useState } from "react";
import { InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CostDisplayProps {
  costPerMinute: number;
  label?: string;
  showInfo?: boolean;
  infoText?: string;
}

export default function CostDisplay({
  costPerMinute,
  label = "Cost",
  showInfo = true,
  infoText = "Estimated cost per minute of usage",
}: CostDisplayProps) {
  // Animate the cost value on change
  const [displayCost, setDisplayCost] = useState(costPerMinute);
  const prevCost = useRef(costPerMinute);

  useEffect(() => {
    if (costPerMinute !== prevCost.current) {
      let frame: number;
      const start = prevCost.current;
      const end = costPerMinute;
      const duration = 400;
      const startTime = performance.now();

      function animate(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setDisplayCost(start + (end - start) * progress);
        if (progress < 1) {
          frame = requestAnimationFrame(animate);
        } else {
          prevCost.current = end;
        }
      }
      frame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frame);
    }
  }, [costPerMinute]);

  // Bar width and color based on cost
  const barWidth = Math.min(100, Math.max(10, (costPerMinute / 1.0) * 100));
  const barColor =
    costPerMinute < 0.2
      ? "from-green-400 to-emerald-500"
      : costPerMinute < 0.5
      ? "from-amber-400 to-yellow-500"
      : "from-fuchsia-500 to-pink-500";

  return (
    <div className="relative w-full p-4 bg-white rounded-xl border border-gray-100 shadow-md transition-transform duration-200 hover:scale-[1.025] hover:shadow-lg group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1">
          <span className="text-gray-700 font-semibold tracking-wide uppercase text-xs">
            {label}
          </span>
          {showInfo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-4 w-4 text-gray-400 group-hover:text-amber-500 transition-colors" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">{infoText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="w-full text-center">
        <div
          className="font-extrabold text-4xl bg-gradient-to-r from-amber-500 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent transition-all duration-300"
          style={{ letterSpacing: "0.01em" }}
        >
          ~₹{displayCost.toFixed(2)}
          <span className="text-lg text-gray-400 font-medium ml-1">/min</span>
        </div>
      </div>

      {/* Animated visual cost indicator */}
      <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 bg-gradient-to-r ${barColor}`}
          style={{
            width: `${barWidth}%`,
            minWidth: "10%",
            boxShadow: "0 0 8px 0 rgba(251,191,36,0.25)",
          }}
        ></div>
      </div>
    </div>
  );
}
