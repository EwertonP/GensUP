"use client";

import { motion } from "motion/react";
import { CountBadge } from "@/components/ui/CountBadge";

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  /** Escopa o layoutId quando houver mais de um <Tabs> na mesma página. */
  layoutId?: string;
}

const SPRING = { type: "spring" as const, stiffness: 500, damping: 35 };

// Tabs com indicador de linha animado (design/DESIGN.md §10.1) -- ao trocar
// de aba, a linha morfa pra nova posição via layoutId, em vez de sumir e
// reaparecer.
export function Tabs({ tabs, value, onChange, layoutId = "tabs-underline" }: TabsProps) {
  return (
    <div className="flex items-center gap-6 border-b border-neutral-200">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`relative flex items-center gap-2 pb-3 text-sm font-medium transition-colors active:scale-[0.98] ${
              active ? "text-primary-700" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && <CountBadge count={tab.count} />}
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={SPRING}
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary-600"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
