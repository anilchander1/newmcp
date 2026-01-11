/**
 * Locator Validation Helper Script
 * Automates validation of generated locators during MCP-to-locator workflow
 * Can be run as a standalone script or integrated into the workflow
 */

import { generateLocators, GeneratedLocators, LocatorGenerationOptions } from './locator-generator';
import { 
  validateLocators, 
  generateValidationReport, 
  hasValidSelectors,
  LocatorValidationReport 
} from './locator-validator';
import { ElementData, SnapshotData } from './component-detector';

export interface ValidationWorkflowOptions {
  minValidSelectors?: number; // Minimum valid selectors required (default: 2)
  requireCSS?: boolean; // Require at least one CSS selector
  requireXPath?: boolean; // Require at least one XPath selector
  autoRetry?: boolean; // Automatically retry with fresh snapshot if all fail
  verbose?: boolean; // Print detailed reports
}

export interface ValidationWorkflowResult {
  success: boolean;
  elementUid?: string;
  elementTag?: string;
  generatedLocators: GeneratedLocators;
  validationReport: LocatorValidationReport;
  needsRetry: boolean;
  recommendations: string[];
}

/**
 * Complete workflow: Generate locators and validate them
 */
export async function generateAndValidateLocators(
  targetElement: ElementData,
  snapshot: SnapshotData,
  options: LocatorGenerationOptions & ValidationWorkflowOptions = {}
): Promise<ValidationWorkflowResult> {
  const {
    minValidSelectors = 2,
    requireCSS = true,
    requireXPath = true,
    autoRetry = false,
    verbose = true,
    ...locatorOptions
  } = options;

  // Generate locators
  const generatedLocators = generateLocators(targetElement, snapshot, locatorOptions);

  // Validate locators
  const validationReport = validateLocators(targetElement, generatedLocators, snapshot);

  // Check if validation passes
  const hasMinSelectors = validationReport.validSelectors >= minValidSelectors;
  const hasCSS = !requireCSS || generatedLocators.selectors.some(s => !s.startsWith('//'));
  const hasXPath = !requireXPath || generatedLocators.selectors.some(s => s.startsWith('//'));

  const success = hasMinSelectors && hasCSS && hasXPath;
  const needsRetry = !success && autoRetry;

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (!hasMinSelectors) {
    recommendations.push(`Need at least ${minValidSelectors} valid selectors, but only ${validationReport.validSelectors} are valid.`);
  }
  
  if (requireCSS && !hasCSS) {
    recommendations.push('No valid CSS selectors found. Add CSS selector options.');
  }
  
  if (requireXPath && !hasXPath) {
    recommendations.push('No valid XPath selectors found. Add XPath fallback options.');
  }

  // Add validation report recommendations
  recommendations.push(...validationReport.recommendations);

  // Print report if verbose
  if (verbose) {
    console.log(generateValidationReport(targetElement, generatedLocators, snapshot));
  }

  return {
    success,
    elementUid: targetElement.uid || targetElement['_uid'],
    elementTag: targetElement.tag,
    generatedLocators,
    validationReport,
    needsRetry,
    recommendations
  };
}

/**
 * Batch validate multiple elements
 */
export async function batchValidateLocators(
  elements: Array<{ element: ElementData; snapshot: SnapshotData }>,
  options: LocatorGenerationOptions & ValidationWorkflowOptions = {}
): Promise<ValidationWorkflowResult[]> {
  const results: ValidationWorkflowResult[] = [];

  for (const { element, snapshot } of elements) {
    const result = await generateAndValidateLocators(element, snapshot, options);
    results.push(result);
  }

  return results;
}

/**
 * Generate summary report for batch validation
 */
export function generateBatchReport(results: ValidationWorkflowResult[]): string {
  const total = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const needsRetry = results.filter(r => r.needsRetry).length;

  let output = `\n=== Batch Validation Summary ===\n\n`;
  output += `Total Elements: ${total}\n`;
  output += `Successful: ${successful} (${Math.round(successful / total * 100)}%)\n`;
  output += `Failed: ${failed} (${Math.round(failed / total * 100)}%)\n`;
  output += `Need Retry: ${needsRetry}\n\n`;

  if (failed > 0) {
    output += `--- Failed Elements ---\n`;
    for (const result of results.filter(r => !r.success)) {
      output += `✗ ${result.elementTag || 'unknown'} (UID: ${result.elementUid || 'N/A'})\n`;
      output += `  Valid Selectors: ${result.validationReport.validSelectors}/${result.validationReport.totalSelectors}\n`;
      if (result.recommendations.length > 0) {
        output += `  Top Recommendation: ${result.recommendations[0]}\n`;
      }
      output += `\n`;
    }
  }

  return output;
}

/**
 * Interactive validation workflow
 * Prompts for fixes and retries validation
 */
export async function interactiveValidationWorkflow(
  targetElement: ElementData,
  snapshot: SnapshotData,
  options: LocatorGenerationOptions & ValidationWorkflowOptions = {}
): Promise<ValidationWorkflowResult> {
  let result = await generateAndValidateLocators(targetElement, snapshot, { ...options, verbose: true });

  // If validation failed, provide interactive options
  if (!result.success) {
    console.log('\n=== Validation Failed ===\n');
    console.log('Recommendations:');
    result.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });

    console.log('\nOptions:');
    console.log('1. Take fresh MCP snapshot and retry');
    console.log('2. Manually fix selectors');
    console.log('3. Continue anyway (not recommended)');
    console.log('4. Skip this element');

    // In a real implementation, you would read user input here
    // For now, return the result with needsRetry flag
  }

  return result;
}

/**
 * Quick validation check - returns true/false only
 */
export function quickValidate(
  targetElement: ElementData,
  snapshot: SnapshotData,
  minValidSelectors: number = 2
): boolean {
  const generatedLocators = generateLocators(targetElement, snapshot);
  return hasValidSelectors(targetElement, generatedLocators, snapshot) &&
         validateLocators(targetElement, generatedLocators, snapshot).validSelectors >= minValidSelectors;
}

/**
 * Export validation results to JSON for analysis
 */
export function exportValidationResults(
  results: ValidationWorkflowResult[]
): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    totalElements: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results: results.map(r => ({
      elementUid: r.elementUid,
      elementTag: r.elementTag,
      success: r.success,
      validSelectors: r.validationReport.validSelectors,
      totalSelectors: r.validationReport.totalSelectors,
      componentFramework: r.generatedLocators.componentFramework,
      recommendations: r.recommendations,
      selectors: r.generatedLocators.selectors.map((sel, idx) => ({
        selector: sel,
        isValid: r.validationReport.results[idx]?.isValid || false,
        reason: r.validationReport.results[idx]?.reason || 'unknown'
      }))
    }))
  }, null, 2);
}
