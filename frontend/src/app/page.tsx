"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Bot, CalendarCheck, ArrowRight, Zap, BarChart3, Clock, CheckCircle2, TrendingUp, Mic, MicOff, Loader2 } from "lucide-react";
import Vapi from "@vapi-ai/web";
import IntegrationsSection from "@/components/landing/IntegrationsSection";

// Mock conversation data for the interactive chat
const conversations = {
    receptionist: [
        { role: "user", text: "Are you guys open right now?" },
        { role: "ai", text: "Yes, we are open today from 7:00 AM to 6:00 PM. Would you like directions to the dealership?" },
        { role: "user", text: "No, but are there any coffee shops nearby while I wait for my car?" },
        { role: "ai", text: "Certainly! Beanline Coffee and Hilltop Deli are both within a 5-minute walk. I can text you directions if you'd like." }
    ],
    scheduler: [
        { role: "user", text: "I need to schedule an oil change for my Camry." },
        { role: "ai", text: "Of course. Let me check our availability. Our next open slot is tomorrow at 1:00 PM. Does that work for you?" },
        { role: "user", text: "Yes, that's perfect." },
        { role: "ai", text: "Great! I've booked your oil change for tomorrow at 1:00 PM. I just sent a confirmation text to your number. See you then!" }
    ],
    sales: [
        { role: "user", text: "Do you have any RAV4 Hybrids in stock?" },
        { role: "ai", text: "Let me check our real-time inventory... Yes, we currently have three RAV4 Hybrids available on the lot. Would you like to schedule a test drive?" },
        { role: "user", text: "Yeah, can I come in around 3:15 PM today?" },
        { role: "ai", text: "I've scheduled your test drive for today at 3:15 PM. One of our specialists will have the RAV4 pulled up and waiting for you." }
    ]
};

const TypingMessage = ({ text, isAi }: { text: string; isAi: boolean }) => {
    const [displayed, setDisplayed] = useState("");

    useEffect(() => {
        if (!isAi) {
            setDisplayed(text);
            return;
        }
        setDisplayed("");
        let i = 0;
        const interval = setInterval(() => {
            setDisplayed(text.slice(0, i));
            i++;
            if (i > text.length) clearInterval(interval);
        }, 15);
        return () => clearInterval(interval);
    }, [text, isAi]);

    return (
        <>
            {displayed}
            {isAi && displayed.length < text.length && <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}>|</motion.span>}
        </>
    );
};

export default function LandingPage() {
    const [activeTab, setActiveTab] = useState<"receptionist" | "scheduler" | "sales">("scheduler");
    const [visibleMessages, setVisibleMessages] = useState<number>(0);
    const [callStatus, setCallStatus] = useState<"inactive" | "loading" | "active">("inactive");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vapiRef = useRef<any>(null);

    // Initialize Vapi SDK
    useEffect(() => {
        // Only initialize if the key exists to prevent silent crashes
        if (!process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY) return;

        const vapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);
        vapiRef.current = vapiInstance;

        vapiInstance.on("call-start", () => setCallStatus("active"));
        vapiInstance.on("call-end", () => setCallStatus("inactive"));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vapiInstance.on("error", (e: any) => {
            console.error("Vapi Error Details:", e?.error?.message || e?.message || JSON.stringify(e));
            setCallStatus("inactive");
        });

        return () => {
            vapiInstance.stop();
            vapiInstance.removeAllListeners();
        };
    }, []);

    const toggleCall = async () => {
        if (!process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || !process.env.NEXT_PUBLIC_VAPI_SALES_ASSISTANT_ID) {
            alert("Vapi keys are missing! Please restart your 'npm run dev' terminal so Next.js can load the new .env.local file.");
            return;
        }

        if (callStatus === "inactive") {
            setCallStatus("loading");
            try {
                // Explicitly request microphone permissions BEFORE starting Vapi
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                // We don't need to keep the stream, just needed the browser to grant permission
                // Vapi will grab its own stream now that permission is granted
                stream.getTracks().forEach(track => track.stop());

                vapiRef.current?.start(process.env.NEXT_PUBLIC_VAPI_SALES_ASSISTANT_ID);
            } catch (err) {
                console.error("Microphone permission denied:", err);
                alert("Microphone access is required to talk to Saafi. Please allow microphone permissions in your browser settings.");
                setCallStatus("inactive");
            }
        } else {
            vapiRef.current?.stop();
        }
    };

    // Play conversation sequence when tab changes
    useEffect(() => {
        setVisibleMessages(0);
        const msgs = conversations[activeTab];
        let current = 0;
        let timeout: NodeJS.Timeout;

        const showNext = () => {
            if (current < msgs.length) {
                setVisibleMessages(current + 1);
                const delay = msgs[current].role === "user" ? 800 : msgs[current].text.length * 15 + 600;
                current++;
                timeout = setTimeout(showNext, delay);
            }
        };
        timeout = setTimeout(showNext, 300);
        return () => clearTimeout(timeout);
    }, [activeTab]);

    // Orb Mouse Tracking
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX - window.innerWidth / 2);
            mouseY.set(e.clientY - window.innerHeight / 2);
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX, mouseY]);

    const orbX = useSpring(useTransform(mouseX, [-1000, 1000], [-25, 25]), { damping: 20, stiffness: 100 });
    const orbY = useSpring(useTransform(mouseY, [-1000, 1000], [-25, 25]), { damping: 20, stiffness: 100 });
    const orbRotateX = useSpring(useTransform(mouseY, [-1000, 1000], [10, -10]), { damping: 20, stiffness: 100 });
    const orbRotateY = useSpring(useTransform(mouseX, [-1000, 1000], [-10, 10]), { damping: 20, stiffness: 100 });

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", fontFamily: "Inter, sans-serif", overflowX: "hidden" }}>
            {/* Navbar */}
            <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 40px", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 50 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 18, color: "#1e293b" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #2563eb, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Bot size={20} color="white" />
                    </div>
                    Saafi AI
                </div>
                <div style={{ display: "flex", gap: 24, fontSize: 14, fontWeight: 500, color: "#475569" }}>
                    <a href="#features" style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = "#2563eb"} onMouseOut={(e) => e.currentTarget.style.color = "#475569"}>Features</a>
                    <a href="#demo" style={{ textDecoration: "none", color: "inherit", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = "#2563eb"} onMouseOut={(e) => e.currentTarget.style.color = "#475569"}>Interactive Demo</a>
                </div>
            </nav>

            {/* Hero Section */}
            <motion.header initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ padding: "80px 10% 40px", maxWidth: 1400, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 60, marginBottom: 80 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ padding: "6px 14px", backgroundColor: "#e0f2fe", color: "#0369a1", borderRadius: 999, fontSize: 12, fontWeight: 600, marginBottom: 24, display: "flex", alignItems: "center", gap: 6, width: "fit-content" }}>
                            <Zap size={14} /> The Fastest Growing Voice AI for Dealerships
                        </div>
                        <h1 style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.05, marginBottom: 24, color: "#0f172a", letterSpacing: "-1.5px" }}>
                            Keep your digital doors open <span style={{ color: "#2563eb" }}>24/7.</span>
                        </h1>
                        <p style={{ fontSize: 18, lineHeight: 1.6, color: "#475569", marginBottom: 40, maxWidth: 500 }}>
                            Saafi is always on, answering calls, booking appointments, and following up so no customer slips through the cracks.
                        </p>
                        <div style={{ display: "flex", gap: 16 }}>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ padding: "16px 32px", backgroundColor: "#2563eb", color: "white", borderRadius: 8, fontWeight: 600, fontSize: 16, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.4)" }}>
                                Book A Demo <ArrowRight size={18} />
                            </motion.button>
                        </div>
                    </div>

                    {/* Interactive Mouse Tracking Glowing Orb */}
                    <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", position: "relative", perspective: 1000 }}>
                        <div style={{ position: "absolute", width: 450, height: 450, background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0) 70%)", borderRadius: "50%", animation: "pulse 4s infinite alternate" }} />

                        {/* Speech Tooltip */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1, duration: 0.5 }}
                            style={{ position: "absolute", left: -80, top: "20%", backgroundColor: "white", padding: "10px 16px", borderRadius: 12, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#1e293b", zIndex: 10 }}
                        >
                            {callStatus === "inactive" && <><Mic size={16} color="#2563eb" /> Click to talk to Saafi</>}
                            {callStatus === "loading" && <><Loader2 size={16} color="#2563eb" className="animate-spin" /> Connecting...</>}
                            {callStatus === "active" && <><MicOff size={16} color="#ef4444" /> Click to end call</>}
                        </motion.div>

                        <motion.div
                            onClick={toggleCall}
                            style={{ x: orbX, y: orbY, rotateX: orbRotateX, rotateY: orbRotateY, width: 280, height: 280, borderRadius: "50%", background: callStatus === "active" ? "linear-gradient(135deg, #4f46e5, #ec4899)" : "linear-gradient(135deg, #1e3a8a, #3b82f6)", boxShadow: callStatus === "active" ? "0 20px 60px -10px rgba(236, 72, 153, 0.6), inset 0 0 60px rgba(255,255,255,0.4)" : "0 20px 40px -10px rgba(37, 99, 235, 0.4), inset 0 0 40px rgba(255,255,255,0.2)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", cursor: "pointer", position: "relative", zIndex: 1, transformStyle: "preserve-3d" }}
                            whileHover={{ scale: 1.05, boxShadow: callStatus === "active" ? "0 30px 80px -15px rgba(236, 72, 153, 0.8), inset 0 0 60px rgba(255,255,255,0.5)" : "0 30px 60px -15px rgba(37, 99, 235, 0.6), inset 0 0 40px rgba(255,255,255,0.3)" }}
                        >
                            {callStatus === "loading" ? (
                                <Loader2 size={72} color="white" style={{ marginBottom: 16, transform: "translateZ(30px)" }} className="animate-spin" />
                            ) : (
                                <Bot size={72} color="white" style={{ marginBottom: 16, transform: "translateZ(30px)" }} />
                            )}
                            <span style={{ color: "white", fontWeight: 600, fontSize: 15, letterSpacing: "0.5px", transform: "translateZ(20px)" }}>Saafi</span>
                            <div style={{ display: "flex", gap: 4, marginTop: 16, transform: "translateZ(10px)" }}>
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ height: callStatus === "active" ? [12, 18 + (i % 3) * 6, 12] : [12, 14 + (i % 2) * 4, 12] }}
                                        transition={{ repeat: Infinity, duration: callStatus === "active" ? 1.2 : 2, ease: "easeInOut", delay: i * 0.15 }}
                                        style={{ width: 4, backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 2 }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* ROI Metrics Bar (Framer Motion Stagger) */}
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, backgroundColor: "white", padding: 40, borderRadius: 20, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)" }}>
                    {[
                        { value: "$75K+", label: "Service revenue captured", icon: BarChart3, color: "#10b981" },
                        { value: "14X", label: "Average ROI", icon: TrendingUp, color: "#3b82f6" },
                        { value: "48", label: "Hours saved per week", icon: Clock, color: "#8b5cf6" },
                        { value: "340+", label: "Appointments booked", icon: CalendarCheck, color: "#f59e0b" },
                    ].map((metric, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 20px", borderRight: i < 3 ? "1px solid #f1f5f9" : "none" }}>
                            <div style={{ fontSize: 36, fontWeight: 800, color: "#0f172a", letterSpacing: "-1px" }}>{metric.value}</div>
                            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500, lineHeight: 1.4 }}>{metric.label}</div>
                        </div>
                    ))}
                </motion.div>
            </motion.header>

            {/* Integrations Marquee Section */}
            <IntegrationsSection />

            {/* 3 Pillars & Interactive Demo Section */}
            <section id="demo" style={{ backgroundColor: "#ffffff", padding: "100px 10%", borderTop: "1px solid #e2e8f0" }}>
                <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 60 }}>
                    <h2 style={{ fontSize: 40, fontWeight: 800, color: "#0f172a", marginBottom: 16, letterSpacing: "-1px" }}>Saafi transforms dealership communication.</h2>
                    <p style={{ fontSize: 18, color: "#64748b", maxWidth: 600, margin: "0 auto" }}>Click below to see exactly how Saafi handles your most important calls.</p>
                </motion.div>

                <div style={{ display: "flex", gap: 60, maxWidth: 1200, margin: "0 auto", alignItems: "flex-start" }}>

                    {/* Left Side: The 3 Pillars */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                        {[
                            { id: "receptionist", title: "Live Receptionist", desc: "Never miss a call. Answers everyday inquiries like store hours, directions, and simple questions." },
                            { id: "scheduler", title: "AI Scheduler", desc: "Book all appointments. Real-time scheduling based on availability and customer preferences." },
                            { id: "sales", title: "Sales AI", desc: "Capture every lead. Shares vehicle availability and books test drives instantly." }
                        ].map((pillar) => (
                            <motion.div
                                key={pillar.id}
                                onClick={() => setActiveTab(pillar.id as "receptionist" | "scheduler" | "sales")}
                                whileHover={{ y: -5, boxShadow: "0 15px 30px -10px rgba(0,0,0,0.1)" }}
                                style={{ padding: 32, borderRadius: 16, border: activeTab === pillar.id ? "2px solid #2563eb" : "1px solid #e2e8f0", backgroundColor: activeTab === pillar.id ? "#eff6ff" : "#ffffff", cursor: "pointer", transition: "border 0.2s ease, background 0.2s ease" }}
                            >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                    <h3 style={{ fontSize: 22, fontWeight: 700, color: activeTab === pillar.id ? "#1d4ed8" : "#0f172a" }}>{pillar.title}</h3>
                                    {activeTab === pillar.id && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircle2 size={24} color="#2563eb" /></motion.div>}
                                </div>
                                <p style={{ fontSize: 15, color: activeTab === pillar.id ? "#1e3a8a" : "#64748b", lineHeight: 1.6 }}>{pillar.desc}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Right Side: Interactive Chat Mockup with Typing Emulator */}
                    <motion.div initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} style={{ flex: 1, backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 24, padding: 32, boxShadow: "0 20px 40px -15px rgba(0,0,0,0.05)", position: "relative", overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32, borderBottom: "1px solid #e2e8f0", paddingBottom: 20 }}>
                            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #1e3a8a, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Bot size={24} color="white" />
                            </div>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Listen to Saafi</div>
                                <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                                    <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ width: 8, height: 8, backgroundColor: "#2563eb", borderRadius: "50%", display: "inline-block" }} />
                                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module active
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 20, minHeight: 320 }}>
                            {conversations[activeTab].slice(0, visibleMessages).map((msg, idx) => (
                                <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                                    <div style={{
                                        maxWidth: "80%", padding: "14px 20px", borderRadius: 16, fontSize: 15, lineHeight: 1.5,
                                        backgroundColor: msg.role === "user" ? "#0f172a" : "#ffffff", color: msg.role === "user" ? "#ffffff" : "#334155",
                                        border: msg.role === "ai" ? "1px solid #e2e8f0" : "none", borderBottomRightRadius: msg.role === "user" ? 4 : 16, borderBottomLeftRadius: msg.role === "ai" ? 4 : 16,
                                        boxShadow: msg.role === "ai" ? "0 4px 6px -1px rgba(0,0,0,0.05)" : "none"
                                    }}>
                                        <TypingMessage text={msg.text} isAi={msg.role === "ai"} />
                                    </div>
                                </motion.div>
                            ))}
                            {/* Show typing indicator if next message isn't ready but hasn't reached end */}
                            {visibleMessages < conversations[activeTab].length && conversations[activeTab][visibleMessages].role === "ai" && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", justifyContent: "flex-start" }}>
                                    <div style={{ padding: "14px 20px", borderRadius: 16, backgroundColor: "#ffffff", border: "1px solid #e2e8f0", display: "flex", gap: 4, alignItems: "center" }}>
                                        <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} style={{ width: 6, height: 6, backgroundColor: "#cbd5e1", borderRadius: "50%" }} />
                                        <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} style={{ width: 6, height: 6, backgroundColor: "#cbd5e1", borderRadius: "50%" }} />
                                        <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} style={{ width: 6, height: 6, backgroundColor: "#cbd5e1", borderRadius: "50%" }} />
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>

                </div>
            </section>



            {/* Footer & Admin Login */}
            <footer style={{ backgroundColor: "#ffffff", borderTop: "1px solid #e2e8f0", padding: "60px 10%", display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 16, color: "#64748b" }}>
                    <Bot size={18} color="#64748b" /> Saafi AI
                </div>

                <div style={{ color: "#94a3b8", fontSize: 14 }}>
                    © 2026 Saafi AI. All rights reserved.
                </div>

                {/* Admin Login Button */}
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #f1f5f9", width: "100%", textAlign: "center" }}>
                    <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>Staff & Administration</p>

                    <SignedOut>
                        <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ padding: "8px 16px", backgroundColor: "transparent", color: "#475569", borderRadius: 6, fontWeight: 500, fontSize: 13, border: "1px solid #cbd5e1", cursor: "pointer", transition: "background 0.2s" }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9" }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}>Admin Login</motion.button>
                        </SignInButton>
                    </SignedOut>

                    <SignedIn>
                        <Link href="/dashboard" style={{ textDecoration: "none" }}>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ padding: "8px 16px", backgroundColor: "#0f172a", color: "white", borderRadius: 6, fontWeight: 500, fontSize: 13, border: "none", cursor: "pointer" }}>Go to Dashboard</motion.button>
                        </Link>
                    </SignedIn>
                </div>
            </footer>

            {/* Global Style for Keyframes */}
            <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          100% { transform: scale(1.05); opacity: 0.8; }
        }
      `}</style>
        </div>
    );
}
