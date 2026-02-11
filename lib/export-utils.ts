/**
 * File: lib/export-utils.ts
 * Description: Shared utilities for data export and PDF generation.
 */

// List of CSS variables used in the theme that might contain OKLCH colors
const THEME_VARIABLES = [
    "--background",
    "--foreground",
    "--card",
    "--card-foreground",
    "--popover",
    "--popover-foreground",
    "--primary",
    "--primary-foreground",
    "--secondary",
    "--secondary-foreground",
    "--muted",
    "--muted-foreground",
    "--accent",
    "--accent-foreground",
    "--destructive",
    "--destructive-foreground",
    "--border",
    "--input",
    "--ring",
    "--radius",
    "--chart-1",
    "--chart-2",
    "--chart-3",
    "--chart-4",
    "--chart-5",
    "--sidebar-background",
    "--sidebar-foreground",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--sidebar-accent",
    "--sidebar-accent-foreground",
    "--sidebar-border",
    "--sidebar-ring",
];


/**
 * Helpers to convert any valid CSS color string to RGB/RGBA format using the browser's native parser.
 * Defined at module level to be available to all functions.
 */

/**
 * Helpers to convert any valid CSS color string to RGB/RGBA format using the browser's native parser.
 * Defined at module level to be available to all functions.
 */
function convertToRgb(colorString: string): string {
    // Basic check
    if (!colorString || (!colorString.includes("oklch") && !colorString.includes("oklab") && !colorString.includes("Display P3"))) return colorString;

    // Helper to convert a single color token
    const tokenToRgb = (token: string) => {
        try {
            const canvas = document.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return token;

            ctx.fillStyle = token;
            ctx.fillRect(0, 0, 1, 1);
            const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
            const alpha = a / 255;
            if (alpha < 1) return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
            return `rgb(${r}, ${g}, ${b})`;
        } catch (e) {
            return token;
        }
    };

    // If the string contains multiple colors or is complex (like gradient/filter),
    // use regex to replace specific oklch/oklab instances.
    // For resolved computed styles, oklch() usually contains numbers, not nested parens.
    if (colorString.includes('(') && (colorString.includes('gradient') || colorString.includes('shadow') || colorString.includes('filter') || colorString.length > 50)) {
        return colorString.replace(/(oklch|oklab|color)\([^)]+\)/g, (match) => {
            // 'color(' is for Display P3
            return tokenToRgb(match);
        });
    }

    // Otherwise, try converting the whole string (simple color)
    return tokenToRgb(colorString);
}


/**
 * Sanitizes the cloned DOM for efficient and error-free PDF generation.
 * Specifically converts unsupported OKLCH colors (Tailwind v4) to RGB.
 * 
 * @param clonedDoc The document clone created by html2canvas
 */
export function sanitizeDomForPdf(clonedDoc: Document) {
    // 1. Override global CSS variables in the clone with computed RGB values from the original document
    // This ensures pseudo-elements and inherited styles use safe colors.
    try {
        const rootStyle = window.getComputedStyle(document.documentElement);
        const overrides: string[] = [];

        THEME_VARIABLES.forEach((variable) => {
            const val = rootStyle.getPropertyValue(variable).trim();
            if (val) {
                const safeColor = convertToRgb(val);
                overrides.push(`${variable}: ${safeColor} !important;`);
            }
        });

        if (overrides.length > 0) {
            const style = clonedDoc.createElement('style');
            style.innerHTML = `:root, .dark, body { ${overrides.join(' ')} }`;
            clonedDoc.head.appendChild(style);
        }
    } catch (e) {
        console.error("Error sanitizing CSS variables:", e);
    }

    // 2. DOM-wide Sanitization of Stylesheets via CSSOM
    // We iterate through style sheets and rules, modifying the rule object directly if possible.
    try {
        // Convert to Array to avoid issues with live collections
        Array.from(clonedDoc.styleSheets).forEach((sheet) => {
            try {
                // Only process standard stylesheets or injected styles
                const rules = sheet.cssRules;
                if (!rules) return;

                // Iterate backwards so we can delete/insert if needed, though property update is safer
                for (let i = 0; i < rules.length; i++) {
                    const rule = rules[i] as CSSStyleRule;
                    if (rule.style) {
                        // It's a style rule. Iterate its properties.
                        if (rule.style.cssText.includes("oklch") || rule.style.cssText.includes("oklab")) {
                            // Iterate all properties of this rule
                            for (let j = 0; j < rule.style.length; j++) {
                                const prop = rule.style[j];
                                const val = rule.style.getPropertyValue(prop);
                                if (val && (val.includes("oklch") || val.includes("oklab"))) {
                                    rule.style.setProperty(prop, convertToRgb(val), rule.style.getPropertyPriority(prop));
                                }
                            }
                        }
                    }
                    // Handle Media Rules (recurse one level)
                    if (rule instanceof CSSMediaRule) {
                        try {
                            const mediaRules = rule.cssRules;
                            for (let m = 0; m < mediaRules.length; m++) {
                                const mRule = mediaRules[m] as CSSStyleRule;
                                if (mRule.style && (mRule.style.cssText.includes("oklch") || mRule.style.cssText.includes("oklab"))) {
                                    for (let j = 0; j < mRule.style.length; j++) {
                                        const prop = mRule.style[j];
                                        const val = mRule.style.getPropertyValue(prop);
                                        if (val && (val.includes("oklch") || val.includes("oklab"))) {
                                            mRule.style.setProperty(prop, convertToRgb(val), mRule.style.getPropertyPriority(prop));
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            // Ignore errors in media rules
                        }
                    }
                }
            } catch (e) {
                // Access control error or blank sheet, try text content fallback for <style> tags
                if (sheet.ownerNode instanceof HTMLElement && sheet.ownerNode.tagName === 'STYLE') {
                    const styleTag = sheet.ownerNode as HTMLStyleElement;
                    if (styleTag.textContent && (styleTag.textContent.includes('oklch') || styleTag.textContent.includes('oklab'))) {
                        styleTag.textContent = styleTag.textContent.replace(/(oklch|oklab)\([^)]+\)/g, (match) => {
                            return convertToRgb(match);
                        });
                    }
                }
            }
        });
    } catch (e) {
        console.error("Error sanitizing stylesheets:", e);
    }

    // 3. Fallback: Iterate specific elements to hard-set computed styles
    // This catches inline usages or library-specific styles that don't use variables
    const convertColor = (color: string) => {
        if (!color || (!color.includes("oklch") && !color.includes("oklab") && !color.includes("Display P3"))) return color;
        return convertToRgb(color);
    };

    try {
        const elements = clonedDoc.querySelectorAll("*");
        elements.forEach((el: any) => {
            // Use duck typing or tag name check to avoid cross-origin instance check failure
            // (el instanceof SVGElement might fail if el comes from iframe)
            const tagName = el.tagName.toLowerCase();
            // Expanded SVG check
            const isSvgElement = ["svg", "path", "circle", "rect", "line", "polyline", "polygon", "g", "defs", "marker", "mask", "stop", "use", "symbol", "clippath", "text", "tspan"].includes(tagName);
            const isHtmlElement = !isSvgElement;

            if (isHtmlElement || isSvgElement) {
                // Safe access to computed style?
                // In iframe, we need defaultView.
                const win = el.ownerDocument?.defaultView || window;
                const styles = win.getComputedStyle(el);

                // Iterate ALL properties that might have color
                for (let i = 0; i < styles.length; i++) {
                    const propName = styles[i];
                    const val = styles.getPropertyValue(propName);
                    if (val && (val.includes("oklch") || val.includes("oklab"))) {
                        el.style.setProperty(propName, convertToRgb(val), "important");
                    }
                }

                // Explicitly check for SVG attributes
                if (isSvgElement) {
                    if (el.hasAttribute("fill")) {
                        const attr = el.getAttribute("fill");
                        if (attr && (attr.includes("oklch") || attr.includes("oklab"))) {
                            el.setAttribute("fill", convertColor(attr));
                            el.style.fill = convertColor(attr);
                        }
                    }
                    if (el.hasAttribute("stroke")) {
                        const attr = el.getAttribute("stroke");
                        if (attr && (attr.includes("oklch") || attr.includes("oklab"))) {
                            if (attr !== 'currentColor') {
                                el.setAttribute("stroke", convertColor(attr));
                                el.style.stroke = convertColor(attr);
                            }
                        }
                    }
                    if (el.hasAttribute("stop-color")) {
                        const attr = el.getAttribute("stop-color");
                        if (attr && (attr.includes("oklch") || attr.includes("oklab"))) {
                            el.setAttribute("stop-color", convertColor(attr));
                            el.style.stopColor = convertColor(attr);
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error("Error sanitizing elements:", e);
    }
}
