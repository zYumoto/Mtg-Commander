const nodemailer = require("nodemailer");

function getConfiguredTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);

  if (!host) return null;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
}

async function sendMail({ to, subject, text, html }) {
  const transport = getConfiguredTransport();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@mtg-commander.local";

  if (!transport) {
    console.log("SMTP nao configurado. Link de recuperacao:");
    console.log(text);
    return { delivered: false };
  }

  await transport.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  return { delivered: true };
}

module.exports = {
  sendMail,
};
