"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import "./auto-scroll.css";

const cards = [
  {
    id: 1,
    title: "Agent cold-call-test",
    description: "High drop-offs. Review recommended.",
  },
  {
    id: 2,
    title: "L2 Qualification Leads",
    description: "Campaign started. Running.",
  },
  {
    id: 3,
    title: "Outbound - SMB",
    description: "Call volume spike. Peak hours.",
  },
  {
    id: 4,
    title: "Demo Requests",
    description: "12 pending. Action required.",
  },
  {
    id: 5,
    title: "Voicebot - Feedback",
    description: "Positive trend. On track.",
  },
];

export default function AutoScrollCarousel() {
  // Duplicate cards for seamless infinite scroll
  const items = [...cards, ...cards];

  return (
    <div className="w-full max-w-3xl overflow-hidden">
      <div className="auto-scroll-container">
        {/* Top and bottom fade overlays */}
        <div className="auto-scroll-fade top" />
        <div className="auto-scroll-fade bottom" />
        <div className="auto-scroll-content flex flex-col">
          {items.map((card, idx) => (
            <div key={idx} className="w-full px-4 mb-3">
              <Card
                className="w-full rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 h-28 flex flex-col justify-center !bg-white dark:!bg-gray-800"
              >
                <CardHeader className="pb-1">
                  <CardTitle className="text-2xl font-extrabold !text-black dark:!text-white truncate">
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs font-extralight !text-black dark:!text-white truncate">
                    {card.description}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
