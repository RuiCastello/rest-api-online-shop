/*
 * Copyright (C) 2021 Rui Castello Santos <rui.fullstack@gmail.com> - All Rights Reserved
 * You may use this code for educational purposes only. No commercial use allowed.
 */

const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

class SendEmail {

    constructor(user, url){
        this.to = user.email;
        this.firstName = user.name.split(' ')[0];
        this.url = url;
        this.from = 'Rui Santos <' + process.env.EMAIL_SENDER + '>'
    }

    emailTransport(){
        return nodemailer.createTransport({
            service: 'SendGrid',
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: { rejectUnauthorized: false }
        });
    }

    async send(template, subject){

        //Usar um pug template para enviar email
        const html = pug.renderFile(__dirname+"/../views/"+template+".pug", {
            firstName: this.firstName,
            url: this.url,
            subject
        });
        
        const mailOptions = {
            from: this.from,
            to: this.to, 
            subject: subject,
            text: htmlToText.fromString(html),
            html: html,
        }

        await this.emailTransport().sendMail(mailOptions);
    }

    async sendReset(){
        await this.send('passreset', 'Password reset - rest-api-online-shop - Node.js, Express, Mongoose!');
    }

} //end SendEmail class


module.exports = SendEmail;