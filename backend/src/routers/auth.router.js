import nodemailer from 'nodemailer';
const otpStore = new Map(); // Or use Redis/Mongo for production

router.post(
  '/send-otp',
  handler(async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP temporarily (expires in 5 mins)
    otpStore.set(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    // Send OTP using nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'your_email@gmail.com',
        pass: 'your_app_password',
      },
    });

    await transporter.sendMail({
      from: '"Isvaryam" <your_email@gmail.com>',
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP is: ${otp}`,
    });

    res.send({ message: 'OTP sent successfully' });
  })
);

