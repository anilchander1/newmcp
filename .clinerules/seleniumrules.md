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

## References

- BasePage implementation: `src/pages/BasePage.ts`
- Selector generator: `src/utils/selector-generator.ts`
- Example Page Objects: `src/pages/LoginPage.ts`, `src/pages/AddEmployeePage.ts`
- Test examples: `src/tests/add-employee.spec.ts`
- Strategy documentation: `SELECTOR_STRATEGY.md`

---

## Quick Checklist

Before generating code, ensure:
- [ ] Using verbose MCP snapshots
- [ ] Extracting ALL attributes (including aria, data-*)
- [ ] Generating 3-5 selector options per element
- [ ] Validating selector stability
- [ ] Prioritizing test IDs (data-testid, data-cy)
- [ ] Including XPath fallbacks
- [ ] Extending BasePage
- [ ] Using fallback methods (clickWithFallback, fillWithFallback)
- [ ] Adding URL-based waits after navigation
- [ ] Handling optional elements gracefully
- [ ] Following TypeScript strict mode
- [ ] Including proper error messages
