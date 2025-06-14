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
  const barWidth = Math.min(100, Math.max(10, (costPerMinute / 30) * 100));
  const barColor = "from-[#39594D] to-[#E25D41]";

  return (
    <div className="relative w-full p-4 bg-[#F5F6FA] rounded-xl border border-[#E5E5E0] shadow-md transition-transform duration-200 hover:scale-[1.025] hover:shadow-lg group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1">
          <span className="text-[#181A1B] font-semibold tracking-wide uppercase text-xs">
            {label}
          </span>
          {showInfo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="h-4 w-4 text-[#D18EE2] group-hover:text-[#E25D41] transition-colors" />
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
          className="font-extrabold text-4xl text-[#181A1B] transition-all duration-300"
          style={{ letterSpacing: "0.01em" }}
        >
          ~₹{displayCost.toFixed(2)}
          <span className="text-lg text-[#39594D] font-medium ml-1">/min</span>
        </div>
      </div>

      {/* Animated visual cost indicator */}
      <div className="mt-4 h-2 w-full bg-[#E5E5E0] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 bg-gradient-to-r ${barColor}`}
          style={{
            width: `${barWidth}%`,
            minWidth: "10%",
            boxShadow: "0 0 8px 0 rgba(226,93,65,0.18)",
          }}
        ></div>
      </div>
    </div>
  );
}
