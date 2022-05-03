const puppeteer = require('puppeteer');
const express = require('express');

const port = process.env.PORT || 8080;
const app = express()

app.get('/*', async (req, res) => {
	const url = req.url.substring(1)
	if (url.length === 0) {
		res.send('Hello world!')
		return
	}
	console.log("Got url:", url)
	console.log("Launching puppeteer...")
	const browser = await puppeteer.launch({
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	})
	const page = await browser.newPage()
	console.log("Opening url...")
	await page.goto(url)
	const content = await page.$eval('*', (el) => el.innerText)
	console.log("Returning content...")
	res.send(content)
	console.log("Closing browser...")
	await browser.close();
	console.log("Done!")
});
app.listen(port, function () {
	console.log(`Running on port ${port}.`)
});
