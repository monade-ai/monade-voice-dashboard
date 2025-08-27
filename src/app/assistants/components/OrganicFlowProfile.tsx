import React, { useEffect, useRef, useState } from "react";
import {
  getVariationForName,
  generateConcentricShapes,
} from "../../../lib/utils/organicFlowGenerator";

interface OrganicFlowProfileProps {
  name: string;
  size?: "circle" | "square";
  dimension?: number;
  className?: string;
}

const OrganicFlowProfile: React.FC<OrganicFlowProfileProps> = ({
  name,
  size = "circle",
  dimension,
  className = "",
}) => {
  const profileRef = useRef<HTMLDivElement>(null);
  const [variation, setVariation] = useState<ReturnType<typeof getVariationForName> | null>(null);
  const [shapes, setShapes] = useState<any[]>([]);

  useEffect(() => {
    if (!name) return;
    const varData = getVariationForName(name);
    if (!varData) return;
    const shapesData = generateConcentricShapes(varData, size, name);
    setVariation(varData);
    setShapes(shapesData);
  }, [name, size]);

  if (!variation || !shapes.length) {
    return (
      <div
        className={`bg-gray-700 flex items-center justify-center text-blue-400 font-bold ${className}`}
        style={{
          width: dimension || (size === "circle" ? 40 : 80),
          height: dimension || (size === "circle" ? 40 : 80),
          borderRadius: size === "circle" ? "50%" : "25%",
        }}
      >
        {name?.substring(0, 2) || "??"}
      </div>
    );
  }

  const defaultDimension = size === "circle" ? 40 : 80;
  const actualDimension = dimension || defaultDimension;

  return (
    <div
      ref={profileRef}
      className={`organic-profile ${size} ${className}`}
      style={{
        width: actualDimension,
        height: actualDimension,
        borderRadius: size === "circle" ? "50%" : "25%",
        background: variation.palette.bg,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      {shapes.map((shape, index) => (
        <div
          key={index}
          className="organic-shape"
          style={{
            position: "absolute",
            width: shape.width * (actualDimension / 120),
            height: shape.height * (actualDimension / 120),
            left: shape.left * (actualDimension / 120),
            top: shape.top * (actualDimension / 120),
            borderRadius: shape.borderRadius,
            background: variation.palette.colors[shape.colorIndex],
            zIndex: shape.zIndex,
            opacity: index === 0 ? 0.9 : 0.75,
            transition: "all 0.3s ease",
            animation: `organicFloat${index} ${variation.animationSpeed + index * 0.5}s ease-in-out infinite`,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes organicFloat0 {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(3deg); }
        }
        @keyframes organicFloat1 {
          0%, 100% { transform: translateX(0px) rotate(0deg); }
          50% { transform: translateX(-3px) rotate(-2deg); }
        }
        @keyframes organicFloat2 {
          0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
          50% { transform: translate(-2px, -4px) rotate(5deg); }
        }
        @keyframes organicFloat3 {
          0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
          50% { transform: translate(2px, -2px) rotate(-4deg); }
        }
        @keyframes organicFloat4 {
          0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
          50% { transform: translate(-1px, -5px) rotate(2deg); }
        }
      `}</style>
    </div>
  );
};

export default OrganicFlowProfile;
