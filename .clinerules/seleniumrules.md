# Cline Rules for Selenium Test Generation with Chrome DevTools MCP

## Project Context
This project uses Chrome DevTools MCP to capture page elements and generate robust Selenium tests with TypeScript, Mocha, and Page Object Model pattern. All tests must follow multi-selector fallback strategy for maximum reliability.

## Core Principles

1. **Never rely on a single selector** - Always provide 3-5 selector options per element
2. **Use real data from MCP** - Never assume page structure, always capture with Chrome DevTools MCP
3. **Validate selector stability** - Avoid dynamic IDs, hashed classes, timestamps
4. **Follow Page Object Model** - All page interactions go through Page Objects
5. **Include proper waits** - Use URL-based waits, not fixed timeouts

---

## Chrome DevTools MCP Usage Rules

### Snapshot Capture
- **ALWAYS use verbose snapshots**: `mcp_chrome-devtools_take_snapshot(verbose: true)`
- **Never use non-verbose**: Regular snapshots miss critical attributes
- **Capture at each step**: Take snapshot before and after interactions
- **Wait for page load**: Use `mcp_chrome-devtools_wait_for()` before capturing

### Element Extraction
- **Extract ALL attributes**, not just common ones:
  - Required: id, name, class, type, role
  - Critical: data-testid, data-cy, data-test, aria-label, aria-labelledby
  - Also capture: placeholder, value, href, onclick, custom data-*
- **Capture element hierarchy**: Note parent/child relationships
- **Extract text content**: Visible text, label text for XPath fallbacks
- **Record element context**: Page URL, step name, timestamp

### Interactive Element Detection
Focus on these element types:
- Form inputs: `input`, `textarea`, `select`
- Buttons: `button`, elements with `role="button"`
- Links: `a` tags, elements with `href`
- Interactive roles: `textbox`, `button`, `link`, `menuitem`, `tab`

---

## Selector Generation Rules

### Priority Order (MUST FOLLOW)
Generate selectors in this exact order:

1. **Test ID Attributes** (Highest Priority)
   - `[data-testid="..."]`
   - `[data-cy="..."]`
   - `[data-test="..."]`
   - These are the most stable selectors

2. **Stable ID Selectors**
   - `#id` - ONLY if ID is stable (not dynamic)
   - Validate: No timestamps, hashes, random strings
   - Pattern check: Avoid `/^\d+$/`, `/[a-f0-9]{32,}/`, `/timestamp|random/i`

3. **Name Attributes**
   - `[name="..."]` - For form elements
   - `tag[name="..."]` - Combined with tag
   - Very stable for forms

4. **Aria Attributes**
   - `[aria-label="..."]` - Accessibility attributes
   - `[aria-labelledby="..."]`
   - Often stable and semantic

5. **Type Attributes**
   - `[type="..."]` - For inputs
   - `tag[type="..."]` - Combined
   - `tag[name="..."][type="..."]` - Multiple attributes

6. **Placeholder Attributes**
   - `[placeholder="..."]` - For inputs
   - `tag[placeholder="..."]` - Combined

7. **Stable Class Selectors**
   - Only use classes that are stable (not hashed/dynamic)
   - Prefer combined classes: `.class1.class2.class3`
   - Avoid: Long hex strings, CSS modules with hashes
   - Look for semantic patterns: `btn-`, `input-`, `form-`, framework prefixes

8. **XPath Fallbacks**
   - `//tag[@attribute="value"]` - By attribute
   - `//tag[contains(text(), "...")]` - By text content
   - `//tag[@role="..."]` - By role
   - Always include as last resort

### Selector Array Requirements
- **Minimum 3 selectors** per element
- **Maximum 5 selectors** per element (to avoid timeout issues)
- **Must include both CSS and XPath**
- **Order by stability** (most stable first)

### Stability Validation Rules

**Reject these patterns as unstable:**
- Pure numbers: `id="12345"`
- Long hex strings: `id="abc123def456..."` (32+ chars)
- Timestamps: Contains "timestamp", "random", "temp", "gen"
- Pattern like "element-12345": `/^[a-z]+-\d+$/`
- Hashed classes: `/^[a-z0-9]{10,}$/i` (long alphanumeric)

**Accept these as stable:**
- Semantic IDs: `id="username"`, `id="login-button"`
- Test IDs: `data-testid="login-btn"`
- Semantic classes: `.btn-primary`, `.form-control`, `.oxd-button`
- Framework classes: `.oxd-*`, `.ant-*`, `.mui-*`

---

## Oracle Component Framework Detection

This project uses Oracle JET 18, Oracle VBCS Redwood, and Oracle VBCS Spectra components. Locator generation MUST detect and prioritize component-specific locators.

### Component Detection Priority
1. **Spectra Components** (Highest Priority)
2. **JET Components** (Medium Priority)
3. **Redwood Components** (Medium Priority)
4. **HTML Elements** (Fallback)

### Spectra Component Detection
Spectra components can be identified by:
- **`sp-*` prefix** (classes, attributes, IDs) - **HIGHEST PRIORITY**
  - Examples: `sp-button`, `sp-input`, `[sp-id="value"]`
- `oj-spectra-*` classes
- `spectra-*` classes/attributes
- `data-spectra-*` attributes
- Tag names starting with `sp-*`

**Detection Strategy:**
- Check element itself first
- Traverse parent chain up to 5 levels
- Look for `sp-*` prefix in: classes, attributes, IDs, tag names

### JET Component Detection
JET components can be identified by:
- `oj-*` classes (e.g., `oj-inputtext`, `oj-button`, `oj-select`)
- `data-oj-*` attributes
- Tag names starting with `oj-*` (but not `oj-spectra-*` or `oj-redwood-*`)

**Detection Strategy:**
- Check element itself first
- Traverse parent chain up to 5 levels
- Exclude `oj-spectra-*` and `oj-redwood-*` (these are Spectra/Redwood)

### Redwood Component Detection
Redwood components can be identified by:
- `oj-redwood-*` classes
- `redwood-*` classes/attributes

**Detection Strategy:**
- Check element itself first
- Traverse parent chain up to 5 levels

### Component-Specific Locator Generation

#### Spectra Locators (Priority Order)
1. `sp-*` prefixed attributes: `[sp-id="value"]`, `[sp-name="value"]`
2. `sp-*` prefixed classes: `.sp-button`, `.sp-input`
3. `[data-spectra-*="value"]` attributes
4. `.oj-spectra-*` class selectors
5. Aria attributes within Spectra context

#### JET Locators (Priority Order)
1. `[data-oj-*="value"]` attributes
2. `oj-*` component classes: `.oj-inputtext`, `.oj-button`
3. Combined JET classes: `.oj-inputtext.oj-form-control`
4. Aria attributes within JET context

#### Redwood Locators (Priority Order)
1. `.oj-redwood-*` class selectors
2. `redwood-*` attributes/classes

---

## Deep Element Traversal

Labels, placeholders, and text are often deeply nested in Oracle component hierarchies. Locator generation MUST traverse the DOM to find these values.

### Label Extraction Strategy
Extract labels in this order:
1. **Direct `aria-label` attribute** on the element
2. **`aria-labelledby` reference** - Follow the ID reference to find label text
3. **Associated `<label>` element** - Find label with `for` attribute matching element's `id`
4. **Parent label elements** - Traverse up DOM tree (up to 5 levels) to find `<label>` tags
5. **Sibling labels** - Check parent's children for label elements

### Placeholder Extraction Strategy
Extract placeholders in this order:
1. **Direct `placeholder` attribute** on the element
2. **`aria-placeholder` attribute** on the element
3. **Parent containers** - Traverse up DOM tree (up to 3 levels) to find placeholder in wrapper divs

### Deep Text Extraction Strategy
Extract visible text by:
1. **Direct text content** from element
2. **Recursive child traversal** - Collect text from all descendant elements
3. **Aggregate span text** - Combine text from multiple `<span>` elements (see Span Text Handling below)
4. **Normalize whitespace** - Replace multiple spaces with single space, trim

### Text Extraction Rules
- **Include all visible text** from child nodes
- **Exclude hidden elements** (display: none, visibility: hidden)
- **Normalize whitespace** - Multiple spaces become single space
- **Trim leading/trailing whitespace**
- **Limit text length** for XPath (max 100 characters)

---

## Span Text Handling

Text is often split across multiple `<span>` elements for styling purposes. This doesn't affect visual users but breaks simple text-based locators.

### Span Aggregation Strategy
1. **Collect all text nodes** from descendant elements
2. **Filter out hidden spans** (check display/visibility styles if available)
3. **Join text parts** with single space separator
4. **Normalize whitespace** - Replace multiple spaces/newlines with single space
5. **Create XPath with `normalize-space()`** - Use `normalize-space(text())` for matching

### XPath for Span-Aggregated Text
```xpath
//button[normalize-space(text())="Complete Text Here"]
//input[contains(normalize-space(text()), "Partial Text")]
```

### Best Practices
- **Use `normalize-space()`** in XPath to handle whitespace variations
- **Use `contains()`** for partial text matching when full text is split
- **Limit text length** - Only use text-based locators for text under 100 characters
- **Combine with other attributes** - Don't rely solely on text, combine with component classes/attributes

---

## Component-Based Locator Priority

Updated selector priority order that includes component-specific locators:

1. **Test ID Attributes** (data-testid, data-cy, data-test)
2. **Component-Specific Attributes** (Spectra/JET/Redwood)
   - Spectra: `[sp-*="value"]`, `[data-spectra-*="value"]`
   - JET: `[data-oj-*="value"]`
   - Redwood: `[redwood-*="value"]`
3. **Stable ID Selectors** (#id)
4. **Name Attributes** ([name="value"])
5. **Component-Specific Classes** (sp-*, oj-*, spectra-*, redwood-*)
   - Spectra: `.sp-*`, `.oj-spectra-*`
   - JET: `.oj-*` (excluding oj-spectra-* and oj-redwood-*)
   - Redwood: `.oj-redwood-*`
6. **Aria Attributes** (with component context)
7. **Type Attributes** ([type="value"])
8. **Placeholder Attributes** (including nested placeholders)
9. **Deep Text-Based XPath** (aggregated from spans)
   - Use `normalize-space()` for span-aggregated text
   - Use `contains()` for partial matches
10. **Stable Class Selectors** (semantic classes)
11. **XPath Fallbacks** (with component context)

---

## Stale Element Prevention

Oracle components often update the DOM dynamically, causing stale element references. Implement these strategies:

### Prevention Strategies
1. **Re-acquire elements before interaction** - Use `refreshElementReference()` method
2. **Wait for element stability** - Use `waitForElementStable()` to ensure element is not changing
3. **Use `findElementWithFallbackSafe()`** - Automatically handles stale element retries
4. **Element presence before visibility** - Check presence first, then visibility
5. **Retry with element refresh** - On stale element error, re-acquire element reference

### BasePage Methods for Stale Element Prevention
- `refreshElementReference()` - Re-acquires element using same selectors
- `waitForElementStable()` - Waits until element is stable (not changing)
- `findElementWithFallbackSafe()` - Enhanced version with automatic stale element handling

### Best Practices
- **Always re-acquire** element references before interactions in dynamic pages
- **Use stability checks** for elements that load asynchronously
- **Implement retry logic** with element refresh on stale element errors
- **Wait for component initialization** - Oracle components may take time to fully render

---

## Page Object Model Standards

### Class Structure
```typescript
import { WebDriver } from 'selenium-webdriver';
import { BasePage } from './BasePage';

export class PageName extends BasePage {
  // 1. Selector arrays (private readonly, 3-5 options each)
  private readonly elementSelectors = [
    'selector1',  // Primary
    'selector2',  // Fallback 1
    'selector3',  // Fallback 2
    '//xpath'     // XPath fallback
  ];

  // 2. Constructor
  constructor(driver: WebDriver) {
    super(driver);
  }

  // 3. Action methods (use fillWithFallback, clickWithFallback)
  async actionMethod(): Promise<void> {
    await this.fillWithFallback(this.elementSelectors, value);
  }

  // 4. Verification methods
  async isPageLoaded(): Promise<boolean> {
    // Check with findElementWithFallback
  }
}
```

### Required Methods
- **Action methods**: Use `fillWithFallback()`, `clickWithFallback()`
- **Verification methods**: Use `findElementWithFallback()` with try-catch
- **Navigation methods**: Include URL-based waits after navigation

### BasePage Usage
- **ALWAYS extend BasePage** - Never create standalone page classes
- **Use protected methods**: `findElementWithFallback()`, `clickWithFallback()`, `fillWithFallback()`
- **Never use driver directly** - Always go through BasePage methods

---

## Code Quality Standards

### TypeScript
- Use strict mode
- Proper type annotations
- No `any` types (use proper interfaces)
- Export interfaces for element data

### Error Handling
- **Graceful degradation**: Optional fields should skip on error, not fail test
- **Comprehensive errors**: Show all attempted selectors in error messages
- **Try-catch blocks**: For optional operations
- **Error logging**: Use `console.log()` for debugging info

### Waits and Timing
- **URL-based waits**: After navigation, wait for URL change
- **Explicit waits**: Use `waitForElementVisibleWithFallback()`
- **Minimum timeouts**: 2 seconds per selector in fallback chain
- **Avoid fixed delays**: Only use `setTimeout()` for animations/transitions

### Navigation Verification
```typescript
// ✅ Good - URL-based wait
await this.driver.wait(
  async () => {
    const url = await this.driver.getCurrentUrl();
    return url.includes('expected-page');
  },
  10000,
  'Did not navigate to expected page'
);

// ❌ Bad - Fixed delay
await new Promise(resolve => setTimeout(resolve, 5000));
```

---

## Test Case Standards

### Mocha Structure
```typescript
describe('Test Suite Name', function() {
  this.timeout(60000); // Set appropriate timeout

  let pageObject: PageObject;

  before(async function() {
    const driver = await initializeDriver();
    pageObject = new PageObject(driver);
  });

  after(async function() {
    await quitDriver();
  });

  it('should perform action', async function() {
    // Test implementation
  });
});
```

### Test Requirements
- **Use Page Objects**: Never interact with driver directly in tests
- **Meaningful assertions**: Use Chai `expect()` with clear messages
- **Proper setup/teardown**: Initialize driver in `before`, cleanup in `after`
- **Error handling**: Tests should handle optional elements gracefully

### Fake Data
- Use `generateEmployeeData()` or similar utilities
- Never hardcode test data
- Generate unique data for each test run

---

## LLM Model Selection Guide

### Planning Mode
- **Primary**: GPT-4.1 or GPT-5
- **Use for**: Architecture design, test strategy, Page Object structure
- **When**: Starting new features, major refactoring, design decisions

### Coding Mode
- **Primary**: Grok 4 Fast Coder (80% of coding tasks)
  - Page Object generation
  - Selector array creation
  - Test code writing
  - Quick iterations

- **Secondary**: GPT-4o (complex logic, debugging)
  - Complex selector generation
  - Debugging failing tests
  - Integration work
  - Code refinement

- **Fallback**: GPT-3.5 (simple fixes)
  - Quick selector additions
  - Typo fixes
  - Minor refactoring

---

## Common Pitfalls to Avoid

### ❌ Don't Do This
1. **Single selector**: `private readonly button = 'button.login'`
2. **CSS :contains()**: Not valid CSS, use XPath instead
3. **Dynamic IDs**: Using IDs with timestamps or hashes
4. **Fixed delays**: `setTimeout(5000)` without reason
5. **Direct driver access**: `driver.findElement()` in Page Objects
6. **No error handling**: Assuming elements always exist
7. **Non-verbose snapshots**: Missing critical attributes
8. **Ignoring test IDs**: Not prioritizing data-testid

### ✅ Do This Instead
1. **Selector arrays**: `private readonly buttonSelectors = ['sel1', 'sel2', 'sel3']`
2. **XPath for text**: `//button[contains(text(), "Login")]`
3. **Validate stability**: Check ID patterns before using
4. **URL-based waits**: Wait for URL change after navigation
5. **BasePage methods**: Use `clickWithFallback()`, `fillWithFallback()`
6. **Try-catch blocks**: Handle optional elements gracefully
7. **Verbose snapshots**: Always use `verbose: true`
8. **Prioritize test IDs**: Check data-testid, data-cy first

---

## File Structure Requirements

### Page Objects Location
- All Page Objects in `src/pages/`
- One file per page: `PageName.ts`
- Base class: `BasePage.ts` (never modify, only extend)

### Test Files Location
- All tests in `src/tests/`
- Naming: `feature-name.spec.ts`
- One describe block per feature

### Utilities Location
- `src/utils/driver.ts` - WebDriver management
- `src/utils/selector-generator.ts` - Selector generation
- `src/utils/test-data.ts` - Fake data generation
- `src/utils/wait-helpers.ts` - Wait utilities

---

## Selector Format Examples

### Good Selector Arrays
```typescript
// Form input
private readonly usernameSelectors = [
  'input[name="username"]',              // Primary: name
  '[data-testid="username-input"]',      // Test ID
  'input[type="text"]',                  // Type
  '//input[@name="username"]'            // XPath
];

// Button
private readonly loginButtonSelectors = [
  'button[type="submit"]',               // Type
  '[data-testid="login-btn"]',           // Test ID
  '//button[contains(text(), "Login")]', // XPath by text
  'button.oxd-button--primary'           // Stable class
];

// Link
private readonly pimMenuSelectors = [
  'a[href*="pim/viewPimModule"]',        // Href pattern
  '//a[contains(@href, "pim")]',         // XPath
  '//a[contains(text(), "PIM")]'         // XPath by text
];
```

### Bad Selector Arrays
```typescript
// ❌ Too few options
private readonly buttonSelectors = ['button.login'];

// ❌ Invalid CSS
private readonly buttonSelectors = ['button:contains("Login")'];

// ❌ Dynamic/unstable
private readonly buttonSelectors = ['#btn-12345', '.css-abc123def'];

// ❌ No XPath fallback
private readonly buttonSelectors = ['button[type="submit"]'];
```

---

## Debugging Guidelines

### When Selectors Fail
1. **Check error message**: Shows all attempted selectors
2. **Take fresh MCP snapshot**: Verify current page state
3. **Inspect element**: Check if attributes changed
4. **Generate alternatives**: Use MCP to find new selectors
5. **Update selector array**: Add new options, keep old ones as fallbacks
6. **Test incrementally**: Verify each selector works

### Error Message Analysis
```
Error: All selectors failed:
input[name="username"]: TimeoutError: Element not found
input[type="text"]: TimeoutError: Element not found
//input[@name="username"]: TimeoutError: Element not found
```

**Action**: Take fresh MCP snapshot, check if element exists, verify attributes.

---

## MCP Command Patterns

### Standard Capture Sequence
```typescript
// 1. Navigate
mcp_chrome-devtools_navigate_page(type: "url", url: "https://example.com")

// 2. Wait for page load
mcp_chrome-devtools_wait_for(text: "Key element text")

// 3. Take verbose snapshot (CRITICAL)
mcp_chrome-devtools_take_snapshot(verbose: true)

// 4. Interact (if needed)
mcp_chrome-devtools_fill(uid: "element_uid", value: "text")
mcp_chrome-devtools_click(uid: "element_uid")

// 5. Take snapshot after interaction
mcp_chrome-devtools_take_snapshot(verbose: true)
```

### Handling Stale Snapshots
- **Problem**: UIDs become stale after interactions
- **Solution**: Always take fresh snapshot before each interaction
- **Pattern**: Snapshot → Extract UID → Interact → Fresh Snapshot → Next Interaction

### Snapshot UID Usage
- **Never use UIDs in test code** - They're ephemeral
- **Only use UIDs during MCP capture** - For immediate interactions
- **Generate selectors from attributes** - Use attributes, not UIDs, in Page Objects

---

## Locator Validation

**CRITICAL**: Always validate generated locators against MCP snapshot before using in code.

### Why Validation is Essential
MCP can find elements correctly using UIDs, but when MCP data is translated to locators for code, they may fail because:
- **Timing differences**: MCP captures at specific moment, Selenium runs later
- **DOM state changes**: Attributes/classes may change between capture and execution
- **Missing context**: Component wrappers, parent elements may not be fully captured
- **Attribute extraction gaps**: Snapshot may miss attributes needed for stable selectors

### Validation Process
1. **Generate locators** from MCP snapshot using `generateLocators()`
2. **Validate immediately** using `validateLocators()` utility
3. **Check validation report** for issues and recommendations
4. **Fix failed selectors** based on recommendations
5. **Re-validate** until at least 2-3 selectors pass

### Validation Requirements
- **Minimum 2 valid selectors** per element (for fallback chain)
- **At least 1 CSS selector** must be valid
- **At least 1 XPath selector** must be valid
- **Component framework** should be detected correctly

### Automated Validation

**Option 1: CLI Script**
```bash
# Validate all interactive elements
npm run validate-locators snapshot.json

# Validate specific element
ts-node scripts/validate-mcp-locators.ts snapshot.json element_123
```

**Option 2: Programmatic**
```typescript
import { generateAndValidateLocators } from './utils/locator-validation-helper';

const result = await generateAndValidateLocators(targetElement, snapshot, {
  minValidSelectors: 2,
  requireCSS: true,
  requireXPath: true,
  verbose: true
});

if (!result.success) {
  // DO NOT proceed - fix issues first
  console.error('Validation failed:', result.recommendations);
}
```

### Common Validation Failures

**No elements found**
- **Cause**: Attributes changed, element doesn't exist in snapshot
- **Fix**: Take fresh MCP snapshot, verify element exists

**Multiple elements found**
- **Cause**: Selector too generic, not unique
- **Fix**: Add more specific attributes, use component-specific locators

**Wrong element matched**
- **Cause**: Selector matches different element
- **Fix**: Use component-specific locators, add parent context

**Invalid syntax**
- **Cause**: Selector has invalid CSS/XPath syntax
- **Fix**: Fix selector syntax (e.g., remove :contains() from CSS)

### Validation Best Practices
- **Validate immediately** after generating locators
- **Never skip validation** - it catches issues before they reach test code
- **Fix all failures** before proceeding to code generation
- **Re-validate** after making any changes
- **Use batch validation** for multiple elements at once

---

## Complete Test Generation from URL and Navigation

**NEW**: You can now generate complete test suites by providing only a base URL and navigation instructions. The system automatically handles all element capture, locator generation, validation, and code generation.

### Overview

Instead of manually capturing elements and generating locators, you can provide:
- **Base URL**: Starting URL for your application
- **Navigation Instructions**: Steps to navigate through pages and interact with elements
- **Test Scenarios**: What to verify on each page

The system will automatically:
1. Navigate using MCP Chrome DevTools
2. Capture elements at each step
3. Detect component frameworks (Spectra/JET/Redwood)
4. Generate and validate locators using all utilities
5. Create Page Objects for each page
6. Generate complete test code

### Navigation Instruction Format

Define your navigation steps using this format:

```typescript
interface NavigationStep {
  action: 'navigate' | 'click' | 'fill' | 'wait' | 'verify';
  target?: string;        // Element identifier, text, or label
  value?: string;         // For fill actions
  expectedUrl?: string;   // For navigation verification
  waitFor?: string;       // Text to wait for after action
  description?: string;   // Human-readable description
}
```

### Example Navigation Instructions

```typescript
const navigationSteps: NavigationStep[] = [
  {
    action: 'navigate',
    target: 'https://example.com/login',
    waitFor: 'Login',
    description: 'Navigate to login page'
  },
  {
    action: 'fill',
    target: 'username',  // Found by label, placeholder, or name attribute
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
    target: 'Login',  // Button text, label, or aria-label
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

### How It Works

**Phase 1: Navigation and Capture**
- System uses MCP to navigate to each URL
- Takes verbose snapshots at each step
- Captures all interactive elements automatically

**Phase 2: Element Processing**
- Detects component frameworks (Spectra/JET/Redwood) automatically
- Extracts deep text, labels, and placeholders
- Aggregates text from multiple spans
- Groups elements by page/URL

**Phase 3: Locator Generation and Validation**
- Generates locators using `generateLocators()` utility
- Validates all locators using `generateAndValidateLocators()`
- Ensures minimum 2 valid selectors per element
- Fixes validation failures automatically when possible

**Phase 4: Page Object Generation**
- Creates Page Object class for each page
- Adds validated selector arrays
- Implements action methods based on navigation steps
- Adds verification methods

**Phase 5: Test Code Generation**
- Creates complete test file structure
- Implements test cases from navigation steps
- Adds proper setup/teardown
- Includes assertions and error handling

### Integration with All Utilities

The workflow seamlessly integrates all utilities:

1. **Component Detector**: Automatically detects Spectra/JET/Redwood components
2. **Text Extractor**: Extracts nested labels, placeholders, and span-aggregated text
3. **Locator Generator**: Generates component-specific locators with proper priority
4. **Locator Validator**: Validates all generated locators before use
5. **BasePage**: All Page Objects extend BasePage with fallback methods

### Element Finding Strategy

When you specify a `target` in navigation steps, the system finds elements by:

1. **Text Content**: Button text, link text, label text
2. **Labels**: Associated label elements (via `for`/`id` relationship)
3. **Placeholders**: Input placeholder text
4. **Aria Labels**: `aria-label` and `aria-labelledby` attributes
5. **Name Attributes**: Form field `name` attributes
6. **Component-Specific**: Spectra `sp-*`, JET `oj-*` attributes

### Best Practices

1. **Be Specific**: Use descriptive targets (e.g., "Login Button" vs "Button")
2. **Include Wait Conditions**: Always specify `waitFor` text after navigation
3. **Verify Navigation**: Use `expectedUrl` for click actions that navigate
4. **Group Related Steps**: Keep related actions together
5. **Add Descriptions**: Helpful for understanding the flow

### Example: Complete Test Generation

**Input:**
```
Base URL: https://example.com
Navigation Steps:
  1. Navigate to /login, wait for "Login"
  2. Fill "username" with "testuser"
  3. Fill "password" with "testpass"
  4. Click "Login", expect URL /dashboard
  5. Verify "Welcome" text appears
```

**Output:**
- `src/pages/LoginPage.ts` - Complete Page Object
- `src/pages/DashboardPage.ts` - Complete Page Object
- `src/tests/login-flow.spec.ts` - Complete test file
- All locators validated and ready to use

### Validation Requirements

All generated locators are automatically validated:
- ✓ Minimum 2 valid selectors per element
- ✓ At least 1 CSS selector
- ✓ At least 1 XPath selector
- ✓ Component framework detected correctly

If validation fails, the system will:
1. Report specific failures
2. Provide recommendations
3. Allow you to take fresh snapshots
4. Regenerate locators until validation passes

### Usage

To use this workflow, follow **Workflow 7: Generate Complete Test from URL and Navigation Instructions** in the workflows documentation.

Simply provide:
- Base URL
- Navigation steps
- Test scenarios

The system handles everything else automatically!

---

## References

- BasePage implementation: `src/pages/BasePage.ts`
- Locator generator: `src/utils/locator-generator.ts`
- Locator validator: `src/utils/locator-validator.ts`
- Validation helper: `src/utils/locator-validation-helper.ts`
- Component detector: `src/utils/component-detector.ts`
- Text extractor: `src/utils/text-extractor.ts`
- Validation script: `scripts/validate-mcp-locators.ts`

---

## Quick Checklist

Before generating code, ensure:
- [ ] Using verbose MCP snapshots
- [ ] Extracting ALL attributes (including aria, data-*, component-specific)
- [ ] Detecting component framework (Spectra/JET/Redwood)
- [ ] Extracting deep text, labels, and placeholders
- [ ] Aggregating span text correctly
- [ ] Generating 3-5 selector options per element
- [ ] Validating selector stability
- [ ] **VALIDATING LOCATORS** against snapshot (CRITICAL)
- [ ] At least 2 valid selectors per element
- [ ] At least 1 CSS and 1 XPath selector valid
- [ ] Prioritizing test IDs (data-testid, data-cy)
- [ ] Including component-specific locators
- [ ] Including XPath fallbacks
- [ ] Extending BasePage
- [ ] Using fallback methods (clickWithFallback, fillWithFallback)
- [ ] Adding URL-based waits after navigation
- [ ] Handling optional elements gracefully
- [ ] Following TypeScript strict mode
- [ ] Including proper error messages
