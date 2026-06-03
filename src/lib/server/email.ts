/**
 * Email sender. If RESEND_API_KEY is configured, sends a real verification
 * email via Resend. Otherwise runs in DEV MODE — logs the code to the server
 * console and signals the caller to surface it in the UI.
 */
import { env } from '$env/dynamic/private';

export interface SendResult {
	sent: boolean; // true if a real email went out
	devCode?: string; // present in dev mode so the UI can show it
}

export async function sendVerificationCode(email: string, code: string): Promise<SendResult> {
	const apiKey = env.RESEND_API_KEY;

	if (!apiKey) {
		// Dev mode — no provider configured
		console.log(`\n[EMAIL DEV MODE] Verification code for ${email}: ${code}\n`);
		return { sent: false, devCode: code };
	}

	try {
		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: env.EMAIL_FROM || 'Emanet <onboarding@resend.dev>',
				to: [email],
				subject: 'Your Emanet verification code',
				html: `<div style="font-family:sans-serif">
					<h2>Emanet — Verify your email</h2>
					<p>Your verification code is:</p>
					<p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
					<p style="color:#888">Expires in 10 minutes.</p>
				</div>`
			})
		});
		if (!res.ok) {
			console.error('[EMAIL] Resend failed:', await res.text());
			return { sent: false, devCode: code };
		}
		return { sent: true };
	} catch (e) {
		console.error('[EMAIL] error:', e);
		return { sent: false, devCode: code };
	}
}
