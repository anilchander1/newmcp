# Cline Workflows for Selenium Test Generation

## Overview
Step-by-step workflows for using Chrome DevTools MCP to capture elements and generate TypeScript/Mocha/Selenium tests with Page Object Model.

---

## Workflow 1: Capture Page Elements with Chrome DevTools MCP

### Purpose
Capture interactive elements from a web page using Chrome DevTools MCP and extract robust selectors.

### Steps

#### Step 1: Navigate to Page
```
1. Use: mcp_chrome-devtools_navigate_page(type: "url", url: "TARGET_URL")
2. Wait for navigation to complete
3. Verify URL matches expected
```

#### Step 2: Wait for Page Load
```
1. Use: mcp_chrome-devtools_wait_for(text: "Key page element text")
2. Wait ensures page is fully loaded before capturing
3. Alternative: Wait for specific element to appear
```

#### Step 3: Take Verbose Snapshot
```
1. Use: mcp_chrome-devtools_take_snapshot(verbose: true)
2. CRITICAL: Always use verbose=true for detailed attributes
3. Save snapshot data for processing
```

#### Step 4: Extract Interactive Elements
For each element in snapshot, check:
- Tag: input, button, a, select, textarea
- Role: textbox, button, link, menuitem, tab
- Attributes: type, onclick, href

Extract ALL attributes:
- id, name, class, type, role
- data-testid, data-cy, data-test, data-*
- aria-label, aria-labelledby, aria-*
- placeholder, value, href
- Any custom attributes

#### Step 5: Generate Selector Arrays
For each interactive element:

1. **Check for Test IDs** (Priority 1)
   - If `data-testid` exists: `[data-testid="value"]`
   - If `data-cy` exists: `[data-cy="value"]`
   - If `data-test` exists: `[data-test="value"]`

2. **Check for Stable ID** (Priority 2)
   - If `id` exists and is stable (not dynamic):
     - Validate: No timestamps, hashes, random patterns
     - If stable: `#id`

3. **Check for Name** (Priority 3)
   - If `name` exists: `[name="value"]`
   - Combined: `tag[name="value"]`

4. **Check for Aria** (Priority 4)
   - If `aria-label` exists: `[aria-label="value"]`
   - If `aria-labelledby` exists: `[aria-labelledby="value"]`

5. **Check for Type** (Priority 5)
   - If `type` exists: `[type="value"]`
   - Combined: `tag[type="value"]`
   - Multiple: `tag[name="..."][type="..."]`

6. **Check for Placeholder** (Priority 6)
   - If `placeholder` exists: `[placeholder="value"]`
   - Combined: `tag[placeholder="value"]`

7. **Check for Stable Classes** (Priority 7)
   - Filter out dynamic/hashed classes
   - Use semantic classes only
   - Prefer combined: `.class1.class2.class3`

8. **Generate XPath Fallbacks** (Priority 8)
   - By ID: `//tag[@id="value"]`
   - By name: `//tag[@name="value"]`
   - By text: `//tag[contains(text(), "text")]`
   - By attribute: `//tag[@attribute="value"]`

#### Step 6: Validate Selectors
- Ensure 3-5 selectors per element
- Verify stability (no dynamic patterns)
- Include both CSS and XPath
- Order by priority (most stable first)

#### Step 7: Save Captured Data
Save to JSON format:
```json
{
  "url": "page-url",
  "timestamp": "ISO timestamp",
  "elements": [
    {
      "tag": "input",
      "text": "Username",
      "attributes": {...},
      "selectors": {
        "css": ["selector1", "selector2"],
        "xpath": "//xpath"
      }
    }
  ]
}
```

### Output
- Captured elements with selector arrays
- Ready for Page Object generation

---

## Workflow 2: Generate Page Object from Captured Elements

### Purpose
Create a TypeScript Page Object class extending BasePage with multi-selector fallback.

### Steps

#### Step 1: Analyze Captured Elements
Review captured data:
- Identify page name from URL or context
- Group related elements (form fields, buttons, links)
- Note element purposes (username input, login button, etc.)

#### Step 2: Create Class Structure
```typescript
import { WebDriver } from 'selenium-webdriver';
import { BasePage } from './BasePage';

export class PageName extends BasePage {
  // Selector arrays will go here
  
  constructor(driver: WebDriver) {
    super(driver);
  }
  
  // Action methods will go here
}
```

#### Step 3: Add Selector Arrays
For each captured element:
```typescript
private readonly elementNameSelectors = [
  'selector1',  // Primary (most stable)
  'selector2',  // Fallback 1
  'selector3',  // Fallback 2
  '//xpath'     // XPath fallback
];
```

**Naming convention:**
- Form inputs: `fieldNameSelectors` (e.g., `usernameSelectors`)
- Buttons: `buttonNameSelectors` (e.g., `loginButtonSelectors`)
- Links: `linkNameSelectors` (e.g., `pimMenuSelectors`)
- Headings: `headingNameSelectors` (e.g., `pageHeadingSelectors`)

#### Step 4: Implement Action Methods
For form inputs:
```typescript
async enterFieldName(value: string): Promise<void> {
  await this.fillWithFallback(this.fieldNameSelectors, value);
}
```

For buttons/links:
```typescript
async clickButtonName(): Promise<void> {
  await this.clickWithFallback(this.buttonNameSelectors);
}
```

For navigation with wait:
```typescript
async clickAndNavigate(selectors: string[], expectedUrlPattern: string): Promise<void> {
  await this.clickWithFallback(selectors);
  await this.driver.wait(
    async () => {
      const url = await this.driver.getCurrentUrl();
      return url.includes(expectedUrlPattern);
    },
    10000,
    `Did not navigate to ${expectedUrlPattern}`
  );
}
```

#### Step 5: Implement Verification Methods
```typescript
async isPageLoaded(): Promise<boolean> {
  try {
    await this.findElementWithFallback(this.pageHeadingSelectors, 5000);
    return true;
  } catch {
    return false;
  }
}
```

#### Step 6: Add Composite Methods
For common flows:
```typescript
async fillForm(field1: string, field2: string): Promise<void> {
  await this.enterField1(field1);
  await this.enterField2(field2);
}

async performAction(value: string): Promise<void> {
  await this.enterField(value);
  await this.clickSubmit();
  // Wait for navigation
  await this.driver.wait(
    async () => {
      const url = await this.driver.getCurrentUrl();
      return url.includes('expected-page');
    },
    10000
  );
}
```

#### Step 7: Handle Optional Elements
```typescript
async fillOptionalField(value: string): Promise<void> {
  try {
    await this.fillWithFallback(this.optionalFieldSelectors, value);
  } catch (error) {
    console.log('Optional field not found, skipping...');
    // Don't fail the test
  }
}
```

#### Step 8: Save File
- Save to `src/pages/PageName.ts`
- Follow existing naming conventions
- Export the class

### Output
- Complete Page Object class
- Ready for use in tests

---

## Workflow 3: Create Test Case Using Page Objects

### Purpose
Create a Mocha test case that uses Page Objects to test a user flow.

### Steps

#### Step 1: Set Up Test Structure
```typescript
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { initializeDriver, quitDriver } from '../utils/driver';
import { PageObject1 } from '../pages/PageObject1';
import { PageObject2 } from '../pages/PageObject2';
import { generateTestData } from '../utils/test-data';

describe('Feature Name', function() {
  this.timeout(60000); // Set appropriate timeout
  
  let page1: PageObject1;
  let page2: PageObject2;
  
  before(async function() {
    const driver = await initializeDriver();
    page1 = new PageObject1(driver);
    page2 = new PageObject2(driver);
  });
  
  after(async function() {
    await quitDriver();
  });
  
  // Tests go here
});
```

#### Step 2: Write Test Steps
```typescript
it('should complete user flow', async function() {
  // Step 1: Navigate
  await page1.navigateTo(BASE_URL);
  
  // Step 2: Verify page loaded
  const isLoaded = await page1.isPageLoaded();
  expect(isLoaded).to.be.true;
  
  // Step 3: Perform actions
  await page1.enterField('value');
  await page1.clickButton();
  
  // Step 4: Verify navigation
  const isNextPageLoaded = await page2.isPageLoaded();
  expect(isNextPageLoaded).to.be.true;
  
  // Step 5: Continue flow
  await page2.fillForm('value1', 'value2');
  await page2.submit();
  
  // Step 6: Final verification
  // Add assertions as needed
});
```

#### Step 3: Use Generated Test Data
```typescript
it('should handle form submission', async function() {
  const testData = generateTestData();
  
  await page.fillForm(
    testData.field1,
    testData.field2,
    testData.field3
  );
  
  await page.submit();
  
  // Verify success
});
```

#### Step 4: Add Error Handling
```typescript
it('should handle optional fields', async function() {
  try {
    await page.fillOptionalField('value');
  } catch (error) {
    // Optional field might not exist, continue
    console.log('Optional field skipped');
  }
  
  await page.submit();
  // Test continues even if optional field fails
});
```

#### Step 5: Add Multiple Test Cases
```typescript
describe('Feature Name', function() {
  // ... setup ...
  
  it('should perform basic action', async function() {
    // Basic test
  });
  
  it('should handle edge case', async function() {
    // Edge case test
  });
  
  it('should complete full flow', async function() {
    // End-to-end test
  });
});
```

#### Step 6: Save Test File
- Save to `src/tests/feature-name.spec.ts`
- Follow naming conventions
- Ensure all imports are correct

### Output
- Complete test file
- Ready to run with `npm test`

---

## Workflow 4: Debug Selector Failures

### Purpose
When tests fail due to selector issues, systematically debug and fix them.

### Steps

#### Step 1: Analyze Error Message
Read the error message carefully:
```
Error: All selectors failed:
input[name="username"]: TimeoutError: Element not found
input[type="text"]: TimeoutError: Element not found
//input[@name="username"]: TimeoutError: Element not found
```

**Information extracted:**
- Which selectors were tried
- Why they failed (usually timeout)
- All attempted selectors

#### Step 2: Take Fresh MCP Snapshot
```
1. Navigate to the page where failure occurred
2. Use: mcp_chrome-devtools_take_snapshot(verbose: true)
3. Verify page is in expected state
4. Check if element still exists
```

#### Step 3: Compare Current vs Expected
- Check if element attributes changed
- Verify element is visible (not hidden)
- Check if element is in iframe
- Verify page state matches expectations

#### Step 4: Identify Alternative Selectors
From fresh snapshot:
1. Look for test IDs: `data-testid`, `data-cy`
2. Check for aria attributes: `aria-label`, `aria-labelledby`
3. Find unique class combinations
4. Look for parent/child relationships
5. Check for text content for XPath

#### Step 5: Generate New Selectors
Using enhanced selector generator:
- Prioritize test IDs if found
- Use stable attributes
- Include XPath alternatives
- Validate stability

#### Step 6: Update Page Object
Add new selectors to the array:
```typescript
// Before (failing)
private readonly usernameSelectors = [
  'input[name="username"]',
  'input[type="text"]'
];

// After (with new options)
private readonly usernameSelectors = [
  '[data-testid="username"]',        // New: Test ID
  'input[name="username"]',           // Keep old
  '[aria-label="Username"]',         // New: Aria
  'input[type="text"]',               // Keep old
  '//input[@data-testid="username"]'  // New: XPath
];
```

**Important:** Keep old selectors as fallbacks, add new ones at higher priority.

#### Step 7: Test the Fix
```bash
npm test -- src/tests/feature-name.spec.ts
```

#### Step 8: Verify All Selectors Work
If test passes, verify:
- All selectors in array are valid
- At least one selector is stable
- XPath fallback exists
- Error messages are clear

### Output
- Updated Page Object with working selectors
- Test passing
- Improved selector robustness

---

## Workflow 5: Enhance Existing Page Object

### Purpose
Improve an existing Page Object by adding better selectors, methods, or error handling.

### Steps

#### Step 1: Review Current Implementation
- Read existing Page Object file
- Identify missing selectors
- Note any hardcoded values
- Check error handling

#### Step 2: Capture Current Page State
```
1. Navigate to page
2. Take verbose MCP snapshot
3. Extract all interactive elements
4. Compare with existing selectors
```

#### Step 3: Identify Improvements
- Missing test IDs? Add them
- Unstable selectors? Replace with stable ones
- Missing XPath fallbacks? Add them
- No error handling? Add try-catch
- Missing verification methods? Add them

#### Step 4: Generate Enhanced Selectors
Use enhanced selector generator:
- Prioritize test IDs
- Validate stability
- Include aria attributes
- Add XPath fallbacks

#### Step 5: Update Selector Arrays
```typescript
// Enhance existing arrays
private readonly buttonSelectors = [
  '[data-testid="submit-btn"]',      // NEW: Test ID (highest priority)
  ...this.buttonSelectors,            // Keep existing
  '//button[@aria-label="Submit"]'   // NEW: Aria XPath
];
```

#### Step 6: Add Missing Methods
- Verification methods
- Composite action methods
- Optional field handlers
- Navigation helpers

#### Step 7: Improve Error Handling
```typescript
// Before
async clickButton(): Promise<void> {
  await this.clickWithFallback(this.buttonSelectors);
}

// After
async clickButton(): Promise<void> {
  try {
    await this.clickWithFallback(this.buttonSelectors);
    // Wait for navigation if expected
    await this.driver.wait(
      async () => {
        const url = await this.driver.getCurrentUrl();
        return url.includes('expected-page');
      },
      10000
    );
  } catch (error) {
    console.error('Failed to click button:', error);
    throw error;
  }
}
```

#### Step 8: Test Enhancements
Run tests to verify:
- Existing tests still pass
- New selectors work
- Error handling improves reliability

### Output
- Enhanced Page Object
- Better selector coverage
- Improved reliability

---

## Workflow 6: Generate Complete Test Suite for New Feature

### Purpose
End-to-end workflow to create a complete test suite for a new feature from scratch.

### Steps

#### Phase 1: Planning (Use GPT-4.1 in Planning Mode)
1. **Analyze Feature**
   - Understand user flow
   - Identify pages involved
   - List required interactions
   - Note edge cases

2. **Design Test Strategy**
   - Map user journey
   - Identify test scenarios
   - Plan Page Objects needed
   - Define test data requirements

#### Phase 2: Capture Elements (Use Chrome DevTools MCP)
For each page in the flow:

1. Navigate to page
2. Wait for load
3. Take verbose snapshot
4. Extract interactive elements
5. Generate selector arrays
6. Save captured data

#### Phase 3: Generate Page Objects (Use Grok 4 Fast Coder in Coding Mode)
For each page:

1. Create Page Object class
2. Add selector arrays from captured data
3. Implement action methods
4. Add verification methods
5. Handle optional elements
6. Test Page Object works

#### Phase 4: Create Test Cases (Use Grok 4 Fast Coder in Coding Mode)
1. Set up test structure
2. Write test scenarios
3. Use Page Objects
4. Add assertions
5. Handle errors
6. Generate test data

#### Phase 5: Refinement (Use GPT-4o in Coding Mode)
1. Review generated code
2. Fix any issues
3. Improve error handling
4. Optimize selectors
5. Add missing edge cases

#### Phase 6: Testing and Debugging
1. Run tests: `npm test`
2. Fix selector failures (Workflow 4)
3. Verify all scenarios pass
4. Check error messages
5. Optimize timeouts if needed

#### Phase 7: Documentation
1. Add comments to Page Objects
2. Document test scenarios
3. Update README if needed
4. Note any special handling

### Output
- Complete test suite
- All Page Objects
- All test cases
- Documentation

---

## Workflow 7: Quick Selector Update

### Purpose
Quickly update selectors when page structure changes slightly.

### Steps

#### Step 1: Identify Failing Selector
- Check test error message
- Note which selector failed
- Identify the element

#### Step 2: Quick MCP Check
```
1. Navigate to page
2. Take snapshot: mcp_chrome-devtools_take_snapshot(verbose: true)
3. Find the element in snapshot
4. Check current attributes
```

#### Step 3: Generate Quick Fix
- If attribute changed: Update selector with new value
- If new attribute available: Add to selector array
- If element moved: Update XPath if needed

#### Step 4: Update Selector Array
```typescript
// Quick update - add new selector at top
private readonly elementSelectors = [
  'new-selector',        // NEW: Add at top
  ...this.elementSelectors  // Keep existing as fallbacks
];
```

#### Step 5: Quick Test
```bash
npm test -- src/tests/specific-test.spec.ts
```

### Output
- Updated selector
- Test passing
- Minimal code change

---

## Workflow 8: Validate Selector Stability

### Purpose
Before using selectors, validate they are stable and won't break easily.

### Steps

#### Step 1: Check ID Selectors
```typescript
// Reject if matches these patterns:
- Pure numbers: /^\d+$/
- Long hex: /[a-f0-9]{32,}/i
- Timestamps: /timestamp|random|temp/i
- Pattern: /^[a-z]+-\d+$/

// Accept if:
- Semantic: "username", "login-button"
- Short and meaningful
```

#### Step 2: Check Class Selectors
```typescript
// Reject if matches:
- Long alphanumeric: /^[a-z0-9]{10,}$/i
- CSS modules: /^css-[a-z0-9]+$/i
- Hashed: /^[a-z]+-[a-f0-9]{8,}$/i

// Accept if:
- Semantic: "btn-primary", "form-control"
- Framework: "oxd-*", "ant-*", "mui-*"
- Combined: ".class1.class2.class3"
```

#### Step 3: Prioritize Stable Attributes
Order of preference:
1. data-testid, data-cy (test IDs)
2. name (form elements)
3. aria-label (accessibility)
4. type (inputs)
5. Stable classes

#### Step 4: Generate Validation Report
For each selector:
- Stability rating: high/medium/low
- Reason for rating
- Recommendation: use/avoid

### Output
- Validated selectors
- Stability ratings
- Recommendations

---

## Quick Reference: Common Tasks

### Add New Selector to Existing Array
```typescript
private readonly selectors = [
  'new-selector',     // Add at top (highest priority)
  ...this.selectors   // Keep existing
];
```

### Create New Page Object
1. Copy template from existing Page Object
2. Update class name
3. Add selector arrays from MCP capture
4. Implement action methods
5. Add verification methods

### Fix Failing Test
1. Read error message
2. Take fresh MCP snapshot
3. Find alternative selectors
4. Update selector array
5. Test and verify

### Generate Test Data
```typescript
import { generateEmployeeData } from '../utils/test-data';
const data = generateEmployeeData();
// Use: data.firstName, data.lastName, etc.
```

---

## Troubleshooting Guide

### Issue: All Selectors Fail
**Solution:**
1. Take fresh MCP snapshot
2. Verify element exists
3. Check if element is in iframe
4. Verify page state
5. Generate new selectors

### Issue: Selectors Work Intermittently
**Solution:**
1. Add explicit waits
2. Use URL-based waits after navigation
3. Increase timeout
4. Check for dynamic content

### Issue: Element Not Found
**Solution:**
1. Verify element is visible (not hidden)
2. Check if element loads after delay
3. Add wait for element
4. Check if selector is correct

### Issue: Test Times Out
**Solution:**
1. Reduce number of selectors (max 5)
2. Increase timeout per selector
3. Check for infinite waits
4. Verify page loads correctly

---

## Best Practices Summary

1. **Always use verbose MCP snapshots** - `verbose: true` is mandatory
2. **Extract ALL attributes** (not just common ones) - Include aria, data-*, custom
3. **Generate 3-5 selectors per element** - Never use single selector
4. **Prioritize test IDs** (data-testid, data-cy) - Highest priority
5. **Validate selector stability** - Reject dynamic patterns
6. **Include XPath fallbacks** - Always have XPath option
7. **Use BasePage methods** (never direct driver access) - Consistency is key
8. **Add URL-based waits** after navigation - More reliable than timeouts
9. **Handle optional elements** gracefully - Try-catch, don't fail test
10. **Test incrementally** and fix as you go - Don't wait until end
11. **Keep old selectors** when adding new ones - Maintain fallback chain
12. **Take fresh snapshots** before each interaction - UIDs are ephemeral
13. **Minimum 2 seconds per selector** - Timeout calculation in fallback
14. **Never use CSS :contains()** - Use XPath contains() instead

---

## Model Selection Quick Guide

- **Planning**: GPT-4.1 (architecture, design)
- **Generation**: Grok 4 Fast Coder (Page Objects, tests)
- **Debugging**: GPT-4o (complex issues, refinement)
- **Quick fixes**: GPT-3.5 (simple updates)
