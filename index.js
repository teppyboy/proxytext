'use strict';
const puppeteer = require('puppeteer');
const express = require('express');
const favicon = require('serve-favicon')
const path = require('path')

const port = process.env.PORT || 8080;
const app = express()

async function fetchText(url) {
	console.log("Launching puppeteer...")
	const browser = await puppeteer.launch({
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	})
	const page = await browser.newPage()
	console.log("Opening url...")
	await page.goto(url)
	const content = await page.$eval('*', (el) => el.innerText)
	console.log("Closing browser...")
	await browser.close()
	console.log("Done!")
	return content
}

app.use(favicon(path.join(__dirname, 'favicon.ico')))
app.get('/*', async (req, res) => {
	let url = req.url.substring(1)
	console.log(`Got requrest from ${req.ip} (proxy: ${req.ips}): ${url}`)
	if (url.length === 0) {
		res.send('Hello world!')
		return
	}
	if (!url.includes("://")) {
		url = `https://${url}`
	}
	try {
		const text = await fetchText(url)
		console.log("Sending result...")
		res.send(text)
	} catch (err) {
		console.log("Error:", err)
		res.status(500).send(err.message) 
	}
});
app.listen(port, function () {
	console.log(`Running on port ${port}.`)
});
