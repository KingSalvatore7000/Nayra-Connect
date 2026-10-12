/**
 * Selenium WebDriver UI Test
 * Scenario: Coordinator logs in, creates a case via the intake form,
 * and verifies that the cases page displays the newly created case with an allocated lawyer.
 */

const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const app = require('../../src/app');
const { seedDatabase } = require('../../db/seed');

const TEST_PORT = 3199;

async function runUiTest() {
  console.log('--- Starting Nayra Connect Selenium UI Automation ---');

  // 1. Prepare clean test database
  seedDatabase();

  // 2. Start local application server
  const server = app.listen(TEST_PORT, () => {
    console.log(`Test server running on http://localhost:${TEST_PORT}`);
  });

  let driver;
  try {
    console.log('Initializing Headless Chrome driver via Selenium WebDriver...');
    const options = new chrome.Options();
    options.addArguments('--headless=new');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1280,800');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    console.log('Step 1: Navigating to Login page...');
    await driver.get(`http://localhost:${TEST_PORT}/login.html`);

    console.log('Step 2: Entering Coordinator credentials...');
    await driver.wait(until.elementLocated(By.id('email')), 5000);
    const emailInput = await driver.findElement(By.id('email'));
    const passwordInput = await driver.findElement(By.id('password'));
    const submitBtn = await driver.findElement(By.id('login-submit-btn'));

    await emailInput.sendKeys('coordinator@nayra.test');
    await passwordInput.sendKeys('Coordinator@123');
    await submitBtn.click();

    console.log('Step 3: Waiting for redirection to Dashboard...');
    await driver.wait(until.urlContains('dashboard.html'), 5000);
    console.log('Logged in successfully. Current URL:', await driver.getCurrentUrl());

    console.log('Step 4: Navigating to Intake page...');
    await driver.get(`http://localhost:${TEST_PORT}/intake.html`);
    await driver.wait(until.elementLocated(By.id('client_name')), 5000);

    const clientName = 'Amal John';
    const clientPhone = '9876543210';
    console.log(`Step 5: Submitting walk-in case for client "${clientName}"...`);

    await driver.findElement(By.id('client_name')).sendKeys(clientName);
    await driver.findElement(By.id('phone')).sendKeys(clientPhone);
    await driver.findElement(By.id('case_type')).sendKeys('bail');
    await driver.findElement(By.id('priority')).sendKeys('High');
    await driver.findElement(By.id('description')).sendKeys(
      'Emergency bail petition for walk-in client detained following commercial dispute.'
    );

    const intakeSubmit = await driver.findElement(By.id('submit-intake-btn'));
    await intakeSubmit.click();

    console.log('Step 6: Verifying auto-allocation modal...');
    await driver.wait(until.elementLocated(By.css('#allocation-modal.open')), 6000);
    const modalDetails = await driver.findElement(By.id('modal-details')).getText();
    console.log('Allocation Modal details:\n', modalDetails);

    if (!modalDetails.includes('Assigned Lawyer:') || modalDetails.includes('Unassigned')) {
      throw new Error(`Expected case to be auto-allocated to a lawyer, but got: ${modalDetails}`);
    }

    console.log('Step 7: Navigating to Cases page and verifying allocation row...');
    await driver.get(`http://localhost:${TEST_PORT}/cases.html`);
    await driver.wait(until.elementLocated(By.id('cases-tbody')), 5000);

    // Wait until table rows render
    await driver.wait(async () => {
      const text = await driver.findElement(By.id('cases-tbody')).getText();
      return text.includes(clientName);
    }, 6000);

    const tableText = await driver.findElement(By.id('cases-tbody')).getText();
    console.log('Cases table verified. Contains client:', clientName);

    // Verify row displays assigned lawyer
    const clientRow = await driver.findElement(By.xpath(`//tr[contains(., '${clientName}')]`));
    const rowText = await clientRow.getText();
    console.log('Matched row content:\n', rowText);

    if (rowText.includes('Unassigned')) {
      throw new Error(`Client row shows "Unassigned" instead of an allocated lawyer.`);
    }

    console.log('======================================================');
    console.log('       SELENIUM UI TEST PASSED SUCCESSFULLY           ');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Selenium UI Test Failed:', err);
    process.exitCode = 1;
  } finally {
    if (driver) {
      await driver.quit();
    }
    server.close();
  }
}

if (require.main === module) {
  runUiTest();
}

module.exports = { runUiTest };
