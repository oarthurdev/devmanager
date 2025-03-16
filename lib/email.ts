import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendTeamInvitation({
  email,
  teamName,
  roleName,
  inviteLink
}: {
  email: string
  teamName: string
  roleName: string
  inviteLink: string
}) {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: email,
    subject: `Convite para participar da equipe ${teamName}`,
    html: `
      <h1>Você foi convidado para fazer parte da equipe ${teamName}!</h1>
      <p>Você foi convidado para participar como <strong>${roleName}</strong>.</p>
      <p>Para aceitar o convite, clique no link abaixo:</p>
      <p><a href="${inviteLink}">Aceitar Convite</a></p>
      <p>Este convite expira em 7 dias.</p>
    `
  }

  try {
    await transporter.sendMail(mailOptions)
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}