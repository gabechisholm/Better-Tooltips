/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import { VisualFormattingSettingsModel } from "./settings";
import { markdownToHtml, stripMarkdown } from "./markdown";

export class Visual implements IVisual {
    private target: HTMLElement;
    private host: IVisualHost;
    
    private triggerContainer: HTMLElement;
    private tooltipPanel: HTMLElement;
    private closeButton: HTMLElement;
    private tooltipContent: HTMLElement;
    
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    
    private isTooltipOpen: boolean = false;
    private closeTimeout: number | null = null;
    private globalClickHandler: (e: MouseEvent) => void;
    private globalKeyDownHandler: (e: KeyboardEvent) => void;

    private markdownText: string = "";
    private useNativeTooltip: boolean = false;

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
        this.host = options.host;
        this.target = options.element;

        // Apply visual container namespace
        this.target.classList.add("better-tooltips-container");

        // Initialize DOM Elements
        this.triggerContainer = document.createElement("div");
        this.triggerContainer.className = "better-tooltip-trigger";
        this.triggerContainer.setAttribute("tabindex", "0");
        this.triggerContainer.setAttribute("role", "button");
        this.target.appendChild(this.triggerContainer);

        this.tooltipPanel = document.createElement("div");
        this.tooltipPanel.className = "better-tooltip-panel";
        this.tooltipPanel.setAttribute("role", "tooltip");
        this.tooltipPanel.setAttribute("aria-hidden", "true");
        this.target.appendChild(this.tooltipPanel);

        // Tooltip inner content
        this.tooltipContent = document.createElement("div");
        this.tooltipContent.className = "better-tooltip-content";
        this.tooltipPanel.appendChild(this.tooltipContent);

        // Setup event handlers
        this.setupEventListeners();
    }

    public update(options: VisualUpdateOptions) {
        // Safe check for dataViews
        const dataView = options.dataViews && options.dataViews[0] ? options.dataViews[0] : null;
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, dataView);

        this.useNativeTooltip = this.formattingSettings.tooltip.useNative.value;

        // 1. Get Markdown content
        let markdownText = this.formattingSettings.tooltip.markdown.value;

        // Fallback to bound measure if available
        if (dataView && dataView.categorical && dataView.categorical.values) {
            const values = dataView.categorical.values;
            if (values.length > 0 && values[0].values && values[0].values.length > 0) {
                const firstVal = values[0].values[0];
                if (firstVal !== null && firstVal !== undefined) {
                    markdownText = String(firstVal);
                }
            }
        }

        this.markdownText = markdownText;

        // Hide custom HTML tooltip if using native tooltip
        if (this.useNativeTooltip) {
            this.tooltipPanel.style.display = "none";
            this.isTooltipOpen = false;
        }

        // 2. Render trigger
        this.renderTrigger(options.viewMode);

        // 3. Render Tooltip Content & Apply Styles
        this.renderTooltip(markdownText);

        // 4. Position active tooltip if currently open
        if (this.isTooltipOpen && !this.useNativeTooltip) {
            this.positionTooltip(options.viewport);
        }
    }

    private renderTrigger(viewMode: number) {
        const triggerSettings = this.formattingSettings.trigger;
        const triggerType = this.getEnumVal(triggerSettings.type.value);
        const iconSymbol = triggerSettings.iconText.value || "ℹ";
        const labelText = triggerSettings.text.value || "";
        const iconSize = triggerSettings.iconSize.value || 16;
        const color = this.getColorVal(triggerSettings.color.value, "#0078D4");
        const bgColor = this.getColorVal(triggerSettings.bgColor.value, "transparent");
        const borderColor = this.getColorVal(triggerSettings.borderColor.value, "transparent");
        const borderWidth = triggerSettings.borderWidth.value || 0;

        // Clear trigger container safely (no innerHTML)
        while (this.triggerContainer.firstChild) {
            this.triggerContainer.removeChild(this.triggerContainer.firstChild);
        }
        
        // Hide trigger and show dashed boundary outline in Edit Mode if Transparent Block
        const isEditMode = viewMode === 1; // 1 = powerbi.ViewMode.Edit
        this.triggerContainer.className = "better-tooltip-trigger";
        this.triggerContainer.style.color = color;
        this.triggerContainer.style.backgroundColor = bgColor;
        this.triggerContainer.style.borderColor = borderColor;
        this.triggerContainer.style.borderWidth = `${borderWidth}px`;
        this.triggerContainer.style.borderStyle = borderWidth > 0 ? "solid" : "none";
        this.triggerContainer.style.fontSize = `${iconSize}px`;
        this.triggerContainer.style.cursor = "pointer";

        if (triggerType === "transparent") {
            this.triggerContainer.classList.add("transparent-block");
            this.triggerContainer.style.width = "100%";
            this.triggerContainer.style.height = "100%";
            this.triggerContainer.style.backgroundColor = "transparent";
            
            if (isEditMode) {
                this.triggerContainer.classList.add("edit-mode-indicator");
                const label = document.createElement("span");
                label.className = "edit-label";
                label.textContent = "Transparent Trigger Block";
                label.style.fontSize = "10px";
                this.triggerContainer.appendChild(label);
            }
            this.triggerContainer.setAttribute("aria-label", "Tooltip trigger area");
        } else {
            // Icon only
            if (triggerType === "icon" || triggerType === "both") {
                const iconEl = document.createElement("span");
                iconEl.className = "trigger-icon";
                iconEl.textContent = iconSymbol;
                iconEl.style.fontSize = `${iconSize}px`;
                this.triggerContainer.appendChild(iconEl);
            }

            // Text only
            if (triggerType === "text" || triggerType === "both") {
                const textEl = document.createElement("span");
                textEl.className = "trigger-text";
                textEl.textContent = labelText;
                textEl.style.fontSize = `${iconSize}px`;
                if (triggerType === "both") {
                    textEl.style.marginLeft = "6px";
                }
                this.triggerContainer.appendChild(textEl);
            }

            this.triggerContainer.setAttribute("aria-label", labelText || "Information tooltip");
        }
    }

    private renderTooltip(markdown: string) {
        const tooltipSettings = this.formattingSettings.tooltip;
        const width = tooltipSettings.width.value || 280;
        const maxHeight = tooltipSettings.maxHeight.value || 300;
        const bgColor = this.getColorVal(tooltipSettings.bgColor.value, "#ffffff");
        const textColor = this.getColorVal(tooltipSettings.textColor.value, "#323130");
        const borderColor = this.getColorVal(tooltipSettings.borderColor.value, "#dedede");
        const borderRadius = tooltipSettings.borderRadius.value || 6;
        const shadow = tooltipSettings.shadow.value;
        const fontFamily = tooltipSettings.fontFamily.value || "Segoe UI, sans-serif";
        const fontSize = tooltipSettings.fontSize.value || 10;
        const padding = tooltipSettings.padding.value || 12;
        const zIndex = tooltipSettings.zIndex.value || 9999;
        const showClose = tooltipSettings.showClose.value;

        // Apply styles to Tooltip Panel
        this.tooltipPanel.style.width = `${width}px`;
        this.tooltipPanel.style.maxHeight = `${maxHeight}px`;
        this.tooltipPanel.style.backgroundColor = bgColor;
        this.tooltipPanel.style.color = textColor;
        this.tooltipPanel.style.borderColor = borderColor;
        this.tooltipPanel.style.borderWidth = "1px";
        this.tooltipPanel.style.borderStyle = "solid";
        this.tooltipPanel.style.borderRadius = `${borderRadius}px`;
        this.tooltipPanel.style.fontFamily = fontFamily;
        this.tooltipPanel.style.fontSize = `${fontSize}pt`;
        this.tooltipPanel.style.padding = `${padding}px`;
        this.tooltipPanel.style.zIndex = `${zIndex}`;

        if (shadow) {
            this.tooltipPanel.classList.add("has-shadow");
        } else {
            this.tooltipPanel.classList.remove("has-shadow");
        }

        // Clear tooltip content safely (no innerHTML)
        while (this.tooltipContent.firstChild) {
            this.tooltipContent.removeChild(this.tooltipContent.firstChild);
        }

        // Render Markdown content
        if (!markdown || markdown.trim() === "") {
            const emptyState = document.createElement("div");
            emptyState.className = "empty-state";
            emptyState.textContent = "No markdown content specified.";
            this.tooltipContent.appendChild(emptyState);
        } else {
            const parsed = new DOMParser().parseFromString(markdownToHtml(markdown), "text/html");
            const nodes = Array.from(parsed.body.childNodes);
            for (const node of nodes) {
                this.tooltipContent.appendChild(node);
            }
        }

        // Handle close button
        if (showClose) {
            if (!this.closeButton) {
                this.closeButton = document.createElement("button");
                this.closeButton.className = "tooltip-close-button";
                this.closeButton.textContent = "×";
                this.closeButton.setAttribute("aria-label", "Close tooltip");
                this.closeButton.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.hideTooltip();
                });
            }
            // Always prepend or append so it doesn't get overwritten
            if (!this.tooltipPanel.contains(this.closeButton)) {
                this.tooltipPanel.appendChild(this.closeButton);
            }
            this.closeButton.style.color = textColor;
        } else if (this.closeButton && this.tooltipPanel.contains(this.closeButton)) {
            this.tooltipPanel.removeChild(this.closeButton);
        }
    }

    private setupEventListeners() {
        // Hover trigger behavior
        this.triggerContainer.addEventListener("mouseenter", (e: MouseEvent) => {
            if (this.useNativeTooltip) {
                this.showNativeTooltip(e);
                return;
            }
            const openBehavior = this.getEnumVal(this.formattingSettings?.tooltip?.openBehavior?.value) || "hover";
            if (openBehavior === "hover") {
                this.clearCloseTimeout();
                this.showTooltip();
            }
        });

        this.triggerContainer.addEventListener("mousemove", (e: MouseEvent) => {
            if (this.useNativeTooltip) {
                this.moveNativeTooltip(e);
            }
        });

        this.triggerContainer.addEventListener("mouseleave", () => {
            if (this.useNativeTooltip) {
                this.hideNativeTooltip();
                return;
            }
            const openBehavior = this.getEnumVal(this.formattingSettings?.tooltip?.openBehavior?.value) || "hover";
            if (openBehavior === "hover") {
                this.startCloseTimeout();
            }
        });

        // Tooltip mouse enter/leave (to keep open when hovering content)
        this.tooltipPanel.addEventListener("mouseenter", () => {
            if (this.useNativeTooltip) return;
            const openBehavior = this.getEnumVal(this.formattingSettings?.tooltip?.openBehavior?.value) || "hover";
            if (openBehavior === "hover") {
                this.clearCloseTimeout();
            }
        });

        this.tooltipPanel.addEventListener("mouseleave", () => {
            if (this.useNativeTooltip) return;
            const openBehavior = this.getEnumVal(this.formattingSettings?.tooltip?.openBehavior?.value) || "hover";
            if (openBehavior === "hover") {
                this.startCloseTimeout();
            }
        });

        // Click trigger behavior
        this.triggerContainer.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.useNativeTooltip) return;
            const openBehavior = this.getEnumVal(this.formattingSettings?.tooltip?.openBehavior?.value) || "hover";
            if (openBehavior === "click") {
                if (this.isTooltipOpen) {
                    this.hideTooltip();
                } else {
                    this.showTooltip();
                }
            }
        });

        // Keydown support (e.g. Enter or Space on trigger to open/close)
        this.triggerContainer.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (this.useNativeTooltip) {
                    if (this.isTooltipOpen) {
                        this.hideNativeTooltip();
                    } else {
                        const rect = this.triggerContainer.getBoundingClientRect();
                        this.showNativeTooltipAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
                    }
                    return;
                }
                if (this.isTooltipOpen) {
                    this.hideTooltip();
                } else {
                    this.showTooltip();
                }
            }
        });

        // Link redirection handler inside tooltip
        this.tooltipContent.addEventListener("click", (e: MouseEvent) => {
            let targetEl = e.target as HTMLElement;
            // Traverse up to find <a> tag if clicked on child elements like strong inside a link
            while (targetEl && targetEl !== this.tooltipContent) {
                if (targetEl.tagName === "A") {
                    const href = targetEl.getAttribute("href");
                    if (href) {
                        e.preventDefault();
                        this.host.launchUrl(href);
                    }
                    break;
                }
                targetEl = targetEl.parentElement;
            }
        });

        // Global Click handler (Click outside to close)
        this.globalClickHandler = (e: MouseEvent) => {
            if (this.isTooltipOpen && !this.useNativeTooltip) {
                const target = e.target as HTMLElement;
                if (!this.target.contains(target)) {
                    this.hideTooltip();
                }
            }
        };

        // Global Keydown handler (ESC to close)
        this.globalKeyDownHandler = (e: KeyboardEvent) => {
            if (e.key === "Escape" && this.isTooltipOpen) {
                if (this.useNativeTooltip) {
                    this.hideNativeTooltip();
                } else {
                    this.hideTooltip();
                }
                this.triggerContainer.focus();
            }
        };

        document.addEventListener("click", this.globalClickHandler);
        document.addEventListener("keydown", this.globalKeyDownHandler);
    }

    private showNativeTooltip(e: MouseEvent) {
        this.isTooltipOpen = true;
        this.host.tooltipService.show({
            coordinates: [e.clientX, e.clientY],
            dataItems: [
                {
                    displayName: "Details",
                    value: stripMarkdown(this.markdownText)
                }
            ],
            identities: [],
            isTouchEvent: false
        });
    }

    private showNativeTooltipAt(x: number, y: number) {
        this.isTooltipOpen = true;
        this.host.tooltipService.show({
            coordinates: [x, y],
            dataItems: [
                {
                    displayName: "Details",
                    value: stripMarkdown(this.markdownText)
                }
            ],
            identities: [],
            isTouchEvent: false
        });
    }

    private moveNativeTooltip(e: MouseEvent) {
        this.host.tooltipService.move({
            coordinates: [e.clientX, e.clientY],
            dataItems: [
                {
                    displayName: "Details",
                    value: stripMarkdown(this.markdownText)
                }
            ],
            identities: [],
            isTouchEvent: false
        });
    }

    private hideNativeTooltip() {
        this.isTooltipOpen = false;
        this.host.tooltipService.hide({ immediately: true, isTouchEvent: false });
    }

    private showTooltip() {
        if (this.isTooltipOpen) return;
        
        this.isTooltipOpen = true;
        this.tooltipPanel.style.display = "block";
        this.tooltipPanel.setAttribute("aria-hidden", "false");

        // Force reflow to ensure transition starts
        this.tooltipPanel.offsetHeight;

        // Trigger animation
        const animation = this.getEnumVal(this.formattingSettings?.tooltip?.animation?.value) || "fade";
        const duration = this.formattingSettings?.tooltip?.duration?.value ?? 200;
        
        this.tooltipPanel.className = `better-tooltip-panel better-tooltip-active animate-${animation}`;
        if (this.formattingSettings?.tooltip?.shadow?.value) {
            this.tooltipPanel.classList.add("has-shadow");
        }
        
        // Inline transition styles
        this.tooltipPanel.style.transition = animation !== "none" 
            ? `opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)` 
            : "none";

        // Measure & Position (uses current viewport size)
        // Note: For Power BI, we must read target's client rectangle or viewport properties
        const viewport = {
            width: this.target.clientWidth || window.innerWidth,
            height: this.target.clientHeight || window.innerHeight
        };
        this.positionTooltip(viewport);
    }

    private hideTooltip() {
        if (!this.isTooltipOpen) return;

        const animation = this.getEnumVal(this.formattingSettings?.tooltip?.animation?.value) || "fade";
        const duration = this.formattingSettings?.tooltip?.duration?.value ?? 200;

        this.tooltipPanel.classList.remove("better-tooltip-active");

        if (animation === "none") {
            this.tooltipPanel.style.display = "none";
            this.tooltipPanel.setAttribute("aria-hidden", "true");
            this.isTooltipOpen = false;
        } else {
            // Wait for transition to finish before hiding display
            setTimeout(() => {
                // Ensure it hasn't been reopened in the meantime
                if (!this.isTooltipOpen) {
                    this.tooltipPanel.style.display = "none";
                    this.tooltipPanel.setAttribute("aria-hidden", "true");
                }
            }, duration);
            this.isTooltipOpen = false;
        }
    }

    private positionTooltip(viewport: { width: number, height: number }) {
        const tooltipSettings = this.formattingSettings.tooltip;
        const preferredPlacement = this.getEnumVal(tooltipSettings.placement.value) || "auto";
        const offsetX = tooltipSettings.offsetX.value ?? 8;
        const offsetY = tooltipSettings.offsetY.value ?? 8;
        const tooltipWidth = tooltipSettings.width.value || 280;

        // Measure elements relative to the visual container
        const containerRect = this.target.getBoundingClientRect();
        const triggerRect = this.triggerContainer.getBoundingClientRect();

        const triggerLeft = triggerRect.left - containerRect.left;
        const triggerTop = triggerRect.top - containerRect.top;
        const triggerWidth = triggerRect.width;
        const triggerHeight = triggerRect.height;

        const tooltipHeight = this.tooltipPanel.getBoundingClientRect().height;

        let x = 0;
        let y = 0;
        let finalPlacement = preferredPlacement;

        const getCoords = (placement: string) => {
            let cx = 0;
            let cy = 0;
            if (placement === "top") {
                cx = triggerLeft + (triggerWidth - tooltipWidth) / 2;
                cy = triggerTop - tooltipHeight - offsetY;
            } else if (placement === "bottom") {
                cx = triggerLeft + (triggerWidth - tooltipWidth) / 2;
                cy = triggerTop + triggerHeight + offsetY;
            } else if (placement === "left") {
                cx = triggerLeft - tooltipWidth - offsetX;
                cy = triggerTop + (triggerHeight - tooltipHeight) / 2;
            } else if (placement === "right") {
                cx = triggerLeft + triggerWidth + offsetX;
                cy = triggerTop + (triggerHeight - tooltipHeight) / 2;
            }
            return { cx, cy };
        };

        const checkFits = (placement: string) => {
            const { cx, cy } = getCoords(placement);
            return (
                cx >= 0 && 
                cx + tooltipWidth <= viewport.width && 
                cy >= 0 && 
                cy + tooltipHeight <= viewport.height
            );
        };

        // Resolve Auto placement or flip if overflow
        if (preferredPlacement === "auto") {
            const placements = ["top", "bottom", "right", "left"];
            let found = false;
            for (const p of placements) {
                if (checkFits(p)) {
                    finalPlacement = p;
                    found = true;
                    break;
                }
            }
            // Default fallback if nothing fits perfectly
            if (!found) {
                finalPlacement = "bottom";
            }
        } else {
            // User preferred a specific side. Check if it overflows. If so, try opposite side.
            if (!checkFits(preferredPlacement)) {
                const opposites: { [key: string]: string } = {
                    top: "bottom",
                    bottom: "top",
                    left: "right",
                    right: "left"
                };
                const opp = opposites[preferredPlacement];
                if (checkFits(opp)) {
                    finalPlacement = opp;
                }
            }
        }

        // Compute final coordinates
        const coords = getCoords(finalPlacement);
        x = coords.cx;
        y = coords.cy;

        // Constraint adjustments: Keep inside viewport boundaries
        if (finalPlacement === "top" || finalPlacement === "bottom") {
            x = Math.max(0, Math.min(x, viewport.width - tooltipWidth));
        } else {
            y = Math.max(0, Math.min(y, viewport.height - tooltipHeight));
        }

        // Apply coordinate bounds limit
        x = Math.max(0, x);
        y = Math.max(0, y);

        // Apply styling
        this.tooltipPanel.style.left = `${x}px`;
        this.tooltipPanel.style.top = `${y}px`;

        // Update placement attributes for custom styles
        this.tooltipPanel.setAttribute("data-placement", finalPlacement);
    }

    private startCloseTimeout() {
        this.clearCloseTimeout();
        const duration = this.formattingSettings?.tooltip?.duration?.value ?? 200;
        this.closeTimeout = window.setTimeout(() => {
            this.hideTooltip();
        }, duration);
    }

    private clearCloseTimeout() {
        if (this.closeTimeout !== null) {
            window.clearTimeout(this.closeTimeout);
            this.closeTimeout = null;
        }
    }

    // Helper to extract string from IEnumMember or string property
    private getEnumVal(val: any): string {
        if (!val) return "";
        if (typeof val === "object" && val.value !== undefined) {
            return String(val.value);
        }
        return String(val);
    }

    // Helper to get hex string from Fill color properties
    private getColorVal(fill: any, defaultColor: string): string {
        if (!fill) return defaultColor;
        if (fill.solid && fill.solid.color) {
            return fill.solid.color;
        }
        return defaultColor;
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    // Cleanup global listeners to prevent memory leaks in Power BI
    public destroy() {
        document.removeEventListener("click", this.globalClickHandler);
        document.removeEventListener("keydown", this.globalKeyDownHandler);
        this.clearCloseTimeout();
    }
}