const getEmailTemplate = (username: string, verificationLink: string) => {
  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify Your Email</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #121212">
    <!-- Main wrapper -->
    <table
      role="presentation"
      style="width: 100%; border-collapse: collapse; background-color: #121212; padding: 20px"
      cellpadding="0"
      cellspacing="0"
    >
      <tr>
        <td align="center">
          <!-- Email container -->
          <table
            role="presentation"
            style="width: 100%; max-width: 600px; background-color: #292929; padding: 20px; border-radius: 8px"
            cellpadding="0"
            cellspacing="0"
          >
            <!-- Header -->
            <tr>
              <td align="center" style="padding: 10px 0">
                <img
                  src="https://via.placeholder.com/150x50?text=Your+Logo"
                  alt="Your Logo"
                  style="border: 0; max-width: 100%; height: auto"
                />
              </td>
            </tr>

            <!-- Main content -->
            <tr>
              <td style="padding: 20px; text-align: left; color: #ffffff">
                <h1 style="color: #ffffff; font-size: 24px">Verify Your Email Address</h1>
                <p style="font-size: 16px; line-height: 1.5; color: #ffffff">Hi <strong>${username}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.5; color: #ffffff">
                  Thank you for signing up at <strong>Sagittarius</strong>. To complete your registration, please verify
                  your email address by clicking the button below:
                </p>

                <!-- Verification Button -->
                <table
                  role="presentation"
                  style="width: 100%; border-collapse: collapse; margin: 20px 0"
                  cellpadding="0"
                  cellspacing="0"
                >
                  <tr>
                    <td align="center">
                      <a
                        href="${verificationLink}"
                        style="
                          background-color: #5d54a4;
                          color: #ffffff;
                          padding: 12px 20px;
                          text-decoration: none;
                          font-size: 18px;
                          border-radius: 5px;
                          display: inline-block;
                        "
                        >Verify Email</a
                      >
                    </td>
                  </tr>
                </table>

                <!-- Optional message -->
                <p style="font-size: 14px; color: #aaaaaa">
                  If the button doesn't work, please open this link in your browser:
                </p>
                <p style="font-size: 14px; color: #5d54a4; word-break: break-all">${verificationLink}</p>
                <p style="font-size: 14px; color: #aaaaaa">
                  If you did not sign up for this account, please ignore this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding: 20px; background-color: #292929">
                <p style="font-size: 12px; color: #6a679e">2024 Sagittarius.</p>
                <p style="font-size: 12px; color: #6a679e">Krems an der Doanu, Austria</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};

export default getEmailTemplate;
