import { WebDriver, WebElement, By, until } from 'selenium-webdriver';
import { DEFAULT_TIMEOUT } from '../utils/wait-helpers';

export abstract class BasePage {
  protected driver: WebDriver;

  constructor(driver: WebDriver) {
    this.driver = driver;
  }

  /**
   * Find element with multiple selector fallback
   */
  protected async findElementWithFallback(selectors: string[], timeout: number = DEFAULT_TIMEOUT): Promise<WebElement> {
    const errors: string[] = [];
    const selectorTimeout = Math.max(2000, timeout / selectors.length); // Minimum 2 seconds per selector

    for (const selector of selectors) {
      try {
        // Skip invalid CSS selectors (like :contains which doesn't exist in CSS)
        if (!selector.startsWith('//') && selector.includes(':contains(')) {
          errors.push(`${selector}: Invalid CSS selector (contains is not supported)`);
          continue;
        }

        // Try CSS selector first
        if (selector.startsWith('//')) {
          // XPath
          const element = await this.driver.wait(
            until.elementLocated(By.xpath(selector)),
            selectorTimeout,
            `XPath selector "${selector}" not found`
          );
          return element;
        } else {
          // CSS selector
          try {
            const element = await this.driver.wait(
              until.elementLocated(By.css(selector)),
              selectorTimeout,
              `CSS selector "${selector}" not found`
            );
            return element;
          } catch (cssError: any) {
            // If it's an invalid selector error, skip it
            if (cssError.message && cssError.message.includes('invalid selector')) {
              errors.push(`${selector}: Invalid CSS selector`);
              continue;
            }
            throw cssError;
          }
        }
      } catch (error: any) {
        errors.push(`${selector}: ${error.message || error}`);
        continue;
      }
    }

    throw new Error(`All selectors failed:\n${errors.join('\n')}`);
  }

  /**
   * Wait for element to be visible with fallback
   */
  protected async waitForElementVisibleWithFallback(
    selectors: string[],
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<WebElement> {
    const element = await this.findElementWithFallback(selectors, timeout);
    await this.driver.wait(
      until.elementIsVisible(element),
      timeout,
      `Element not visible: ${selectors.join(', ')}`
    );
    return element;
  }

  /**
   * Wait for element to be clickable with fallback
   */
  protected async waitForElementClickableWithFallback(
    selectors: string[],
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<WebElement> {
    const element = await this.findElementWithFallback(selectors, timeout);
    await this.driver.wait(
      until.elementIsEnabled(element),
      timeout,
      `Element not clickable: ${selectors.join(', ')}`
    );
    return element;
  }

  /**
   * Click element with fallback
   */
  protected async clickWithFallback(selectors: string[], timeout: number = DEFAULT_TIMEOUT): Promise<void> {
    const element = await this.waitForElementClickableWithFallback(selectors, timeout);
    await element.click();
  }

  /**
   * Fill input with fallback
   */
  protected async fillWithFallback(
    selectors: string[],
    value: string,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<void> {
    const element = await this.waitForElementVisibleWithFallback(selectors, timeout);
    await element.clear();
    await element.sendKeys(value);
  }

  /**
   * Get text with fallback
   */
  protected async getTextWithFallback(selectors: string[], timeout: number = DEFAULT_TIMEOUT): Promise<string> {
    const element = await this.waitForElementVisibleWithFallback(selectors, timeout);
    return await element.getText();
  }
}
