from selenium import webdriver
from selenium.webdriver.chrome.options import Options

# Set up Chrome options
chrome_options = Options()
chrome_options.add_argument('--headless')
chrome_options.add_argument('--disable-gpu')
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')
chrome_options.add_argument('--window-size=4800,3600')

# Create a new Chrome driver instance
driver = webdriver.Chrome(options=chrome_options)

# Load the HTML file
driver.get('file:///C:/Users/soliy/Trifold poster/NextStep_Poster.html')

# Take a screenshot
driver.save_screenshot('NextStep_Poster.png')

# Close the browser
driver.quit() 