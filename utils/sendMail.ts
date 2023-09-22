import nodemailer, {Transporter} from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
require("dotenv").config({path:"./config/.env"});

interface EmailOptions {
    email: string;
    subject: string;
    template: string;
    data: {[key:string]:any};
}

const senDMail = async (options: EmailOptions):Promise <void> => {
    const transporter: Transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465'),
        service: process.env.SMTP_SERVICE,
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        },
    });

    const {email, subject, template, data} = options;

    // get the pdath to the emial template file
    const emailTemplatePath = path.join(__dirname, `../mails`, template);


    // render the email template with EJS
    const html:string = await ejs.renderFile(emailTemplatePath, data);

    const mailOptions = {
        from: process.env.SMTP_MAIL,
        to: email,
        subject,
        html
    };

    await transporter.sendMail(mailOptions);
    console.log(transporter);

};

export default senDMail;