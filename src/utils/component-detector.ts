/**
 * Component Detection Utility
 * Detects Oracle component frameworks (Spectra, JET, Redwood) from element data
 */

export interface ElementData {
  tag?: string;
  id?: string;
  class?: string;
  attributes?: Record<string, string>;
  parent?: ElementData;
  children?: ElementData[];
  [key: string]: any;
}

export type ComponentFramework = 'spectra' | 'jet' | 'redwood' | 'html';

/**
 * Detects the component framework for an element
 * Priority: Spectra > JET > Redwood > HTML
 */
export function detectComponentFramework(element: ElementData): ComponentFramework {
  if (isSpectraComponent(element)) {
    return 'spectra';
  }
  if (isJETComponent(element)) {
    return 'jet';
  }
  if (isRedwoodComponent(element)) {
    return 'redwood';
  }
  return 'html';
}

/**
 * Checks if element is a Spectra component
 * Spectra components can have:
 * - sp-* prefix in classes, attributes, or IDs
 * - oj-spectra-* classes
 * - spectra-* classes/attributes
 * - data-spectra-* attributes
 */
export function isSpectraComponent(element: ElementData): boolean {
  // Check element itself
  if (hasSpectraIndicators(element)) {
    return true;
  }

  // Check parent chain (up to 5 levels)
  let current: ElementData | undefined = element.parent;
  let depth = 0;
  while (current && depth < 5) {
    if (hasSpectraIndicators(current)) {
      return true;
    }
    current = current.parent;
    depth++;
  }

  return false;
}

/**
 * Checks for Spectra component indicators in an element
 */
function hasSpectraIndicators(element: ElementData): boolean {
  // Check sp-* prefix in ID
  if (element.id && /^sp-/.test(element.id)) {
    return true;
  }

  // Check sp-* prefix in classes
  if (element.class) {
    const classes = element.class.split(/\s+/);
    if (classes.some(cls => /^sp-/.test(cls))) {
      return true;
    }
    if (classes.some(cls => /^oj-spectra-/.test(cls))) {
      return true;
    }
    if (classes.some(cls => /^spectra-/.test(cls))) {
      return true;
    }
  }

  // Check attributes
  if (element.attributes) {
    // Check for sp-* prefixed attributes
    if (Object.keys(element.attributes).some(key => /^sp-/.test(key))) {
      return true;
    }
    // Check for data-spectra-* attributes
    if (Object.keys(element.attributes).some(key => /^data-spectra-/.test(key))) {
      return true;
    }
    // Check attribute values with sp-* prefix
    if (Object.values(element.attributes).some(value => typeof value === 'string' && /^sp-/.test(value))) {
      return true;
    }
  }

  // Check tag name for sp-* prefix
  if (element.tag && /^sp-/.test(element.tag)) {
    return true;
  }

  return false;
}

/**
 * Checks if element is a JET component
 * JET components have:
 * - oj-* classes (e.g., oj-inputtext, oj-button)
 * - data-oj-* attributes
 */
export function isJETComponent(element: ElementData): boolean {
  // Check element itself
  if (hasJETIndicators(element)) {
    return true;
  }

  // Check parent chain (up to 5 levels)
  let current: ElementData | undefined = element.parent;
  let depth = 0;
  while (current && depth < 5) {
    if (hasJETIndicators(current)) {
      return true;
    }
    current = current.parent;
    depth++;
  }

  return false;
}

/**
 * Checks for JET component indicators in an element
 */
function hasJETIndicators(element: ElementData): boolean {
  // Check oj-* classes (but not oj-spectra-* which is Spectra)
  if (element.class) {
    const classes = element.class.split(/\s+/);
    if (classes.some(cls => /^oj-/.test(cls) && !/^oj-spectra-/.test(cls) && !/^oj-redwood-/.test(cls))) {
      return true;
    }
  }

  // Check data-oj-* attributes
  if (element.attributes) {
    if (Object.keys(element.attributes).some(key => /^data-oj-/.test(key))) {
      return true;
    }
  }

  // Check tag name for oj-* prefix
  if (element.tag && /^oj-/.test(element.tag) && !/^oj-spectra-/.test(element.tag) && !/^oj-redwood-/.test(element.tag)) {
    return true;
  }

  return false;
}

/**
 * Checks if element is a Redwood component
 * Redwood components have:
 * - oj-redwood-* classes
 * - redwood-* classes/attributes
 */
export function isRedwoodComponent(element: ElementData): boolean {
  // Check element itself
  if (hasRedwoodIndicators(element)) {
    return true;
  }

  // Check parent chain (up to 5 levels)
  let current: ElementData | undefined = element.parent;
  let depth = 0;
  while (current && depth < 5) {
    if (hasRedwoodIndicators(current)) {
      return true;
    }
    current = current.parent;
    depth++;
  }

  return false;
}

/**
 * Checks for Redwood component indicators in an element
 */
function hasRedwoodIndicators(element: ElementData): boolean {
  // Check oj-redwood-* classes
  if (element.class) {
    const classes = element.class.split(/\s+/);
    if (classes.some(cls => /^oj-redwood-/.test(cls))) {
      return true;
    }
    if (classes.some(cls => /^redwood-/.test(cls))) {
      return true;
    }
  }

  // Check attributes
  if (element.attributes) {
    if (Object.keys(element.attributes).some(key => /^redwood-/.test(key))) {
      return true;
    }
    if (Object.values(element.attributes).some(value => typeof value === 'string' && /redwood/.test(value))) {
      return true;
    }
  }

  return false;
}
