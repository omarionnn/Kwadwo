import Sidebar from "@/components/sidebar/Sidebar";
import MobileBottomNav from "@/components/sidebar/MobileBottomNav";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ display: "flex", height: "100vh", background: "var(--bg-base)", overflow: "hidden" }}>
            {/* Desktop Sidebar */}
            <div className="hidden md:flex h-full">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {children}
            </div>

            {/* Mobile Bottom Nav */}
            <div className="md:hidden">
                <MobileBottomNav />
            </div>
        </div>
    );
}
