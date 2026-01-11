/**
 * Text Extraction Utility
 * Extracts text, labels, and placeholders from deeply nested elements
 * Handles text split across multiple span elements
 */

export interface ElementData {
  tag?: string;
  id?: string;
  class?: string;
  attributes?: Record<string, string>;
  text?: string;
  parent?: ElementData;
  children?: ElementData[];
  [key: string]: any;
}

export interface SnapshotData {
  elements?: ElementData[];
  [key: string]: any;
}

/**
 * Extracts all visible text from an element and its descendants
 * Aggregates text from multiple spans and nested elements
 */
export function extractDeepText(element: ElementData, snapshot: SnapshotData): string {
  const textParts: string[] = [];

  // Add direct text content
  if (element.text && element.text.trim()) {
    textParts.push(element.text.trim());
  }

  // Recursively extract text from children
  if (element.children && element.children.length > 0) {
    for (const child of element.children) {
      const childText = extractDeepText(child, snapshot);
      if (childText) {
        textParts.push(childText);
      }
    }
  }

  // Join and normalize whitespace
  const fullText = textParts.join(' ').replace(/\s+/g, ' ').trim();
  return fullText;
}

/**
 * Extracts label text for an element
 * Searches:
 * - aria-label attribute
 * - aria-labelledby references
 * - Associated <label> elements (via for/id relationship)
 * - Parent containers with label text
 */
export function extractLabelText(element: ElementData, snapshot: SnapshotData): string | null {
  // Check aria-label directly
  if (element.attributes?.ariaLabel || element.attributes?.['aria-label']) {
    const label = element.attributes.ariaLabel || element.attributes['aria-label'];
    if (label && label.trim()) {
      return label.trim();
    }
  }

  // Check aria-labelledby and find referenced element
  const labelledBy = element.attributes?.ariaLabelledby || element.attributes?.['aria-labelledby'];
  if (labelledBy) {
    const labelElement = findElementById(labelledBy, snapshot);
    if (labelElement) {
      const labelText = extractDeepText(labelElement, snapshot);
      if (labelText) {
        return labelText;
      }
    }
  }

  // Check for associated label element via id/for relationship
  if (element.id) {
    const labelElement = findLabelForElement(element.id, snapshot);
    if (labelElement) {
      const labelText = extractDeepText(labelElement, snapshot);
      if (labelText) {
        return labelText;
      }
    }
  }

  // Search parent chain for label elements (up to 5 levels)
  let current: ElementData | undefined = element.parent;
  let depth = 0;
  while (current && depth < 5) {
    // Check if parent is a label element
    if (current.tag === 'label') {
      const labelText = extractDeepText(current, snapshot);
      if (labelText) {
        return labelText;
      }
    }

    // Check for label in parent's children (sibling labels)
    if (current.children) {
      for (const sibling of current.children) {
        if (sibling.tag === 'label') {
          // Check if label's 'for' attribute matches element's id
          const labelFor = sibling.attributes?.for || sibling.attributes?.htmlFor;
          if (labelFor === element.id) {
            const labelText = extractDeepText(sibling, snapshot);
            if (labelText) {
              return labelText;
            }
          }
        }
      }
    }

    current = current.parent;
    depth++;
  }

  return null;
}

/**
 * Extracts placeholder text for an element
 * Searches:
 * - placeholder attribute on element
 * - placeholder in parent containers
 * - aria-placeholder attribute
 */
export function extractPlaceholderText(element: ElementData, snapshot: SnapshotData): string | null {
  // Check placeholder attribute directly
  if (element.attributes?.placeholder) {
    const placeholder = element.attributes.placeholder;
    if (placeholder && placeholder.trim()) {
      return placeholder.trim();
    }
  }

  // Check aria-placeholder
  if (element.attributes?.ariaPlaceholder || element.attributes?.['aria-placeholder']) {
    const placeholder = element.attributes.ariaPlaceholder || element.attributes['aria-placeholder'];
    if (placeholder && placeholder.trim()) {
      return placeholder.trim();
    }
  }

  // Search parent chain for placeholder (up to 3 levels, usually in wrapper divs)
  let current: ElementData | undefined = element.parent;
  let depth = 0;
  while (current && depth < 3) {
    if (current.attributes?.placeholder) {
      const placeholder = current.attributes.placeholder;
      if (placeholder && placeholder.trim()) {
        return placeholder.trim();
      }
    }
    current = current.parent;
    depth++;
  }

  return null;
}

/**
 * Aggregates text from multiple span elements
 * Collects all text nodes, filters hidden elements, normalizes whitespace
 */
export function aggregateSpanText(element: ElementData, snapshot: SnapshotData): string {
  const textParts: string[] = [];

  // Recursively collect text from all descendants
  function collectText(el: ElementData, parts: string[]): void {
    // Add direct text (excluding span tags themselves, just their text)
    if (el.text && el.text.trim() && el.tag !== 'span') {
      parts.push(el.text.trim());
    }

    // For span elements, collect their text content
    if (el.tag === 'span') {
      const spanText = extractDeepText(el, snapshot);
      if (spanText) {
        parts.push(spanText);
      }
    }

    // Recursively process children
    if (el.children && el.children.length > 0) {
      for (const child of el.children) {
        collectText(child, parts);
      }
    }
  }

  collectText(element, textParts);

  // Join and normalize whitespace
  const aggregatedText = textParts.join(' ').replace(/\s+/g, ' ').trim();
  return aggregatedText;
}

/**
 * Finds a nested label element associated with the given element
 */
export function findNestedLabel(element: ElementData, snapshot: SnapshotData): ElementData | null {
  const labelText = extractLabelText(element, snapshot);
  if (!labelText) {
    return null;
  }

  // Try to find the actual label element
  if (element.id) {
    const labelElement = findLabelForElement(element.id, snapshot);
    if (labelElement) {
      return labelElement;
    }
  }

  // Search parent chain for label element
  let current: ElementData | undefined = element.parent;
  let depth = 0;
  while (current && depth < 5) {
    if (current.tag === 'label') {
      return current;
    }
    current = current.parent;
    depth++;
  }

  return null;
}

/**
 * Helper function to find an element by ID in snapshot
 */
function findElementById(id: string, snapshot: SnapshotData): ElementData | null {
  if (!snapshot.elements) {
    return null;
  }

  function searchInElements(elements: ElementData[]): ElementData | null {
    for (const el of elements) {
      if (el.id === id) {
        return el;
      }
      if (el.children) {
        const found = searchInElements(el.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  return searchInElements(snapshot.elements);
}

/**
 * Helper function to find a label element with 'for' attribute matching the given ID
 */
function findLabelForElement(elementId: string, snapshot: SnapshotData): ElementData | null {
  if (!snapshot.elements) {
    return null;
  }

  function searchLabels(elements: ElementData[]): ElementData | null {
    for (const el of elements) {
      if (el.tag === 'label') {
        const labelFor = el.attributes?.for || el.attributes?.htmlFor;
        if (labelFor === elementId) {
          return el;
        }
      }
      if (el.children) {
        const found = searchLabels(el.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  return searchLabels(snapshot.elements);
}
