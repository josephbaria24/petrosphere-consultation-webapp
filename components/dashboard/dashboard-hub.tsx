"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  DashboardSelector,
  type DashboardViewId,
} from "./dashboard-selector";
import SafetyVitalsDashboard from "../dashboard";
import FieldOperationsDashboard from "./field-operations-dashboard";

const VIEW_ORDER: DashboardViewId[] = ["safety-vitals", "investigations"];

export default function DashboardHub() {
  const [activeView, setActiveView] =
    useState<DashboardViewId>("safety-vitals");
  const [direction, setDirection] = useState(0);

  const handleSelect = (id: DashboardViewId) => {
    if (id === activeView) return;
    const currentIndex = VIEW_ORDER.indexOf(activeView);
    const nextIndex = VIEW_ORDER.indexOf(id);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveView(id);
  };

  const slideVariants = {
    enter: (d: number) => ({
      x: d > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (d: number) => ({
      x: d > 0 ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent overflow-x-hidden">
      <div className="flex-1 max-w-[1600px] mx-auto w-full p-1 md:p-8 pt-6">
        <DashboardSelector activeId={activeView} onSelect={handleSelect} />

        <div className="relative min-h-[480px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeView}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 320, damping: 32 },
                opacity: { duration: 0.2 },
              }}
              className="w-full"
            >
              {activeView === "safety-vitals" ? (
                <SafetyVitalsDashboard embedded />
              ) : (
                <FieldOperationsDashboard />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
