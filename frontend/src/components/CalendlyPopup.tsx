"use client";

import { useEffect, useState } from "react";
import { PopupModal } from "react-calendly";

interface CalendlyPopupProps {
    url: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function CalendlyPopup({ url, isOpen, onClose }: CalendlyPopupProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !isOpen) return null;

    return (
        <PopupModal
            url={url}
            onModalClose={onClose}
            open={isOpen}
            rootElement={document.getElementById("root") || document.body}
        />
    );
}
