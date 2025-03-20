import SibApiV3Sdk from 'sib-api-v3-sdk'

SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()

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
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = `Convite para participar da equipe ${teamName}`;
  sendSmtpEmail.htmlContent = `
    <h1>Você foi convidado para fazer parte da equipe ${teamName}!</h1>
    <p>Você foi convidado para participar como <strong>${roleName}</strong>.</p>
    <p>Para aceitar o convite, clique no link abaixo:</p>
    <p><a href="${inviteLink}">Aceitar Convite</a></p>
    <p>Este convite expira em 7 dias.</p>
  `;
  sendSmtpEmail.sender = { email: process.env.SMTP_FROM };
  sendSmtpEmail.to = [{ email }];
  
  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
