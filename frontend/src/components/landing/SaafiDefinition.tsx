"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function SaafiDefinition() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "center center"]
    });

    const y = useTransform(scrollYProgress, [0, 1], [50, 0]);
    const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

    return (
        <section
            ref={containerRef}
            style={{
                backgroundColor: "#ffffff",
                padding: "120px 20px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden"
            }}
        >
            <motion.div
                style={{
                    y,
                    opacity,
                    position: "relative",
                    backgroundColor: "#f8fafc",
                    padding: "60px 80px",
                    borderRadius: "24px",
                    maxWidth: "800px",
                    width: "100%",
                    boxShadow: "0 20px 40px -15px rgba(0,0,0,0.05)",
                    border: "1px solid #e2e8f0"
                }}
            >
                {/* Decorative Faded Blue Circles */}
                <motion.div
                    animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                    style={{
                        position: "absolute",
                        top: "-50px",
                        left: "-50px",
                        width: "180px",
                        height: "180px",
                        borderRadius: "50%",
                        border: "2px solid #3b82f6",
                        pointerEvents: "none",
                        opacity: 0.3
                    }}
                />
                <motion.div
                    animate={{ rotate: -360, scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
                    style={{
                        position: "absolute",
                        bottom: "-60px",
                        right: "-40px",
                        width: "240px",
                        height: "240px",
                        borderRadius: "50%",
                        border: "1px solid #3b82f6",
                        pointerEvents: "none",
                        opacity: 0.2
                    }}
                />

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15, duration: 0.4 }}
                    style={{ position: "relative", zIndex: 10 }}
                >
                    <h2 className="text-6xl md:text-[6rem] font-black italic text-slate-900 mb-[20px] tracking-[-2px] leading-none">
                        &apos;Saafi&apos;
                    </h2>

                    <p className="text-2xl md:text-[2rem] text-slate-700 leading-[1.4] font-normal m-0">
                        <strong style={{ fontWeight: 700, color: "#0f172a" }}>(verb.)</strong> The process of intelligently automating customer interactions and seamlessly connecting your dealership&apos;s CRM and DMS.
                    </p>
                </motion.div>
            </motion.div>
        </section>
    );
}
