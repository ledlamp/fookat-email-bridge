var {EventEmitter} = require("events");
var fs = require("fs");
var Mbox = require("node-mbox");
var {simpleParser} = require("mailparser");
var {SMTPClient} = require("smtp-client");

class MailBot extends EventEmitter {
	
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
	
	async send(to, subject, body) {
		console.log("sending mail", {to, subject, body});
		var smtpClient = new SMTPClient(this.smtp);
		await smtpClient.connect();
		await smtpClient.greet({hostname: this.smtp.ehlo});
		await smtpClient.mail({from: this.smtp.from});
		await smtpClient.rcpt({to});
		await smtpClient.data((subject ? `Subject: ${subject}\n` : '') + '\r\n\r\n' + body);
		await smtpClient.quit();
		console.log("finished sending mail");
	}
	
}

module.exports = MailBot;

