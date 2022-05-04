'use strict';
const puppeteer = require('puppeteer');
const express = require('express');
const favicon = require('serve-favicon')
const path = require('path')
const fs = require('fs');

class Delayer {
	constructor(ips) {
		if (ips == null) {
			ips = {}
		}
		this.ips = ips
		this.deleteExpired()
	}
	deleteExpired() {
		for (const [ip, val] of Object.entries(this.ips)) {
			if (val.expires != null && val.expires < new Date().getTime()) {
				delete this.ips[ip]
			}
		}
	}
	delete(ip) {
		delete this.ips[ip]
	}
	add(ip, duration) {
		if (duration == null) {
			duration = 0
		}
		let expires = new Date().getTime() + duration
		if (duration <= 0) {
			expires = null	// never expires (perm ban)
		}
		this.ips[ip] = {
			expires: expires
		}
		if (duration > 0) {
			setTimeout(() => {
				this.delete(ip)
			}, duration)
		}
	}
	isRestricted(ip) {
		return this.ips[ip] != null
	}
}

let config
const configPath = path.join(__dirname, 'config.json')
if (fs.existsSync(configPath)) {
	config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
} else {
	config = {
		port: 8080,
		delay: 30000,
		chrome_args: [
			'--no-sandbox',
			'--disable-setuid-sandbox'
		],
		unrestricted: [
			'127.0.0.1'
		]
	}
	fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
}

const port = process.env.PORT || config.port;
const delayer = new Delayer()
const app = express()

function isUrlValid(url) {
    try {
      new URL(url);
      return true;
    } catch (_) {
      return false;
    }
  };

async function fetchText(url) {
	console.log("Launching puppeteer...")
	const browser = await puppeteer.launch({
		args: config.chrome_args
	})
	const page = await browser.newPage()
	console.log("Opening url...")
	let content, success = true;
	try {
		await page.goto(url)
		content = await page.$eval('*', (el) => el.innerText)
	} catch (err) {
		console.log("Error:", err)
		content = err.message
		success = false
	}
	console.log("Closing browser...")
	await browser.close()
	console.log("Done.")
	return [success, content]
}

app.use(favicon(path.join(__dirname, 'favicon.ico')))
app.get('/*', async (req, res) => {
	let url = req.url.substring(1)
	const ip = req.ip.replace('::ffff:', '')
	console.log(`Got requrest from ${ip} (proxy: ${req.ips}): ${url}`)
	if (url.length === 0) {
		res.send('Hello world!')
		return
	}
	if (!url.includes("://")) {
		url = `https://${url}`
	}
	if (!isUrlValid(url)) {
		res.status(400).send('Invalid URL')
		return
	}
	if (!config.unrestricted.includes(ip)) {
		console.log("Checking ip...")
		if (delayer.isRestricted(ip)) {
			console.log(`${ip} is restricted`)
			res.status(429).send('Too many requests.')
			return
		}
		delayer.add(ip, config.delay)
	}
	const [success, text] = await fetchText(url)
	console.log("Sending result...")
	if (success) {
		res.send(text)
	} else {
		res.status(500).send(text)
	}
	
});
app.listen(port, function () {
	console.log(`Running on port ${port}.`)
});
