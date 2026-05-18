const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.launch({headless: true});
    const page = await browser.newPage();
    await page.goto('https://aportessimple-qa.blindem.com.co/login', { waitUntil: 'networkidle' });
    
    // Try to get the form element
    const formExists = await page.$('form');
    if (formExists) {
      const formHTML = await page.$eval('form', f => f.outerHTML);
      console.log(formHTML);
    } else {
      // If no form, maybe we need to wait longer or check for different selectors
      console.log('No form found on page');
      // Get page content for debugging
      const pageContent = await page.content();
      console.log('Page content length:', pageContent.length);
    }
    
    await browser.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();