/**
 * Locator Generator Utility
 * Generates robust locators for Oracle JET, Redwood, and Spectra components
 * Handles deeply nested elements, span-aggregated text, and component-specific patterns
 */

import {
  detectComponentFramework,
  isSpectraComponent,
  isJETComponent,
  isRedwoodComponent,
  ComponentFramework,
  ElementData
} from './component-detector';
import {
  extractDeepText,
  extractLabelText,
  extractPlaceholderText,
  aggregateSpanText,
  SnapshotData
} from './text-extractor';

export interface LocatorGenerationOptions {
  prioritizeComponentFramework?: boolean;
  extractDeepText?: boolean;
  aggregateSpanText?: boolean;
  preventStaleElements?: boolean;
}

export interface GeneratedLocators {
  selectors: string[]; // Ordered by priority
  componentFramework: ComponentFramework;
  textContent: string | null;
  labelText: string | null;
  placeholderText: string | null;
}

/**
 * Generates robust locators for an element
 * Follows priority: Spectra > JET > Redwood > HTML
 */
export function generateLocators(
  element: ElementData,
  snapshot: SnapshotData,
  options: LocatorGenerationOptions = {}
): GeneratedLocators {
  const {
    prioritizeComponentFramework = true,
    extractDeepText: shouldExtractDeepText = true,
    aggregateSpanText: shouldAggregateSpanText = true,
    preventStaleElements = true
  } = options;

  // Detect component framework
  const componentFramework = detectComponentFramework(element);

  // Extract text content
  const textContent = shouldExtractDeepText ? extractDeepText(element, snapshot) : null;
  const labelText = shouldExtractDeepText ? extractLabelText(element, snapshot) : null;
  const placeholderText = shouldExtractDeepText ? extractPlaceholderText(element, snapshot) : null;
  const aggregatedText = shouldAggregateSpanText ? aggregateSpanText(element, snapshot) : null;

  // Generate selectors based on component framework
  const selectors: string[] = [];

  // Priority 1: Test IDs (always highest priority)
  addTestIdSelectors(element, selectors);

  // Priority 2: Component-specific attributes (if framework detected)
  if (prioritizeComponentFramework) {
    addComponentSpecificSelectors(element, componentFramework, selectors);
  }

  // Priority 3: Stable ID selectors
  addStableIdSelectors(element, selectors);

  // Priority 4: Name attributes
  addNameSelectors(element, selectors);

  // Priority 5: Component-specific classes
  if (prioritizeComponentFramework) {
    addComponentClassSelectors(element, componentFramework, selectors);
  }

  // Priority 6: Aria attributes
  addAriaSelectors(element, labelText, selectors);

  // Priority 7: Type attributes
  addTypeSelectors(element, selectors);

  // Priority 8: Placeholder attributes (including nested)
  addPlaceholderSelectors(element, placeholderText, selectors);

  // Priority 9: Deep text-based XPath (aggregated from spans)
  if (shouldExtractDeepText || shouldAggregateSpanText) {
    addTextBasedXPathSelectors(element, textContent, aggregatedText, labelText, selectors);
  }

  // Priority 10: Stable class selectors
  addStableClassSelectors(element, selectors);

  // Priority 11: XPath fallbacks (with component context)
  addXPathFallbacks(element, componentFramework, selectors);

  // Limit to 5 selectors maximum
  const finalSelectors = selectors.slice(0, 5);

  return {
    selectors: finalSelectors,
    componentFramework,
    textContent: textContent || aggregatedText || null,
    labelText,
    placeholderText
  };
}

/**
 * Adds test ID selectors (data-testid, data-cy, data-test)
 */
function addTestIdSelectors(element: ElementData, selectors: string[]): void {
  const attrs = element.attributes || {};
  
  if (attrs.dataTestid || attrs['data-testid']) {
    const value = attrs.dataTestid || attrs['data-testid'];
    selectors.push(`[data-testid="${escapeSelector(value)}"]`);
  }
  
  if (attrs.dataCy || attrs['data-cy']) {
    const value = attrs.dataCy || attrs['data-cy'];
    selectors.push(`[data-cy="${escapeSelector(value)}"]`);
  }
  
  if (attrs.dataTest || attrs['data-test']) {
    const value = attrs.dataTest || attrs['data-test'];
    selectors.push(`[data-test="${escapeSelector(value)}"]`);
  }
}

/**
 * Adds component-specific attribute selectors
 */
function addComponentSpecificSelectors(
  element: ElementData,
  framework: ComponentFramework,
  selectors: string[]
): void {
  const attrs = element.attributes || {};

  if (framework === 'spectra') {
    // Spectra: sp-* prefixed attributes
    for (const [key, value] of Object.entries(attrs)) {
      if (/^sp-/.test(key) && value) {
        selectors.push(`[${key}="${escapeSelector(value)}"]`);
      }
      if (/^data-spectra-/.test(key) && value) {
        selectors.push(`[${key}="${escapeSelector(value)}"]`);
      }
    }
  } else if (framework === 'jet') {
    // JET: data-oj-* attributes
    for (const [key, value] of Object.entries(attrs)) {
      if (/^data-oj-/.test(key) && value) {
        selectors.push(`[${key}="${escapeSelector(value)}"]`);
      }
    }
  }
}

/**
 * Adds stable ID selectors (validates stability first)
 */
function addStableIdSelectors(element: ElementData, selectors: string[]): void {
  if (!element.id) {
    return;
  }

  // Validate ID is stable
  if (isStableId(element.id)) {
    selectors.push(`#${escapeSelector(element.id)}`);
  }
}

/**
 * Adds name attribute selectors
 */
function addNameSelectors(element: ElementData, selectors: string[]): void {
  const attrs = element.attributes || {};
  const name = attrs.name;
  
  if (name) {
    selectors.push(`[name="${escapeSelector(name)}"]`);
    if (element.tag) {
      selectors.push(`${element.tag}[name="${escapeSelector(name)}"]`);
    }
  }
}

/**
 * Adds component-specific class selectors
 */
function addComponentClassSelectors(
  element: ElementData,
  framework: ComponentFramework,
  selectors: string[]
): void {
  if (!element.class) {
    return;
  }

  const classes = element.class.split(/\s+/).filter(cls => cls.trim());

  if (framework === 'spectra') {
    // Spectra: sp-* classes, oj-spectra-* classes
    const spectraClasses = classes.filter(cls => /^sp-/.test(cls) || /^oj-spectra-/.test(cls));
    if (spectraClasses.length > 0) {
      selectors.push(`.${spectraClasses[0]}`);
      if (spectraClasses.length > 1) {
        selectors.push(`.${spectraClasses.join('.')}`);
      }
    }
  } else if (framework === 'jet') {
    // JET: oj-* classes (but not oj-spectra-* or oj-redwood-*)
    const jetClasses = classes.filter(cls => 
      /^oj-/.test(cls) && !/^oj-spectra-/.test(cls) && !/^oj-redwood-/.test(cls)
    );
    if (jetClasses.length > 0) {
      selectors.push(`.${jetClasses[0]}`);
      if (jetClasses.length > 1) {
        selectors.push(`.${jetClasses.join('.')}`);
      }
    }
  } else if (framework === 'redwood') {
    // Redwood: oj-redwood-* classes
    const redwoodClasses = classes.filter(cls => /^oj-redwood-/.test(cls));
    if (redwoodClasses.length > 0) {
      selectors.push(`.${redwoodClasses[0]}`);
      if (redwoodClasses.length > 1) {
        selectors.push(`.${redwoodClasses.join('.')}`);
      }
    }
  }
}

/**
 * Adds aria attribute selectors
 */
function addAriaSelectors(element: ElementData, labelText: string | null, selectors: string[]): void {
  const attrs = element.attributes || {};

  if (attrs.ariaLabel || attrs['aria-label']) {
    const value = attrs.ariaLabel || attrs['aria-label'];
    selectors.push(`[aria-label="${escapeSelector(value)}"]`);
  }

  if (attrs.ariaLabelledby || attrs['aria-labelledby']) {
    const value = attrs.ariaLabelledby || attrs['aria-labelledby'];
    selectors.push(`[aria-labelledby="${escapeSelector(value)}"]`);
  }

  // Use extracted label text for XPath
  if (labelText) {
    const tag = element.tag || '*';
    selectors.push(`//${tag}[@aria-label="${escapeXPathString(labelText)}"]`);
  }
}

/**
 * Adds type attribute selectors
 */
function addTypeSelectors(element: ElementData, selectors: string[]): void {
  const attrs = element.attributes || {};
  const type = attrs.type;

  if (type) {
    selectors.push(`[type="${escapeSelector(type)}"]`);
    if (element.tag) {
      selectors.push(`${element.tag}[type="${escapeSelector(type)}"]`);
    }
    // Combine with name if available
    if (attrs.name) {
      selectors.push(`${element.tag || 'input'}[name="${escapeSelector(attrs.name)}"][type="${escapeSelector(type)}"]`);
    }
  }
}

/**
 * Adds placeholder attribute selectors
 */
function addPlaceholderSelectors(
  element: ElementData,
  placeholderText: string | null,
  selectors: string[]
): void {
  const attrs = element.attributes || {};

  if (attrs.placeholder) {
    selectors.push(`[placeholder="${escapeSelector(attrs.placeholder)}"]`);
    if (element.tag) {
      selectors.push(`${element.tag}[placeholder="${escapeSelector(attrs.placeholder)}"]`);
    }
  }

  // Use extracted placeholder text
  if (placeholderText) {
    const tag = element.tag || 'input';
    selectors.push(`//${tag}[@placeholder="${escapeXPathString(placeholderText)}"]`);
  }
}

/**
 * Adds text-based XPath selectors (handles span aggregation)
 */
function addTextBasedXPathSelectors(
  element: ElementData,
  textContent: string | null,
  aggregatedText: string | null,
  labelText: string | null,
  selectors: string[]
): void {
  const tag = element.tag || '*';
  const textToUse = aggregatedText || textContent;

  if (textToUse && textToUse.trim()) {
    // Use normalize-space() to handle whitespace and span-split text
    const normalizedText = textToUse.trim();
    if (normalizedText.length > 0 && normalizedText.length < 100) { // Limit length for XPath
      selectors.push(`//${tag}[normalize-space(text())="${escapeXPathString(normalizedText)}"]`);
      // Also add contains() version for partial matches
      if (normalizedText.length > 10) {
        const partialText = normalizedText.substring(0, 20);
        selectors.push(`//${tag}[contains(normalize-space(text()), "${escapeXPathString(partialText)}")]`);
      }
    }
  }

  // Use label text for XPath
  if (labelText && labelText.trim() && labelText.length < 100) {
    selectors.push(`//${tag}[normalize-space(.)="${escapeXPathString(labelText.trim())}"]`);
  }
}

/**
 * Adds stable class selectors
 */
function addStableClassSelectors(element: ElementData, selectors: string[]): void {
  if (!element.class) {
    return;
  }

  const classes = element.class.split(/\s+/)
    .filter(cls => cls.trim())
    .filter(cls => isStableClass(cls));

  if (classes.length > 0) {
    // Use single most stable class
    selectors.push(`.${classes[0]}`);
    // Use combined classes if multiple stable ones exist
    if (classes.length > 1 && classes.length <= 3) {
      selectors.push(`.${classes.join('.')}`);
    }
  }
}

/**
 * Adds XPath fallbacks
 */
function addXPathFallbacks(
  element: ElementData,
  framework: ComponentFramework,
  selectors: string[]
): void {
  const tag = element.tag || '*';
  const attrs = element.attributes || {};

  // XPath by ID
  if (element.id && isStableId(element.id)) {
    selectors.push(`//${tag}[@id="${escapeXPathString(element.id)}"]`);
  }

  // XPath by name
  if (attrs.name) {
    selectors.push(`//${tag}[@name="${escapeXPathString(attrs.name)}"]`);
  }

  // XPath by role
  if (attrs.role) {
    selectors.push(`//${tag}[@role="${escapeXPathString(attrs.role)}"]`);
  }

  // Component-specific XPath
  if (framework === 'spectra') {
    for (const [key, value] of Object.entries(attrs)) {
      if (/^sp-/.test(key) && value) {
        selectors.push(`//${tag}[@${key}="${escapeXPathString(value)}"]`);
      }
    }
  } else if (framework === 'jet') {
    for (const [key, value] of Object.entries(attrs)) {
      if (/^data-oj-/.test(key) && value) {
        selectors.push(`//${tag}[@${key}="${escapeXPathString(value)}"]`);
      }
    }
  }
}

/**
 * Validates if an ID is stable (not dynamic)
 */
function isStableId(id: string): boolean {
  // Reject pure numbers
  if (/^\d+$/.test(id)) {
    return false;
  }

  // Reject long hex strings (32+ chars)
  if (/[a-f0-9]{32,}/i.test(id)) {
    return false;
  }

  // Reject timestamps, random, temp, gen patterns
  if (/timestamp|random|temp|gen/i.test(id)) {
    return false;
  }

  // Reject pattern like "element-12345"
  if (/^[a-z]+-\d+$/i.test(id)) {
    return false;
  }

  return true;
}

/**
 * Validates if a class is stable (not hashed/dynamic)
 */
function isStableClass(className: string): boolean {
  // Reject long alphanumeric (10+ chars, likely hashed)
  if (/^[a-z0-9]{10,}$/i.test(className) && !/^[a-z]+-[a-z]+/i.test(className)) {
    return false;
  }

  // Accept semantic patterns
  if (/^(btn|input|form|oxd|ant|mui|sp|oj|spectra|redwood)-/.test(className)) {
    return true;
  }

  // Accept framework prefixes
  if (/^(sp-|oj-|spectra-|redwood-)/.test(className)) {
    return true;
  }

  // Accept short semantic classes
  if (className.length < 20 && /^[a-z][a-z0-9-]*$/i.test(className)) {
    return true;
  }

  return false;
}

/**
 * Escapes special characters in CSS selector values
 */
function escapeSelector(value: string): string {
  return value.replace(/"/g, '\\"').replace(/'/g, "\\'");
}

/**
 * Escapes special characters in XPath string values
 */
function escapeXPathString(value: string): string {
  // XPath string literals: escape quotes
  if (value.includes('"') && value.includes("'")) {
    // If both quotes exist, use concat()
    const parts = value.split('"');
    return `concat(${parts.map((part, i) => 
      i === 0 ? `"${part}"` : `'"', "${part}"`
    ).join(', ')})`;
  } else if (value.includes('"')) {
    // Use single quotes
    return `'${value.replace(/'/g, "''")}'`;
  } else {
    // Use double quotes
    return `"${value}"`;
  }
}
