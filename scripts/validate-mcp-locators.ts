/**
 * Standalone Locator Validation Script
 * Run this after generating locators from MCP snapshots
 * 
 * Usage:
 *   ts-node scripts/validate-mcp-locators.ts <snapshot-file.json> [element-uid]
 * 
 * If element-uid is not provided, validates all interactive elements
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  generateAndValidateLocators,
  batchValidateLocators,
  generateBatchReport,
  exportValidationResults
} from '../src/utils/locator-validation-helper';
import { ElementData, SnapshotData } from '../src/utils/component-detector';

interface MCPSnapshot {
  elements?: ElementData[];
  url?: string;
  timestamp?: string;
  [key: string]: any;
}

/**
 * Find element by UID in snapshot
 */
function findElementByUid(snapshot: SnapshotData, uid: string): ElementData | null {
  if (!snapshot.elements) {
    return null;
  }

  function searchElements(el: ElementData): ElementData | null {
    if (el.uid === uid || el['_uid'] === uid) {
      return el;
    }

    if (el.children) {
      for (const child of el.children) {
        const found = searchElements(child);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  for (const element of snapshot.elements) {
    const found = searchElements(element);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Find all interactive elements in snapshot
 */
function findInteractiveElements(snapshot: SnapshotData): ElementData[] {
  const interactive: ElementData[] = [];

  if (!snapshot.elements) {
    return interactive;
  }

  function checkElement(el: ElementData): void {
    const tag = el.tag?.toLowerCase();
    const role = el.attributes?.role?.toLowerCase();
    const attrs = el.attributes || {};

    // Check if element is interactive
    const isInteractive = 
      tag === 'input' ||
      tag === 'button' ||
      tag === 'a' ||
      tag === 'select' ||
      tag === 'textarea' ||
      role === 'button' ||
      role === 'link' ||
      role === 'textbox' ||
      role === 'menuitem' ||
      role === 'tab' ||
      attrs.onclick ||
      attrs.href;

    if (isInteractive) {
      interactive.push(el);
    }

    // Recursively check children
    if (el.children) {
      for (const child of el.children) {
        checkElement(child);
      }
    }
  }

  for (const element of snapshot.elements) {
    checkElement(element);
  }

  return interactive;
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: ts-node validate-mcp-locators.ts <snapshot-file.json> [element-uid]');
    console.error('');
    console.error('Examples:');
    console.error('  # Validate all interactive elements');
    console.error('  ts-node validate-mcp-locators.ts snapshot.json');
    console.error('');
    console.error('  # Validate specific element');
    console.error('  ts-node validate-mcp-locators.ts snapshot.json element_123');
    process.exit(1);
  }

  const snapshotPath = args[0];
  const elementUid = args[1];

  // Load snapshot
  if (!fs.existsSync(snapshotPath)) {
    console.error(`Error: Snapshot file not found: ${snapshotPath}`);
    process.exit(1);
  }

  const snapshotData: MCPSnapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  const snapshot: SnapshotData = {
    elements: snapshotData.elements,
    url: snapshotData.url,
    timestamp: snapshotData.timestamp
  };

  console.log(`\nLoaded snapshot from: ${snapshotPath}`);
  if (snapshot.url) {
    console.log(`URL: ${snapshot.url}`);
  }
  if (snapshot.timestamp) {
    console.log(`Timestamp: ${snapshot.timestamp}`);
  }
  console.log('');

  // Validate specific element or all interactive elements
  if (elementUid) {
    // Validate single element
    const targetElement = findElementByUid(snapshot, elementUid);
    
    if (!targetElement) {
      console.error(`Error: Element with UID "${elementUid}" not found in snapshot`);
      process.exit(1);
    }

    console.log(`Validating element: ${targetElement.tag || 'unknown'} (UID: ${elementUid})\n`);

    const result = await generateAndValidateLocators(targetElement, snapshot, {
      minValidSelectors: 2,
      requireCSS: true,
      requireXPath: true,
      verbose: true
    });

    if (result.success) {
      console.log('\n✓ Validation PASSED - Locators are ready to use!');
      process.exit(0);
    } else {
      console.log('\n✗ Validation FAILED - Fix issues before using locators');
      process.exit(1);
    }
  } else {
    // Validate all interactive elements
    const interactiveElements = findInteractiveElements(snapshot);
    
    if (interactiveElements.length === 0) {
      console.log('No interactive elements found in snapshot');
      process.exit(0);
    }

    console.log(`Found ${interactiveElements.length} interactive elements\n`);

    const elementsToValidate = interactiveElements.map(el => ({
      element: el,
      snapshot
    }));

    const results = await batchValidateLocators(elementsToValidate, {
      minValidSelectors: 2,
      requireCSS: true,
      requireXPath: true,
      verbose: false
    });

    // Print summary
    console.log(generateBatchReport(results));

    // Export results to file
    const outputPath = snapshotPath.replace('.json', '-validation-results.json');
    fs.writeFileSync(outputPath, exportValidationResults(results));
    console.log(`\nDetailed results exported to: ${outputPath}`);

    // Exit with error code if any failed
    const failedCount = results.filter(r => !r.success).length;
    if (failedCount > 0) {
      console.log(`\n⚠ ${failedCount} element(s) failed validation`);
      process.exit(1);
    } else {
      console.log('\n✓ All elements passed validation!');
      process.exit(0);
    }
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
