const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendContactNotification = async ({ name, email, message }) => {
  const mailOptions = {
    from: `"Notificador Portfolio" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO,
    replyTo: email,
    subject: `Nuevo CONTACTO en el PORTAFOLIO. ${name}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 40px 20px; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          
          <!-- Encabezado -->
          <div style="background-color: #0069d9; padding: 35px 30px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 26px; letter-spacing: 1px;">¡Nuevo Mensaje!</h2>
            <p style="color: #99caff; margin: 10px 0 0 0; font-size: 18px;">Alguien ha contactado desde tu portfolio</p>
          </div>
          
          <!-- Cuerpo del mensaje -->
          <div style="padding: 40px 30px; font-size: 18px; line-height: 1.8;">
            <p style="margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 15px;"><strong>👤 Nombre:</strong> ${name}</p>
            <p style="border-bottom: 1px solid #eee; padding-bottom: 15px;"><strong>✉️ Email:</strong> <a href="mailto:${email}" style="color: #007bff; text-decoration: none; font-weight: bold;">${email}</a></p>
            
            <div style="margin-top: 30px;">
              <p style="margin-bottom: 12px; color: #555; font-weight: bold;">💬 Mensaje:</p>
              <div style="background-color: #e7f1ff; padding: 25px; border-left: 5px solid #007bff; border-radius: 6px; white-space: pre-wrap; font-style: italic; color: #444; font-size: 19px;">${message}</div>
            </div>
          </div>
          
          <!-- Footer del correo -->
          <div style="background-color: #f1f1f1; padding: 25px; text-align: center; font-size: 15px; color: #777;">
            <p style="margin: 0;">Este es un aviso automático del sistema.</p>
          </div>
          
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Correo de notificación de contacto enviado correctamente.');
  } catch (error) {
    console.error('Error al enviar el correo de notificación de contacto:', error);
  }
};