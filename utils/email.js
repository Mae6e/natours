const nodemailer = require('nodemailer');
const pug = require('pug');
const { convert } = require('html-to-text');
const nodemailerSendgrid = require('nodemailer-sendgrid');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = process.env.EMAIL_FROM;
    //this.from = `Maede <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    // if (process.env.NODE_ENV === 'production') {
    //   //send grid
    //   return nodemailer.createTransport({
    //     service: 'SendGrid',
    //     auth: {
    //       user: process.env.SENDGRID_USERNAME,
    //       pass: process.env.SENDGRID_PASSWORD,
    //     },
    //   });
    // }
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  //send the actual email
  async send(template, subject) {
    try {
      // 1.render html based on a pug template
      const html = pug.renderFile(
        `${__dirname}/../views/email/${template}.pug`,
        {
          firstName: this.firstName,
          url: this.url,
          subject: subject,
        }
      );

      // 2.defind email options
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: convert(html),
      };

      console.log(mailOptions.from, mailOptions.to);

      // 3.create a transport and send email
      await this.newTransport().sendMail(mailOptions);
    } catch (err) {
      console.log(err);
    }
  }

  async sendWelcome() {
    await this.send('welcome', 'welcome to the natours family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'your password reset token (valid only 10 minutes)'
    );
  }
};
