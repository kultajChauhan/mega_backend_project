import Mailgen from "mailgen";

const sendEmail = async (Option) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      // Appears in header & footer of e-mails
      name: "Mailgen",
      link: "https://mailgen.js/",
      // Optional product logo
      // logo: 'https://mailgen.js/img/logo.png'
    },
  });

  // Generate an HTML email with the provided contents
  const emailBody = mailGenerator.generate(Option.mailgenContent);

  // Generate the plaintext version of the e-mail (for clients that do not support HTML)
  const emailText = mailGenerator.generatePlaintext(Option.mailgenContent);

  var transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "e9c413f6bc010d",
      pass: "8b700b8b5f052c",
    },
  });

  await transporter.sendMail({
    from: "abc@abc.com",
    to: Option.email,
    subject: Option.subject,
    text: emailText, // plain‑text body
    html: emailBody, // HTML body
  });
};

const emailVerificationMailgenContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to OurApp! We're very excited to have you on board.",
      action: {
        instructions: "To get started with Mailgen, please verify our email:",
        button: {
          color: "#22BC66", // Optional action button color
          text: "Confirm your account",
          link: verificationUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

const forgotPasswordMailgenContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to OurApp! We're very excited to have you on board.",
      action: {
        instructions: "To get started with Mailgen, please click here:",
        button: {
          color: "#22BC66", // Optional action button color
          text: "Confirm your account",
          link: verificationUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

export {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
};
