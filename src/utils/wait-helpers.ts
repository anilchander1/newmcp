import { WebDriver, WebElement, until, By } from 'selenium-webdriver';

export const DEFAULT_TIMEOUT = 10000; // 10 seconds

export async function waitForElement(
  driver: WebDriver,
  selector: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<WebElement> {
  return await driver.wait(
    until.elementLocated(By.css(selector)),
    timeout,
    `Element with selector "${selector}" not found within ${timeout}ms`
  );
}

export async function waitForElementVisible(
  driver: WebDriver,
  selector: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<WebElement> {
  const element = await waitForElement(driver, selector, timeout);
  await driver.wait(
    until.elementIsVisible(element),
    timeout,
    `Element with selector "${selector}" not visible within ${timeout}ms`
  );
  return element;
}

export async function waitForElementClickable(
  driver: WebDriver,
  selector: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<WebElement> {
  const element = await waitForElement(driver, selector, timeout);
  await driver.wait(
    until.elementIsEnabled(element),
    timeout,
    `Element with selector "${selector}" not clickable within ${timeout}ms`
  );
  return element;
}

export async function waitForText(
  driver: WebDriver,
  selector: string,
  text: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<WebElement> {
  const element = await waitForElement(driver, selector, timeout);
  await driver.wait(
    async () => {
      const elementText = await element.getText();
      return elementText.includes(text);
    },
    timeout,
    `Text "${text}" not found in element "${selector}" within ${timeout}ms`
  );
  return element;
}

export async function waitForUrl(
  driver: WebDriver,
  urlPattern: string | RegExp,
  timeout: number = DEFAULT_TIMEOUT
): Promise<void> {
  await driver.wait(
    async () => {
      const currentUrl = await driver.getCurrentUrl();
      if (typeof urlPattern === 'string') {
        return currentUrl.includes(urlPattern);
      } else {
        return urlPattern.test(currentUrl);
      }
    },
    timeout,
    `URL pattern "${urlPattern}" not matched within ${timeout}ms`
  );
}
