"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

const ROW_1_LOGOS = [
    { src: "/logos/cdk.png", alt: "CDK Global" },
    { src: "/logos/reyrey.png", alt: "Reynolds and Reynolds" },
    { src: "/logos/dealertrack.png", alt: "Dealertrack" },
    { src: "/logos/vinsolutions.png", alt: "VinSolutions" },
    { src: "/logos/dealersocket.png", alt: "DealerSocket" },
];

const ROW_2_LOGOS = [
    { src: "/logos/salesforce.png", alt: "Salesforce" },
    { src: "/logos/tekion.png", alt: "Tekion" },
    { src: "/logos/elead.png", alt: "Elead" },
    { src: "/logos/automate.png", alt: "Auto/Mate" },
    { src: "/logos/dealercenter.png", alt: "DealerCenter" },
];

export default function IntegrationsSection() {
    const containerRef = useRef<HTMLDivElement>(null);

    // Track scroll progress relative to this specific section
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    // Row 1 starts translated slightly left, moves right
    const x1 = useTransform(scrollYProgress, [0, 1], [-100, -800]);

    // Row 2 starts translated slightly right, moves left
    const x2 = useTransform(scrollYProgress, [0, 1], [-800, -100]);

    return (
        <section
            ref={containerRef}
            style={{
                padding: "100px 0",
                backgroundColor: "#ffffff",
                borderTop: "1px solid #e2e8f0",
                borderBottom: "1px solid #e2e8f0",
                overflow: "hidden", // Prevent horizontal scrollbars from the parallax
                position: "relative"
            }}
        >
            <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center", marginBottom: 60, padding: "0 20px" }}>
                <h2 style={{
                    fontSize: "2.5rem",
                    fontWeight: 700,
                    color: "#0f172a",
                    letterSpacing: "-0.5px"
                }}>
                    Powered by your dealership&apos;s favorite <span style={{ color: "#2563eb" }}>CRM & DMS platforms.</span>
                </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 50 }}>
                {/* Row 1 */}
                <motion.div
                    style={{
                        x: x1,
                        display: "flex",
                        gap: 80,
                        paddingLeft: "10%"
                    }}
                >
                    {[...ROW_1_LOGOS, ...ROW_1_LOGOS, ...ROW_1_LOGOS, ...ROW_1_LOGOS].map((logo, i) => ( // Duplicate heavily so we never run out of visual loop on wide screens
                        <div
                            key={`row1-${i}`}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "transform 0.2s ease",
                                cursor: "pointer",
                                flexShrink: 0,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.05)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                            }}
                        >
                            <Image src={logo.src} alt={logo.alt} width={160} height={45} style={{ height: "45px", width: "auto", display: "block", objectFit: "contain" }} />
                        </div>
                    ))}
                </motion.div>

                {/* Row 2 */}
                <motion.div
                    style={{
                        x: x2,
                        display: "flex",
                        gap: 80,
                        paddingLeft: "5%"
                    }}
                >
                    {[...ROW_2_LOGOS, ...ROW_2_LOGOS, ...ROW_2_LOGOS, ...ROW_2_LOGOS].map((logo, i) => (
                        <div
                            key={`row2-${i}`}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "transform 0.2s ease",
                                cursor: "pointer",
                                flexShrink: 0,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.05)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                            }}
                        >
                            <Image src={logo.src} alt={logo.alt} width={160} height={45} style={{ height: "45px", width: "auto", display: "block", objectFit: "contain" }} />
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Edge fading gradients */}
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 150, background: "linear-gradient(to right, #ffffff, transparent)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 150, background: "linear-gradient(to left, #ffffff, transparent)", pointerEvents: "none" }} />
        </section>
    );
}
