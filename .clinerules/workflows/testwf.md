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
- **Component-specific attributes**: sp-*, data-spectra-*, data-oj-*, redwood-*

**Capture element hierarchy:**
- Note parent/child relationships
- Record parent elements (up to 5 levels)
- Capture children elements for deep text extraction

#### Step 4a: Detect Component Framework
For each element, determine component framework:

1. **Check for Spectra** (Highest Priority)
   - Look for `sp-*` prefix in: classes, attributes, IDs, tag names
   - Check for `oj-spectra-*` classes
   - Check for `spectra-*` classes/attributes
   - Check for `data-spectra-*` attributes
   - Traverse parent chain (up to 5 levels)

2. **Check for JET** (Medium Priority)
   - Look for `oj-*` classes (excluding `oj-spectra-*` and `oj-redwood-*`)
   - Check for `data-oj-*` attributes
   - Traverse parent chain (up to 5 levels)

3. **Check for Redwood** (Medium Priority)
   - Look for `oj-redwood-*` classes
   - Check for `redwood-*` classes/attributes
   - Traverse parent chain (up to 5 levels)

4. **Default to HTML** (Fallback)
   - If no component framework detected

#### Step 4b: Extract Deep Text, Labels, and Placeholders
For each element, extract nested text content:

1. **Extract Label Text** (in priority order):
   - Direct `aria-label` attribute
   - Follow `aria-labelledby` reference to find label text
   - Find associated `<label>` element via `for`/`id` relationship
   - Traverse parent chain (up to 5 levels) for `<label>` tags
   - Check sibling labels in parent's children

2. **Extract Placeholder Text** (in priority order):
   - Direct `placeholder` attribute on element
   - `aria-placeholder` attribute on element
   - Traverse parent chain (up to 3 levels) for placeholder in wrapper divs

3. **Extract Deep Text Content**:
   - Collect direct text content from element
   - Recursively traverse all child elements
   - Aggregate text from multiple `<span>` elements (see Step 4c)
   - Normalize whitespace (replace multiple spaces with single space)
   - Trim leading/trailing whitespace

#### Step 4c: Aggregate Span Text
For elements with text split across multiple spans:

1. **Collect all text nodes** from descendant elements
2. **Filter out hidden spans** (if display/visibility info available)
3. **Join text parts** with single space separator
4. **Normalize whitespace** - Replace multiple spaces/newlines with single space
5. **Store aggregated text** for use in XPath selectors

**Example:**
```
<span>Hello</span> <span>World</span> → "Hello World"
```

#### Step 5: Generate Selector Arrays
For each interactive element, generate selectors in this priority order:

1. **Test ID Attributes** (Priority 1)
   - If `data-testid` exists: `[data-testid="value"]`
   - If `data-cy` exists: `[data-cy="value"]`
   - If `data-test` exists: `[data-test="value"]`

2. **Component-Specific Attributes** (Priority 2)
   - **Spectra**: `[sp-*="value"]`, `[data-spectra-*="value"]`
   - **JET**: `[data-oj-*="value"]`
   - **Redwood**: `[redwood-*="value"]`

3. **Stable ID Selectors** (Priority 3)
   - If `id` exists and is stable (not dynamic):
     - Validate: No timestamps, hashes, random patterns
     - If stable: `#id`

4. **Name Attributes** (Priority 4)
   - If `name` exists: `[name="value"]`
   - Combined: `tag[name="value"]`

5. **Component-Specific Classes** (Priority 5)
   - **Spectra**: `.sp-*`, `.oj-spectra-*`
   - **JET**: `.oj-*` (excluding `oj-spectra-*` and `oj-redwood-*`)
   - **Redwood**: `.oj-redwood-*`
   - Prefer combined: `.class1.class2.class3`

6. **Aria Attributes** (Priority 6)
   - If `aria-label` exists: `[aria-label="value"]`
   - If `aria-labelledby` exists: `[aria-labelledby="value"]`
   - Use extracted label text for XPath: `//tag[@aria-label="extracted-label"]`

7. **Type Attributes** (Priority 7)
   - If `type` exists: `[type="value"]`
   - Combined: `tag[type="value"]`
   - Multiple: `tag[name="..."][type="..."]`

8. **Placeholder Attributes** (Priority 8)
   - If `placeholder` exists: `[placeholder="value"]`
   - Combined: `tag[placeholder="value"]`
   - Use extracted placeholder: `//tag[@placeholder="extracted-placeholder"]`

9. **Deep Text-Based XPath** (Priority 9)
   - Use aggregated span text: `//tag[normalize-space(text())="aggregated-text"]`
   - Use partial text: `//tag[contains(normalize-space(text()), "partial-text")]`
   - Use label text: `//tag[normalize-space(.)="label-text"]`
   - **Important**: Use `normalize-space()` to handle whitespace and span-split text

10. **Stable Class Selectors** (Priority 10)
    - Filter out dynamic/hashed classes
    - Use semantic classes only
    - Prefer combined: `.class1.class2.class3`

11. **XPath Fallbacks** (Priority 11)
    - By ID: `//tag[@id="value"]`
    - By name: `//tag[@name="value"]`
    - By text: `//tag[contains(normalize-space(text()), "text")]`
    - By attribute: `//tag[@attribute="value"]`
    - Component-specific: `//tag[@sp-*="value"]`, `//tag[@data-oj-*="value"]`

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

#### Step 8: Validate Generated Locators (AUTOMATED)
**CRITICAL STEP** - Always validate locators before using in code.

**Option 1: Automated Validation Script**
```bash
# Validate all interactive elements in snapshot
npm run validate-locators snapshot.json

# Or directly:
ts-node scripts/validate-mcp-locators.ts snapshot.json

# Validate specific element
ts-node scripts/validate-mcp-locators.ts snapshot.json element_123
```

**Option 2: Programmatic Validation**
```typescript
import { generateAndValidateLocators } from '../utils/locator-validation-helper';

const result = await generateAndValidateLocators(targetElement, snapshot, {
  minValidSelectors: 2,
  requireCSS: true,
  requireXPath: true,
  verbose: true
});

if (!result.success) {
  // Handle validation failure
  console.error('Validation failed:', result.recommendations);
  // DO NOT proceed to code generation
}
```

**Validation Requirements:**
- ✓ At least 2 valid selectors per element
- ✓ At least 1 CSS selector must be valid
- ✓ At least 1 XPath selector must be valid
- ✓ Component framework detected correctly

**If Validation Fails:**
1. Review validation report recommendations
2. Take fresh MCP snapshot if attributes changed
3. Verify element still exists in expected state
4. Regenerate locators with updated snapshot
5. Re-run validation until it passes

**DO NOT proceed to code generation until validation passes!**

### Output
- Captured elements with selector arrays
- Validation report for each element
- Ready for Page Object generation (only if validation passes)

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

## Workflow 7: Generate Complete Test from URL and Navigation Instructions

### Purpose
Generate a complete test suite by providing only:
- Base URL
- Navigation instructions (steps to reach target pages)
- Test scenarios/actions to perform

The system automatically handles:
- Navigation using MCP
- Element capture at each step
- Component framework detection
- Locator generation and validation
- Page Object creation
- Complete test code generation

### Navigation Instruction Format

Define navigation steps using this format:

```typescript
interface NavigationStep {
  action: 'navigate' | 'click' | 'fill' | 'wait' | 'verify';
  target?: string;        // Element identifier, text, or UID from snapshot
  value?: string;         // For fill actions
  expectedUrl?: string;   // For navigation verification
  waitFor?: string;       // Text to wait for after action
  description?: string;   // Human-readable description
}

// Example navigation instructions
const navigationSteps: NavigationStep[] = [
  {
    action: 'navigate',
    target: 'https://example.com/login',
    waitFor: 'Login',
    description: 'Navigate to login page'
  },
  {
    action: 'fill',
    target: 'username',  // Will be found by label, placeholder, or name
    value: 'testuser',
    description: 'Enter username'
  },
  {
    action: 'fill',
    target: 'password',
    value: 'testpass',
    description: 'Enter password'
  },
  {
    action: 'click',
    target: 'Login',  // Button text or label
    expectedUrl: '/dashboard',
    description: 'Click login button'
  },
  {
    action: 'verify',
    target: 'Welcome',
    description: 'Verify welcome message appears'
  }
];
```

### Steps

#### Phase 1: Setup and Navigation

**Step 1.1: Accept Input**
- Base URL: Starting URL for the application
- Navigation steps: Array of navigation instructions
- Test scenarios: What to test on each page

**Step 1.2: Initialize MCP Session**
```typescript
// Use MCP to open browser and navigate
mcp_chrome-devtools_navigate_page(type: "url", url: baseUrl)
mcp_chrome-devtools_wait_for(text: "Key page element")
```

**Step 1.3: Execute Navigation Steps**
For each navigation step:

1. **Navigate Action**:
   ```
   mcp_chrome-devtools_navigate_page(type: "url", url: step.target)
   mcp_chrome-devtools_wait_for(text: step.waitFor || "Page loaded")
   ```

2. **Click Action**:
   ```
   // First, take snapshot to find element
   const snapshot = mcp_chrome-devtools_take_snapshot(verbose: true)
   // Find element by text, label, or identifier
   const element = findElementInSnapshot(snapshot, step.target)
   // Click using UID
   mcp_chrome-devtools_click(uid: element.uid)
   // Wait for navigation if expected
   if (step.expectedUrl) {
     mcp_chrome-devtools_wait_for(text: step.waitFor)
   }
   ```

3. **Fill Action**:
   ```
   // Take snapshot
   const snapshot = mcp_chrome-devtools_take_snapshot(verbose: true)
   // Find input element
   const element = findInputElement(snapshot, step.target)
   // Fill using UID
   mcp_chrome-devtools_fill(uid: element.uid, value: step.value)
   ```

4. **Wait Action**:
   ```
   mcp_chrome-devtools_wait_for(text: step.waitFor)
   ```

5. **Verify Action**:
   ```
   const snapshot = mcp_chrome-devtools_take_snapshot(verbose: true)
   // Verify element exists in snapshot
   const element = findElementInSnapshot(snapshot, step.target)
   ```

**Step 1.4: Capture Snapshot at Each Step**
- **CRITICAL**: Take verbose snapshot after each navigation/interaction
- Save snapshot with step context (URL, step number, description)
- Store snapshots for later processing

#### Phase 2: Element Capture and Processing

**Step 2.1: Extract Interactive Elements**
For each snapshot captured:

1. **Find all interactive elements**:
   - Form inputs: `input`, `textarea`, `select`
   - Buttons: `button`, elements with `role="button"`
   - Links: `a` tags, elements with `href`
   - Interactive roles: `textbox`, `button`, `link`, `menuitem`, `tab`

2. **Extract ALL attributes**:
   ```typescript
   import { ElementData } from './utils/component-detector';
   
   // For each element, extract:
   - id, name, class, type, role
   - data-testid, data-cy, data-test, data-*
   - aria-label, aria-labelledby, aria-*
   - placeholder, value, href
   - Component-specific: sp-*, data-spectra-*, data-oj-*, redwood-*
   - Parent/child relationships (up to 5 levels)
   ```

**Step 2.2: Detect Component Framework**
```typescript
import { detectComponentFramework } from './utils/component-detector';

const framework = detectComponentFramework(element);
// Returns: 'spectra' | 'jet' | 'redwood' | 'html'
```

**Step 2.3: Extract Deep Text, Labels, and Placeholders**
```typescript
import {
  extractDeepText,
  extractLabelText,
  extractPlaceholderText,
  aggregateSpanText
} from './utils/text-extractor';

// Extract all text content
const textContent = extractDeepText(element, snapshot);

// Extract label (traverses up DOM tree)
const labelText = extractLabelText(element, snapshot);

// Extract placeholder (from element or parent)
const placeholderText = extractPlaceholderText(element, snapshot);

// Aggregate text from multiple spans
const aggregatedText = aggregateSpanText(element, snapshot);
```

**Step 2.4: Group Elements by Page**
- Group elements by the page/URL where they were captured
- Create page context for each group
- Note which elements are used in navigation steps

#### Phase 3: Locator Generation and Validation

**Step 3.1: Generate Locators**
```typescript
import { generateLocators } from './utils/locator-generator';

// For each interactive element
const locators = generateLocators(element, snapshot, {
  prioritizeComponentFramework: true,
  extractDeepText: true,
  aggregateSpanText: true,
  preventStaleElements: true
});

// Result includes:
// - selectors: string[] (ordered by priority)
// - componentFramework: 'spectra' | 'jet' | 'redwood' | 'html'
// - textContent: string | null
// - labelText: string | null
// - placeholderText: string | null
```

**Step 3.2: Validate Locators**
```typescript
import { generateAndValidateLocators } from './utils/locator-validation-helper';

// Generate and validate in one step
const result = await generateAndValidateLocators(element, snapshot, {
  minValidSelectors: 2,
  requireCSS: true,
  requireXPath: true,
  verbose: true
});

// Check validation result
if (!result.success) {
  // Handle validation failure
  console.error('Validation failed:', result.recommendations);
  // Options:
  // 1. Take fresh snapshot and retry
  // 2. Manually adjust selectors
  // 3. Skip element (if optional)
}
```

**Step 3.3: Fix Validation Failures**
If validation fails:
1. Review validation report recommendations
2. Take fresh MCP snapshot if attributes changed
3. Verify element still exists in expected state
4. Regenerate locators with updated snapshot
5. Re-run validation until it passes

**Step 3.4: Ensure Quality**
- Minimum 2 valid selectors per element
- At least 1 CSS selector must be valid
- At least 1 XPath selector must be valid
- Component framework detected correctly

#### Phase 4: Page Object Generation

**Step 4.1: Create Page Object Structure**
For each page/URL group:

```typescript
import { WebDriver } from 'selenium-webdriver';
import { BasePage } from './BasePage';

export class PageName extends BasePage {
  // Selector arrays from validated locators
  private readonly elementNameSelectors = [
    'selector1',  // From validated locators
    'selector2',  // From validated locators
    'selector3',  // From validated locators
    '//xpath'     // XPath fallback
  ];

  constructor(driver: WebDriver) {
    super(driver);
  }

  // Action methods will be generated here
}
```

**Step 4.2: Add Selector Arrays**
- Use validated selectors from Phase 3
- Name selectors based on element purpose (from navigation steps)
- Group related selectors (form fields, buttons, links)

**Step 4.3: Implement Action Methods**
For each element used in navigation steps:

```typescript
// For fill actions
async enterFieldName(value: string): Promise<void> {
  await this.fillWithFallback(this.fieldNameSelectors, value);
}

// For click actions
async clickButtonName(): Promise<void> {
  await this.clickWithFallback(this.buttonNameSelectors);
  // Add URL-based wait if navigation expected
  if (expectedUrl) {
    await this.driver.wait(
      async () => {
        const url = await this.driver.getCurrentUrl();
        return url.includes(expectedUrl);
      },
      10000
    );
  }
}

// For verification
async verifyElementExists(): Promise<boolean> {
  try {
    await this.findElementWithFallback(this.elementSelectors, 5000);
    return true;
  } catch {
    return false;
  }
}
```

**Step 4.4: Add Navigation Methods**
```typescript
async navigateTo(url: string): Promise<void> {
  await this.driver.get(url);
  await this.driver.wait(
    async () => {
      const currentUrl = await this.driver.getCurrentUrl();
      return currentUrl.includes(url);
    },
    10000
  );
}

async isPageLoaded(): Promise<boolean> {
  try {
    await this.findElementWithFallback(this.pageIndicatorSelectors, 5000);
    return true;
  } catch {
    return false;
  }
}
```

#### Phase 5: Test Code Generation

**Step 5.1: Create Test File Structure**
```typescript
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { initializeDriver, quitDriver } from '../utils/driver';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

describe('User Flow: Login to Dashboard', function() {
  this.timeout(60000);

  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  before(async function() {
    const driver = await initializeDriver();
    loginPage = new LoginPage(driver);
    dashboardPage = new DashboardPage(driver);
  });

  after(async function() {
    await quitDriver();
  });

  // Test cases will be generated here
});
```

**Step 5.2: Generate Test Cases from Navigation Steps**
For each navigation step sequence:

```typescript
it('should complete user flow: [description]', async function() {
  // Navigate to base URL
  await loginPage.navigateTo('https://example.com/login');
  
  // Execute navigation steps
  await loginPage.enterUsername('testuser');
  await loginPage.enterPassword('testpass');
  await loginPage.clickLogin();
  
  // Verify navigation
  const isDashboardLoaded = await dashboardPage.isPageLoaded();
  expect(isDashboardLoaded).to.be.true;
  
  // Verify elements
  const welcomeExists = await dashboardPage.verifyWelcomeMessage();
  expect(welcomeExists).to.be.true;
});
```

**Step 5.3: Add Assertions**
- Verify page loads correctly
- Verify elements exist
- Verify navigation occurred
- Verify expected text/content appears

**Step 5.4: Add Error Handling**
```typescript
it('should handle errors gracefully', async function() {
  try {
    await loginPage.enterUsername('invalid');
    await loginPage.clickLogin();
    
    // Verify error message appears
    const errorExists = await loginPage.verifyErrorMessage();
    expect(errorExists).to.be.true;
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
});
```

### Complete Example

**Input:**
```typescript
const baseUrl = 'https://example.com';
const navigationSteps = [
  { action: 'navigate', target: 'https://example.com/login', waitFor: 'Login' },
  { action: 'fill', target: 'username', value: 'testuser' },
  { action: 'fill', target: 'password', value: 'testpass' },
  { action: 'click', target: 'Login', expectedUrl: '/dashboard' },
  { action: 'verify', target: 'Welcome' }
];
```

**Output:**
- `src/pages/LoginPage.ts` - Complete Page Object with validated selectors
- `src/pages/DashboardPage.ts` - Complete Page Object with validated selectors
- `src/tests/login-flow.spec.ts` - Complete test file
- All locators validated and ready to use

### Best Practices

1. **Always validate locators** before generating code
2. **Use component-specific locators** when framework is detected
3. **Include URL-based waits** after navigation
4. **Handle optional elements** gracefully
5. **Group related elements** in Page Objects
6. **Name methods descriptively** based on navigation steps
7. **Add verification methods** for important elements

### Output
- Complete Page Objects for each page
- Complete test file with all scenarios
- All locators validated and working
- Ready to run with `npm test`

---

## Workflow 8: Quick Selector Update

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
