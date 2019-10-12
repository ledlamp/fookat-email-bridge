require("dotenv").config();
var {driver} = require("@rocket.chat/sdk");
var MailInterface = require("./mailinterface");


var mint = new MailInterface({
	mbox: "/var/mail/lamp",
	smtp: {
		host: "localhost",
		port: 25,
		ehlo: "uvias.com",
		from: "lamp@uvias.com"
	},
	target: process.env.TARGET_EMAIL
});

var open = false;


(async function RCinit(){
	await driver.connect();
	await driver.login();
	await driver.subscribeToMessages();
	var receivedMessageIds = [];
	await driver.reactToMessages(async function onMessage(e, m, mo){
		if (m.rid != "RRs5zwrv6PqWwBzYr") return;
		if (m.u._id == driver.userId) return;
		if (!m.mentions && !m.channels) return;
		if (receivedMessageIds.includes(m._id)) return;
		else receivedMessageIds.push(m._id);
		try {
			if (open) {
				await mint.send(`${m.u.username}: ${m.msg}`);
				await driver.setReaction(":white_check_mark:", m._id);
			} else {
				await driver.setReaction(":no_entry_sign:", m._id);
			}
		} catch(e) {
			console.error(e);
			await driver.setReaction(":warning:", m._id);
		}
	});
})();


mint.on("mail", async mail => {
	if (mail.from.text != process.env.TARGET_EMAIL) {
		require('fs').appendFileSync("unknown_emails.txt", JSON.stringify(mail, null, 4) + '\n\n\n\n');
		return;
	};
	var msg = mail.text || mail.html || (mail.attachments[0] && mail.attachments[0].content.toString());
	if (msg.startsWith('/')) {
		let args = msg.split(' ');
		let cmd = args[0].substr(1);
		switch(cmd) {
			case "ping":
				await mint.send("pong");
				break;
			case "open":
				open = true;
				await mint.send("ready"); //TODO send list of past msgs
				break;
			case "close":
				open = false;
				await mint.send("closed");
				break;
			case "eval":
				let o;
				try { o = await eval(args.slice(1).join(' ')) } catch(e) { o = e }
				o = require("util").inspect(o);
				mint.send(String(o));
				break;
			default:
				mint.send("unknown cmd");
		}
	} else if (open) {
			msg = msg.replace(new RegExp(process.env.TARGET_EMAIL.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), "[redacted]");
			await driver.sendToRoom(msg, "RRs5zwrv6PqWwBzYr");
	}
});

