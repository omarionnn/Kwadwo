# Logo Marquee Implementation Details

This document records the exact issues faced and the final solution for implementing a smoothly scrolling, infinitely looping brand logo marquee using Next.js, React, and Framer Motion.

## The Goal
To create a high-quality "Dealer Integrations" section featuring two rows of partner logos (like CDK, Reynolds & Reynolds, Salesforce).
- **Row 1** scrolls horizontally from left to right as the user scrolls down the page.
- **Row 2** scrolls from right to left as the user scrolls down the page.
- All logos must be high contrast, properly sized, and loop infinitely without empty gaps.

---

## 🛑 The Core Problem We Faced: "Corrupted SVGs"

Initially, we downloaded `.svg` versions of the branding logos and rendered them dynamically as React components (`<svg />`) or via `<img src="..." />`. However, the logos rendered as tiny, faint, "scrambled alien graphics."

**Why this happened:**
1. **Broken Embedded Code:** Many SaaS marketing SVGs are not simple raw vector paths. They often contain embedded `<text>` tags that heavily rely on external proprietary web fonts (e.g., `<text font-family="ProximaNova">`).
2. **Browser Sandboxing:** When an SVG is embedded using an `<img>` tag or the Next.js `<Image />` component, the browser sandboxes the SVG. **Sandboxed SVGs are forbidden from making new network requests**, meaning they absolutely cannot download their required external fonts.
3. **Clip-Path Failures:** Because the fonts fail to load, complex `clipPath` and `mask` logic inside the SVG completely collapses. The browser only manages to draw the remaining raw vector outlines, resulting in fragmented, scrambled lines instead of a logo.
4. **HTML Redirects posing as Images:** When using generic scraping scripts or `wget`/`curl` to download image assets from large corporate sites, anti-bot protections often intercept the request and return an HTML "Access Denied" or "Page Not Found" file *named* `.png`. The browser cannot render HTML inside an `<img>` tag, causing the image to randomly appear blank or show a broken icon.

---

## ✅ The Final "Bulletproof" Solution

To solve this, we moved away from external SVG parsing entirely and implemented a robust, guaranteed-to-render raster pipeline.

### 1. Sourcing Reliable Assets (PNGs)
The only way to guarantee a logo will render perfectly regardless of browser font restrictions is to convert the raw vector data into a flattened raster image.
- We manually sourced or exported true **transparent `.png` files** for every brand.
- We ensured all files had reasonable, consistent physical dimensions (e.g., ~480x150 pixels) and saved them directly to the `public/logos/` directory.

### 2. Styling for Consistent Sizing and Contrast
Instead of relying on fragile CSS grayscale filters that washed out the logos (e.g., `opacity: 0.6`, `filter: "grayscale(100%)"`):
- We removed all CSS filters to let the natural, high-resolution colors of the PNGs shine through.
- We applied a neutral, robust hover animation: `transform: scale(1.05)`.
- The `<img>` tags themselves were strictly constrained using `height: "45px"`, `width: "auto"`, and `objectFit: "contain"` to ensure every varying logo proportion aligned neatly in the row.

### 3. The Implementation Code (Framer Motion)
We used `framer-motion`'s `useScroll` and `useTransform` hooks to bind the rows' horizontal position to the page's vertical scroll position.

```tsx
"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

// 1. Array of clean, local PNG assets
const ROW_1_LOGOS = [
    { src: "/logos/cdk.png", alt: "CDK Global" },
    { src: "/logos/reyrey.png", alt: "Reynolds and Reynolds" },
    // ...
];

export default function IntegrationsSection() {
    const containerRef = useRef<HTMLDivElement>(null);

    // 2. Track scroll progress
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    // 3. Map scroll [0, 1] to Horizontal Translation [-100px, -800px]
    const x1 = useTransform(scrollYProgress, [0, 1], [-100, -800]);

    return (
        <section ref={containerRef} style={{ overflow: "hidden" }}>
            {/* 4. Apply translation to the row wrapper */}
            <motion.div style={{ x: x1, display: "flex", gap: 80 }}>
                {/* 
                  CRITICAL: Duplicate the array multiple times! 
                  This ensures that on wide 4K monitors, the browser never runs out of logos to render before the scroll sequence completes.
                */}
                {[...ROW_1_LOGOS, ...ROW_1_LOGOS, ...ROW_1_LOGOS, ...ROW_1_LOGOS].map((logo, i) => (
                    <div
                        key={`row1-${i}`}
                        style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "transform 0.2s ease", cursor: "pointer", flexShrink: 0,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                        <img 
                            src={logo.src} 
                            alt={logo.alt} 
                            style={{ height: "45px", width: "auto", display: "block", objectFit: "contain" }} 
                        />
                    </div>
                ))}
            </motion.div>
        </section>
    );
}
```

### 4. Fixing the "Empty Space" Parallax Bug
During testing, Row 2 (which had fewer logos than Row 1) would occasionally show an empty blank space at the end of the screen when scrolled to the extreme left.

**The Fix:** 
The parallax animation physically moves the rigid container left and right. If the container is not wide enough to cover the entire width of the screen *plus* the translation distance, empty space is revealed.
We fixed this by **heavily duplicating the logo arrays** in the `.map()` function:
```tsx
{[...ROW_2_LOGOS, ...ROW_2_LOGOS, ...ROW_2_LOGOS, ...ROW_2_LOGOS].map(...)}
```
By concatenating the 5-item array 4 times, we artificially generated a 20-item row. This creates a massive "invisible tail" of rendering logos that remain off-screen, guaranteeing the visual sequence stays completely full from edge to edge on any modern monitor.
