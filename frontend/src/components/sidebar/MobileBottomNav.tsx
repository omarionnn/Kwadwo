"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bot, LayoutDashboard, Phone, Users, BarChart3,
    Activity, Menu, X, PlusCircle
} from "lucide-react";

const navItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
    { icon: Bot, label: "Agent Builder", href: "/dashboard/agents" },
    { icon: Phone, label: "Call Logs", href: "/dashboard/calls" },
    { icon: Users, label: "Campaigns", href: "/dashboard/campaigns" },
    { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" },
    { icon: Activity, label: "Status", href: "/dashboard/status" },
];

export default function MobileBottomNav() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="mb-4 bg-[#0e1629] border border-[#1e3154] p-3 rounded-2xl shadow-2xl flex flex-col gap-1 w-64"
                    >
                        <div className="flex items-center gap-2 mb-2 px-2 py-1">
                            <Bot size={18} className="text-[#6366f1]" />
                            <span className="text-white font-semibold text-sm">Saafi AI Menu</span>
                        </div>
                        {navItems.map(({ icon: Icon, label, href }) => {
                            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                            return (
                                <Link key={href} href={href} onClick={() => setIsOpen(false)} style={{ textDecoration: "none" }}>
                                    <div
                                        className={active ? "nav-active" : ""}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 12,
                                            padding: "12px 16px",
                                            borderRadius: active ? 0 : 12,
                                            marginLeft: active ? -8 : 0,
                                            paddingLeft: active ? 24 : 16,
                                            color: active ? "var(--accent-hover)" : "var(--text-secondary)",
                                            fontSize: 14,
                                            fontWeight: active ? 600 : 500,
                                            transition: "all 0.15s",
                                        }}
                                    >
                                        <Icon size={18} />
                                        {label}
                                    </div>
                                </Link>
                            );
                        })}
                        <div className="mt-2 pt-3 border-t border-[#1e3154]">
                            <button className="btn-primary w-full justify-center py-3 rounded-xl flex items-center gap-2">
                                <PlusCircle size={16} /> New Agent
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white flex items-center justify-center rounded-full shadow-lg border border-white/10"
                style={{ width: 60, height: 60, boxShadow: "0 8px 32px rgba(99, 102, 241, 0.5)" }}
            >
                <motion.div
                    animate={{ rotate: isOpen ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {isOpen ? <X size={26} /> : <Menu size={26} />}
                </motion.div>
            </motion.button>
        </div>
    );
}
