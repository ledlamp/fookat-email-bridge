var {EventEmitter} = require("events");
var fs = require("fs");
var Mbox = require("node-mbox");
var {simpleParser} = require("mailparser");
var {SMTPClient} = require("smtp-client");

class MailInterface extends EventEmitter {
	
	constructor(opts) {
		super();
		Object.assign(this, opts);
		fs.watch(this.mbox, eventType => {
			if (eventType != "change") return;
			this.check();
		});
	}
	
	check() {
		console.log("checking mail");
		if (fs.statSync(this.mbox).size == 0) return console.log("no mail");
		var mbox = new Mbox(this.mbox);
		var gotMail = false;
		mbox.on("message", msg => {
			simpleParser(msg).then(parsedMail => {
				console.log("parsed mail:\n", parsedMail);
				this.emit("mail", parsedMail);
			});
		});
		mbox.on("error", console.error);
		mbox.on("end", () => {
			console.log("finished loading mail");
			fs.writeFileSync(this.mbox, '');
		});
	}
	
	async send(body) {
		console.log("sending mail:", body);
		var smtpClient = new SMTPClient(this.smtp);
		await smtpClient.connect();
		await smtpClient.greet({hostname: this.smtp.ehlo});
		await smtpClient.mail({from: this.smtp.from});
		await smtpClient.rcpt({to: this.target});
		var msg = '\r\n' + body.replace(/\n/g, '\r\n') + '\r\n';
		/*var msg = 'MIME-Version: 1.0\r\n' +
			'Content-Type: multipart/alternative; boundary="asdfhuiadfghviuarevhilu"\r\n' +
			"\r\n" +
			"--asdfhuiadfghviuarevhilu\r\n" +
			'Content-Type: text/plain; charset="UTF-8"\r\n' +
			'\r\n' + body.replace(/\n/g, '\r\n') + '\r\n' +
			'\r\n' +
			"--asdfhuiadfghviuarevhilu\r\n" +
			'Content-Type: text/html; charset="UTF-8"\r\n' +
			'\r\n<div dir="ltr">' + body.replace(/\n/g, '\r\n') + '</div>\r\n' +
			'\r\n' +
			'--asdfhuiadfghviuarevhilu--\r\n';*/
		await smtpClient.data(msg);
		await smtpClient.quit();
		console.log("finished sending mail");
	}
	
}

module.exports = MailInterface;

