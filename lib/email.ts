export async function sendTeamInvitation({
  email,
  teamName,
  roleName,
  inviteLink
}: {
  email: string;
  teamName: string;
  roleName: string;
  inviteLink: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SMTP_FROM;

  const requestData = {
    sender: { email: senderEmail },
    to: [{ email }],
    subject: `Convite para participar da equipe ${teamName}`,
    htmlContent: `
      <h1>Você foi convidado para fazer parte da equipe ${teamName}!</h1>
      <p>Você foi convidado para participar como <strong>${roleName}</strong>.</p>
      <p>Para aceitar o convite, clique no link abaixo:</p>
      <p><a href="${inviteLink}">Aceitar Convite</a></p>
      <p>Este convite expira em 7 dias.</p>
    `
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(requestData)
    });

    if (response.ok) {
      console.log('Email enviado com sucesso');
      return true;
    } else {
      const errorData = await response.json();
      console.error('Erro ao enviar o email:', errorData);
      return false;
    }
  } catch (error) {
    console.error('Erro ao enviar o email:', error);
    return false;
  }
}
