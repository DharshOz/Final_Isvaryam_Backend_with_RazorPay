import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

router.post('/send-contact-email', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!email || !name || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const adminMailOptions = {
      from: `"Isvaryam Contact Form" <${process.env.EMAIL_USER}>`,
      to: 'v.gugan16@gmail.com',
      subject: `New Contact Message: ${subject}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong> ${message}</p>
      `,
    };

    const userMailOptions = {
      from: `"Isvaryam Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Thanks for contacting Isvaryam!',
      html: `
        <p>Hi ${name},</p>
        <p>Thanks for reaching out. We’ve received your message:</p>
        <blockquote>${message}</blockquote>
        <p>We’ll get back to you shortly.</p>
        <p>Regards,<br/>Team Isvaryam</p>
      `,
    };

    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    res.status(200).json({ message: 'Emails sent successfully' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

export default router;
