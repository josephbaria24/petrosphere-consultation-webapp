"use client";

import React from "react";
import RotatingText from "../../@/components/RotatingText";

export function HeroRotatingText() {
    return (
        <div className="flex flex-col items-center md:items-start gap-4">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.1] text-white">
                <span className="italic font-serif">SafetyVitals</span> <span className="text-[#4ade80]">ensures</span>
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-3xl sm:text-5xl md:text-5xl font-extrabold leading-[1.1]">
                <span className="text-white text-3xl sm:text-5xl md:text-5xl">Safety in</span>
                <RotatingText
                    texts={["Workplace", "Climate", "Vitals"]}
                    mainClassName="px-4 py-2 bg-[#FF7A40] text-white overflow-hidden justify-center rounded-2xl shadow-xl text-3xl sm:text-5xl md:text-5xl border-0"
                    staggerFrom={"last"}
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "-120%" }}
                    staggerDuration={0.025}
                    splitLevelClassName="overflow-hidden pb-1 sm:pb-2 md:pb-2"
                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                    rotationInterval={2500}
                />
            </div>
        </div>
    );
}
