require("dotenv").config();
var {driver} = require("@rocket.chat/sdk");
var MailBot = require("./mailbot");


var mailbot = new MailBot({
	mbox: "/var/mail/lamp",
	smtp: {
		host: "localhost",
		port: 25,
		ehlo: "uvias.com",
		from: "lamp@uvias.com"
	}
});

(async function RCinit(){
	await driver.connect();
	await driver.login();
	await driver.subscribeToMessages();
	var receivedMessageIds = [];
	await driver.reactToMessages(async function onMessage(e, m, mo){
		if (m.u._id == driver.userId) return;
		if (!m.mentions && !m.channels) return;
		if (receivedMessageIds.includes(m._id)) return;
		else receivedMessageIds.push(m._id);
		if (m.rid == "RRs5zwrv6PqWwBzYr") {
			try {
				await mailbot.send(process.env.TARGET_EMAIL, null, `${m.u.username}: ${m.msg}`);
				await driver.setReaction(":white_check_mark:", m._id);
			} catch(e) {
				console.error(e);
				await driver.setReaction(":warning:", m._id);
			}
		}
	});
})();

mailbot.on("mail", async mail => {
	var msg = mail.text || mail.html || (mail.attachments[0] && mail.attachments[0].content.toString());
	msg = msg.replace(new RegExp(process.env.TARGET_EMAIL.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), "[redacted]");
	await driver.sendToRoom(msg, "RRs5zwrv6PqWwBzYr");
});

