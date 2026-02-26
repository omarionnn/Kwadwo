"use client";

import { PopupModal } from "react-calendly";

interface CalendlyPopupProps {
    url: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function CalendlyPopup({ url, isOpen, onClose }: CalendlyPopupProps) {
    if (!isOpen) return null;

    return (
        <PopupModal
            url={url}
            onModalClose={onClose}
            open={isOpen}
            rootElement={document.getElementById("root") || document.body}
        />
    );
}
