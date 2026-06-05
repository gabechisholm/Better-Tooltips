/*
 *  Power BI Visualizations
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

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

/**
 * Trigger Settings Card
 */
export class TriggerCardSettings extends FormattingSettingsCard {
    public type = new formattingSettings.ItemDropdown({
        name: "type",
        displayName: "Trigger type",
        items: [
            { value: "icon", displayName: "Icon" },
            { value: "text", displayName: "Text" },
            { value: "both", displayName: "Icon + Text" },
            { value: "transparent", displayName: "Transparent Block" }
        ],
        value: { value: "icon", displayName: "Icon" }
    });

    public text = new formattingSettings.TextInput({
        name: "text",
        displayName: "Trigger text",
        placeholder: "Details",
        value: "Details"
    });

    public iconText = new formattingSettings.TextInput({
        name: "iconText",
        displayName: "Icon symbol / text",
        placeholder: "ℹ",
        value: "ℹ"
    });

    public iconSize = new formattingSettings.NumUpDown({
        name: "iconSize",
        displayName: "Icon/Text size (px)",
        value: 16
    });

    public color = new formattingSettings.ColorPicker({
        name: "color",
        displayName: "Color",
        value: { value: "#0078D4" }
    });

    public bgColor = new formattingSettings.ColorPicker({
        name: "bgColor",
        displayName: "Background color",
        value: { value: "transparent" }
    });

    public borderColor = new formattingSettings.ColorPicker({
        name: "borderColor",
        displayName: "Border color",
        value: { value: "transparent" }
    });

    public borderWidth = new formattingSettings.NumUpDown({
        name: "borderWidth",
        displayName: "Border width (px)",
        value: 0
    });

    name: string = "trigger";
    displayName: string = "Trigger Settings";
    slices: Array<FormattingSettingsSlice> = [
        this.type,
        this.text,
        this.iconText,
        this.iconSize,
        this.color,
        this.bgColor,
        this.borderColor,
        this.borderWidth
    ];
}

/**
 * Tooltip Settings Card
 */
export class TooltipCardSettings extends FormattingSettingsCard {
    public markdown = new formattingSettings.TextInput({
        name: "markdown",
        displayName: "Markdown content",
        placeholder: "Enter markdown here...",
        value: "# Better Tooltips\n\nThis is a **rich markdown** tooltip!\n- Supports list items\n- Bold and *italic* text\n- [Power BI Host Links](https://powerbi.microsoft.com)\n\nPlace standard images/GIFs:\n![Sample](https://picsum.photos/240/120)"
    });

    public useNative = new formattingSettings.ToggleSwitch({
        name: "useNative",
        displayName: "Use native Power BI tooltip",
        value: false
    });

    public width = new formattingSettings.NumUpDown({
        name: "width",
        displayName: "Width (px)",
        value: 280
    });

    public maxHeight = new formattingSettings.NumUpDown({
        name: "maxHeight",
        displayName: "Maximum height (px)",
        value: 300
    });

    public bgColor = new formattingSettings.ColorPicker({
        name: "bgColor",
        displayName: "Background color",
        value: { value: "#ffffff" }
    });

    public textColor = new formattingSettings.ColorPicker({
        name: "textColor",
        displayName: "Text color",
        value: { value: "#323130" }
    });

    public borderColor = new formattingSettings.ColorPicker({
        name: "borderColor",
        displayName: "Border color",
        value: { value: "#dedede" }
    });

    public borderRadius = new formattingSettings.NumUpDown({
        name: "borderRadius",
        displayName: "Border radius (px)",
        value: 6
    });

    public shadow = new formattingSettings.ToggleSwitch({
        name: "shadow",
        displayName: "Shadow",
        value: true
    });

    public fontFamily = new formattingSettings.TextInput({
        name: "fontFamily",
        displayName: "Font family",
        placeholder: "Segoe UI, Arial, sans-serif",
        value: "\"Segoe UI\", -apple-system, BlinkMacSystemFont, Arial, sans-serif"
    });

    public fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Font size (pt)",
        value: 10
    });

    public padding = new formattingSettings.NumUpDown({
        name: "padding",
        displayName: "Padding (px)",
        value: 12
    });

    public placement = new formattingSettings.ItemDropdown({
        name: "placement",
        displayName: "Placement",
        items: [
            { value: "auto", displayName: "Auto" },
            { value: "top", displayName: "Top" },
            { value: "right", displayName: "Right" },
            { value: "bottom", displayName: "Bottom" },
            { value: "left", displayName: "Left" }
        ],
        value: { value: "auto", displayName: "Auto" }
    });

    public offsetX = new formattingSettings.NumUpDown({
        name: "offsetX",
        displayName: "Offset X (px)",
        value: 8
    });

    public offsetY = new formattingSettings.NumUpDown({
        name: "offsetY",
        displayName: "Offset Y (px)",
        value: 8
    });

    public showClose = new formattingSettings.ToggleSwitch({
        name: "showClose",
        displayName: "Show close button",
        value: false
    });

    public openBehavior = new formattingSettings.ItemDropdown({
        name: "openBehavior",
        displayName: "Open behavior",
        items: [
            { value: "hover", displayName: "Hover" },
            { value: "click", displayName: "Click" }
        ],
        value: { value: "hover", displayName: "Hover" }
    });

    public animation = new formattingSettings.ItemDropdown({
        name: "animation",
        displayName: "Animation",
        items: [
            { value: "none", displayName: "None" },
            { value: "fade", displayName: "Fade" },
            { value: "slide", displayName: "Slide" },
            { value: "scale", displayName: "Scale" }
        ],
        value: { value: "fade", displayName: "Fade" }
    });

    public duration = new formattingSettings.NumUpDown({
        name: "duration",
        displayName: "Animation duration (ms)",
        value: 200
    });

    public zIndex = new formattingSettings.NumUpDown({
        name: "zIndex",
        displayName: "Z-index / Depth",
        value: 9999
    });

    name: string = "tooltip";
    displayName: string = "Tooltip Settings";
    slices: Array<FormattingSettingsSlice> = [
        this.markdown,
        this.useNative,
        this.width,
        this.maxHeight,
        this.bgColor,
        this.textColor,
        this.borderColor,
        this.borderRadius,
        this.shadow,
        this.fontFamily,
        this.fontSize,
        this.padding,
        this.placement,
        this.offsetX,
        this.offsetY,
        this.showClose,
        this.openBehavior,
        this.animation,
        this.duration,
        this.zIndex
    ];
}

/**
 * Visual settings model class
 */
export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    public trigger = new TriggerCardSettings();
    public tooltip = new TooltipCardSettings();
    cards = [this.trigger, this.tooltip];
}
