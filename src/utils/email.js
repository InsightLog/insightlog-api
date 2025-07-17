import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY); // Add key in .env

export const sendInviteEmail = async ({ email, team, user }) => {
  const registerUrl = `https://insightlog.onrender.com/v1/invite/register?teamId=${team.id}&email=${encodeURIComponent(email)}`;

  return await resend.emails.send({
    from: 'InsightLog <onboarding@resend.dev>',
    to: email,
    subject: `🚀 ${user.name} invited you to join team "${team.name}" on InsightLog`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; background-color: #0e0f1a; color: #e0e0e0; padding: 2rem; border-radius: 12px; max-width: 600px; margin: auto; box-shadow: 0 0 10px rgba(0,0,0,0.6);">
        
        <h1 style="text-align: center; color: #7f5af0; font-size: 1.8rem; margin-bottom: 0.5rem;">
          🔮 InsightLog
        </h1>
        
        <p style="text-align: center; color: #94a1b2; font-size: 0.95rem; margin-top: 0;">
          Track, Share, and Grow Knowledge as a Team
        </p>

        <hr style="border: 1px solid #2a2a3f; margin: 1.5rem 0;" />

        <p style="font-size: 1rem; line-height: 1.6;">
          Hey there 👋,
        </p>

        <p style="font-size: 1rem; line-height: 1.6;">
          <strong>${user.name}</strong> (<span style="color: #7f5af0;">${user.role}</span>) has invited you to join their team <strong>${team.name}</strong> on <strong>InsightLog</strong>.
        </p>

        <div style="text-align: center; margin: 2rem 0;">
          <a href="${registerUrl}" 
             style="display: inline-block; padding: 0.75rem 1.5rem; background-color: #7f5af0; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1rem;">
            ✅ Accept Invitation
          </a>
        </div>

        <p style="font-size: 0.9rem; color: #999; text-align: center;">
          This link will take you to the registration page and automatically associate your account with the team.
        </p>

        <hr style="border: 1px solid #2a2a3f; margin: 2rem 0;" />

        <p style="font-size: 0.8rem; color: #666; text-align: center;">
          If you weren’t expecting this invitation, feel free to ignore it. This invitation will expire in 7 days.
        </p>
      </div>
    `,
  });
};
