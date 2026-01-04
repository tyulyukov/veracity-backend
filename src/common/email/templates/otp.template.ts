export function buildOtpEmailHtml(code: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #141414; border-radius: 16px; border: 1px solid #262626;">
          <tr>
            <td style="padding: 48px 40px; text-align: center;">
              <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                Password Reset
              </h1>
              <p style="margin: 0 0 40px 0; font-size: 15px; color: #737373; line-height: 1.5;">
                Use this code to reset your password
              </p>
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px; padding: 32px; margin-bottom: 32px; border: 1px solid #262626;">
                <span style="font-size: 48px; font-weight: 800; letter-spacing: 12px; color: #ffffff; font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;">
                  ${code}
                </span>
              </div>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #525252;">
                This code expires in <strong style="color: #a3a3a3;">10 minutes</strong>
              </p>
              <p style="margin: 0; font-size: 13px; color: #525252;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #262626; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #404040;">
                © ${new Date().getFullYear()} Veracity. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
