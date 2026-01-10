import { Builder, WebDriver, Capabilities } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';

let driver: WebDriver | null = null;

export async function initializeDriver(): Promise<WebDriver> {
  if (driver) {
    return driver;
  }

  const options = new chrome.Options();
  options.addArguments('--start-maximized');
  options.addArguments('--disable-blink-features=AutomationControlled');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--no-sandbox');

  driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  return driver;
}

export async function getDriver(): Promise<WebDriver> {
  if (!driver) {
    return await initializeDriver();
  }
  return driver;
}

export async function quitDriver(): Promise<void> {
  if (driver) {
    await driver.quit();
    driver = null;
  }
}

export async function navigateTo(url: string): Promise<void> {
  const d = await getDriver();
  await d.get(url);
}
