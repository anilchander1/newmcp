/**
 * Locator Validation Utility
 * Validates generated selectors against MCP snapshot data
 * Tests selectors to ensure they will work in Selenium
 */

import { ElementData, SnapshotData } from './component-detector';
import { GeneratedLocators } from './locator-generator';

export interface ValidationResult {
  selector: string;
  isValid: boolean;
  reason: string;
  elementFound: boolean;
  matchesTargetElement: boolean;
  suggestion?: string;
}

export interface LocatorValidationReport {
  elementUid?: string;
  elementTag?: string;
  totalSelectors: number;
  validSelectors: number;
  invalidSelectors: number;
  results: ValidationResult[];
  recommendations: string[];
  warnings: string[];
}

/**
 * Validates generated locators against MCP snapshot
 * Tests each selector to ensure it matches the target element
 */
export function validateLocators(
  targetElement: ElementData,
  generatedLocators: GeneratedLocators,
  snapshot: SnapshotData
): LocatorValidationReport {
  const results: ValidationResult[] = [];
  const recommendations: string[] = [];
  const warnings: string[] = [];

  // Validate each selector
  for (const selector of generatedLocators.selectors) {
    const result = validateSelector(selector, targetElement, snapshot);
    results.push(result);

    if (!result.isValid && result.suggestion) {
      recommendations.push(result.suggestion);
    }
  }

  const validSelectors = results.filter(r => r.isValid).length;
  const invalidSelectors = results.filter(r => !r.isValid).length;

  // Generate overall recommendations
  if (invalidSelectors === generatedLocators.selectors.length) {
    recommendations.push('ALL selectors failed validation. Take fresh MCP snapshot and regenerate locators.');
    recommendations.push('Verify element still exists and attributes have not changed.');
  } else if (invalidSelectors > 0) {
    recommendations.push(`${invalidSelectors} selector(s) failed. Keep valid selectors, regenerate failed ones.`);
  }

  // Check for common issues
  if (!targetElement.id && !targetElement.attributes?.dataTestid && !targetElement.attributes?.['data-testid']) {
    warnings.push('Element has no stable ID or test ID. Consider adding data-testid attribute.');
  }

  if (!generatedLocators.componentFramework || generatedLocators.componentFramework === 'html') {
    warnings.push('Component framework not detected. Verify parent elements are captured in snapshot.');
  }

  if (!generatedLocators.textContent && !generatedLocators.labelText) {
    warnings.push('No text content found. Text-based XPath selectors may not work.');
  }

  return {
    elementUid: targetElement.uid || targetElement['_uid'],
    elementTag: targetElement.tag,
    totalSelectors: generatedLocators.selectors.length,
    validSelectors,
    invalidSelectors,
    results,
    recommendations,
    warnings
  };
}

/**
 * Validates a single selector against snapshot data
 */
function validateSelector(
  selector: string,
  targetElement: ElementData,
  snapshot: SnapshotData
): ValidationResult {
  // Check if selector is valid syntax
  if (!isValidSelectorSyntax(selector)) {
    return {
      selector,
      isValid: false,
      reason: 'Invalid selector syntax',
      elementFound: false,
      matchesTargetElement: false,
      suggestion: 'Fix selector syntax or use valid CSS/XPath'
    };
  }

  // Find matching elements in snapshot
  const matchingElements = findElementsBySelector(selector, snapshot);

  if (matchingElements.length === 0) {
    return {
      selector,
      isValid: false,
      reason: 'No elements found matching selector',
      elementFound: false,
      matchesTargetElement: false,
      suggestion: 'Selector does not match any element in snapshot. Verify attributes are correct.'
    };
  }

  if (matchingElements.length > 1) {
    return {
      selector,
      isValid: false,
      reason: `Multiple elements found (${matchingElements.length})`,
      elementFound: true,
      matchesTargetElement: false,
      suggestion: 'Selector is not unique. Add more specific attributes or use parent context.'
    };
  }

  // Check if the matching element is the target element
  const matchedElement = matchingElements[0];
  const isTargetElement = isSameElement(matchedElement, targetElement);

  if (!isTargetElement) {
    return {
      selector,
      isValid: false,
      reason: 'Selector matches different element',
      elementFound: true,
      matchesTargetElement: false,
      suggestion: 'Selector is too generic. Use more specific attributes or component-specific locators.'
    };
  }

  return {
    selector,
    isValid: true,
    reason: 'Selector matches target element',
    elementFound: true,
    matchesTargetElement: true
  };
}

/**
 * Checks if selector syntax is valid
 */
function isValidSelectorSyntax(selector: string): boolean {
  if (selector.startsWith('//')) {
    // XPath - basic validation
    return /^\/\/[^\s]+/.test(selector);
  } else {
    // CSS selector - basic validation
    // Check for invalid CSS features
    if (selector.includes(':contains(')) {
      return false; // :contains() is not valid CSS
    }
    // Basic CSS selector pattern
    return /^[#.\[]?[a-zA-Z0-9_-]+/.test(selector) || selector.startsWith('[');
  }
}

/**
 * Finds elements in snapshot matching the selector
 */
function findElementsBySelector(selector: string, snapshot: SnapshotData): ElementData[] {
  const elements: ElementData[] = [];

  if (!snapshot.elements) {
    return elements;
  }

  function searchElements(el: ElementData): void {
    if (matchesSelector(el, selector)) {
      elements.push(el);
    }

    if (el.children) {
      for (const child of el.children) {
        searchElements(child);
      }
    }
  }

  for (const element of snapshot.elements) {
    searchElements(element);
  }

  return elements;
}

/**
 * Checks if element matches the selector
 */
function matchesSelector(element: ElementData, selector: string): boolean {
  if (selector.startsWith('//')) {
    return matchesXPath(element, selector);
  } else {
    return matchesCSS(element, selector);
  }
}

/**
 * Checks if element matches CSS selector
 */
function matchesCSS(element: ElementData, selector: string): boolean {
  const attrs = element.attributes || {};

  // ID selector: #id
  if (selector.startsWith('#')) {
    const id = selector.substring(1);
    return element.id === id;
  }

  // Class selector: .class
  if (selector.startsWith('.')) {
    const classes = selector.substring(1).split('.');
    const elementClasses = (element.class || '').split(/\s+/);
    return classes.every(cls => elementClasses.includes(cls));
  }

  // Attribute selector: [attr="value"]
  const attrMatch = selector.match(/\[([^\]]+)\]/);
  if (attrMatch) {
    const attrExpr = attrMatch[1];
    const [attrName, attrValue] = attrExpr.split('=').map(s => s.trim().replace(/["']/g, ''));
    
    if (attrValue) {
      // Exact match: [attr="value"]
      const elementValue = attrs[attrName] || attrs[attrName.replace(/-/g, '')];
      return elementValue === attrValue;
    } else {
      // Existence: [attr]
      return attrs.hasOwnProperty(attrName) || attrs.hasOwnProperty(attrName.replace(/-/g, ''));
    }
  }

  // Tag selector: tag
  if (element.tag === selector) {
    return true;
  }

  // Combined: tag[attr="value"]
  const combinedMatch = selector.match(/^(\w+)\[(.+)\]$/);
  if (combinedMatch) {
    const [, tag, attrExpr] = combinedMatch;
    if (element.tag === tag) {
      const [attrName, attrValue] = attrExpr.split('=').map(s => s.trim().replace(/["']/g, ''));
      if (attrValue) {
        const elementValue = attrs[attrName] || attrs[attrName.replace(/-/g, '')];
        return elementValue === attrValue;
      } else {
        return attrs.hasOwnProperty(attrName) || attrs.hasOwnProperty(attrName.replace(/-/g, ''));
      }
    }
  }

  return false;
}

/**
 * Checks if element matches XPath selector (simplified)
 */
function matchesXPath(element: ElementData, xpath: string): boolean {
  const attrs = element.attributes || {};

  // Simple XPath patterns
  // //tag[@attr="value"]
  const attrMatch = xpath.match(/\/\/(\w+)\[@([^=]+)=["']([^"']+)["']\]/);
  if (attrMatch) {
    const [, tag, attrName, attrValue] = attrMatch;
    if (element.tag === tag || tag === '*') {
      const elementValue = attrs[attrName.trim()] || attrs[attrName.trim().replace(/-/g, '')];
      return elementValue === attrValue;
    }
  }

  // //tag[contains(text(), "value")]
  const textMatch = xpath.match(/\/\/(\w+)\[contains\(text\(\),\s*["']([^"']+)["']\)\]/);
  if (textMatch) {
    const [, tag, textValue] = textMatch;
    if (element.tag === tag || tag === '*') {
      const elementText = element.text || '';
      return elementText.includes(textValue);
    }
  }

  // //tag[normalize-space(text())="value"]
  const normalizeMatch = xpath.match(/\/\/(\w+)\[normalize-space\(text\(\)\)=["']([^"']+)["']\]/);
  if (normalizeMatch) {
    const [, tag, textValue] = normalizeMatch;
    if (element.tag === tag || tag === '*') {
      const elementText = (element.text || '').trim().replace(/\s+/g, ' ');
      return elementText === textValue;
    }
  }

  return false;
}

/**
 * Checks if two elements are the same
 */
function isSameElement(element1: ElementData, element2: ElementData): boolean {
  // Compare by UID if available
  if (element1.uid && element2.uid) {
    return element1.uid === element2.uid;
  }
  if (element1['_uid'] && element2['_uid']) {
    return element1['_uid'] === element2['_uid'];
  }

  // Compare by ID
  if (element1.id && element2.id) {
    return element1.id === element2.id;
  }

  // Compare by unique attributes
  const attrs1 = element1.attributes || {};
  const attrs2 = element2.attributes || {};

  // Check data-testid
  if (attrs1.dataTestid || attrs1['data-testid']) {
    const testId1 = attrs1.dataTestid || attrs1['data-testid'];
    const testId2 = attrs2.dataTestid || attrs2['data-testid'];
    if (testId1 && testId2) {
      return testId1 === testId2;
    }
  }

  // Compare by tag, name, and type
  if (element1.tag === element2.tag) {
    const name1 = attrs1.name;
    const name2 = attrs2.name;
    if (name1 && name2 && name1 === name2) {
      return true;
    }
  }

  return false;
}

/**
 * Validates locators and generates a detailed report
 */
export function generateValidationReport(
  targetElement: ElementData,
  generatedLocators: GeneratedLocators,
  snapshot: SnapshotData
): string {
  const report = validateLocators(targetElement, generatedLocators, snapshot);

  let output = `\n=== Locator Validation Report ===\n\n`;
  output += `Element: ${report.elementTag || 'unknown'} (UID: ${report.elementUid || 'N/A'})\n`;
  output += `Component Framework: ${generatedLocators.componentFramework}\n`;
  output += `Total Selectors: ${report.totalSelectors}\n`;
  output += `Valid: ${report.validSelectors} | Invalid: ${report.invalidSelectors}\n\n`;

  output += `--- Selector Results ---\n`;
  for (const result of report.results) {
    const status = result.isValid ? '✓' : '✗';
    output += `${status} ${result.selector}\n`;
    output += `   Reason: ${result.reason}\n`;
    if (result.suggestion) {
      output += `   Suggestion: ${result.suggestion}\n`;
    }
    output += `\n`;
  }

  if (report.warnings.length > 0) {
    output += `--- Warnings ---\n`;
    for (const warning of report.warnings) {
      output += `⚠ ${warning}\n`;
    }
    output += `\n`;
  }

  if (report.recommendations.length > 0) {
    output += `--- Recommendations ---\n`;
    for (const rec of report.recommendations) {
      output += `→ ${rec}\n`;
    }
    output += `\n`;
  }

  return output;
}

/**
 * Quick validation check - returns true if at least one selector is valid
 */
export function hasValidSelectors(
  targetElement: ElementData,
  generatedLocators: GeneratedLocators,
  snapshot: SnapshotData
): boolean {
  const report = validateLocators(targetElement, generatedLocators, snapshot);
  return report.validSelectors > 0;
}
