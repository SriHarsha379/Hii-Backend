import transporter from "../config/mailer_config.js";
import dotenv from "dotenv";
dotenv.config()
// var moment = require("moment");

import moment from "moment";


export async function mailer(
    email,
    fromName,
    app_name,
    message,
    subject,
    title,
    app_logo,
    otp
    // subject
) {




    // Message object
    let mailOptions = {
        from: "support@hii.life",
        to: email, // list of receivers
        subject: subject, // Subject line
        html: `<!DOCTYPE html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <title>Welcome to 'HII Services App '</title>
        </head>
    
        <body style="margin: 0; padding: 0; background-color:#ECEFF1; font-size:13px; color:#444; font-family:Arial, Helvetica, sans-serif; padding-top:70px; padding-bottom:70px;">
            <table  cellspacing="0" cellpadding="0" align="center" width="768" class="outer-tbl" style="margin:0 auto;">
            <tr>
                <td class="pad-l-r-b" style="background-color:#ECEFF1; padding:0 70px 40px;">
                    <table cellpadding="0" cellspacing="0" class="full-wid">
            
                    </table>
    
                <table cellpadding="0" cellspacing="0"  style="width:100%; background-color:#ffffff; border-radius:4px;box-shadow:0 0 20px #ccc;margin-top:40px">
            <tr>
            <td>
                <table border="0" style="margin:0; width:100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td class="logo" style="padding:25px 0 30px 0; text-align:center; border-bottom:1px solid #E1E1E1">
                            <img src="${app_logo}" alt="" width="20%" >
                            <h2>${title}</h2>
                        </td>
                    </tr>
                    <tr><td></td></tr>  
                    <tr>
                        <td class="content" style="padding:40px 40px;">
                            <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0"> Dear <b> ${fromName} </b> , </p>
                            
                            <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0"> ${message} <b> ${otp} </b> </p>
            
                            <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0; font-weight:bold">
                            Regards,                    
                            </p>
                            <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0;  font-weight:bold">
                          ${app_name}
                            </p>
                        </td>
                    </tr>
                    <tr>                
                        <td  style="background: #031B4E;  padding-bottom:60px;">
                            <table style="width:100%" border="0" cellspacing="0" cellpadding="0" class="full-wid" align="center">
                            <tr>
                                <td>     
                                    <div style="margin:0 auto; text-align:center; padding:0 100px" class="foot-items">
                                        <p style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#ffffff; margin-top:40px; line-height:20px;">
                                        &#169; ${moment().year()}  ${app_name} |  All right Reserved
                                        </p>
                                        <p style="font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#000000; line-height:20px; margin-bottom:40px;">
                                        <p style="font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#fff; line-height:20px;">
                                            This email and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed. 
                                                                If you have received this email in error, please notify the system manager. This message contains confidential information and is intended only for the individual named. 
                                                                If you are not the named addressee, you should not disseminate, distribute or copy this email. Please notify the sender immediately by email if you have received this email by mistake and delete this email from your system. 
                                                                If you are not the intended recipient, you are notified that disclosing, copying, distributing or taking any action in reliance on the contents of this information is strictly prohibited.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        
                </table>
                </td>
            </tr>              
    </table>
    </td>
    </tr>        
    </table>
    </td>
    </tr>   
    </table>
    </body>
    </html>`,
    };

    // Send mail with defined transport object
    try {
        let info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
        var data = {
            status: "yes",
            otp: otp,
        };
        return data;
    } catch (error) {
        console.error("Error occurred while sending email:", error.message);
        return "no";
    }
}

async function purchaseSubscription(
    email,
    fromName,
    app_name,
    message,
    subject,
    title,
    app_logo
) {
    // Assuming you have defined these variables somewhere
    const mailHost = "mail.hii.life";
    const mailPort = "465";
    const mailUsername = "support@hii.life";
    const mailPassword = "ZA3_N9fGSwNuZRIl";
    const mailSMTPSecure = "ssl";
    const mailFrom = "support@hii.life";

    // Create a SMTP transporter
    let transporter = nodemailer.createTransport({
        host: mailHost,
        port: mailPort,
        secure: mailSMTPSecure === "ssl",
        auth: {
            user: mailUsername,
            pass: mailPassword,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });

    // Message object
    let mailOptions = {
        from: "support@hii.life",
        to: email,
        subject: title,
        html: `<!DOCTYPE html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <title>Welcome to 'MUSA APP '</title>
        </head>
    
        <body style="margin: 0;	padding: 0; background-color:#ECEFF1; font-size:13px; color:#444; font-family:Arial, Helvetica, sans-serif;	padding-top:70px; padding-bottom:70px;">
            <table  cellspacing="0" cellpadding="0" align="center" width="768" class="outer-tbl" style="margin:0 auto;">
            <tr>
                <td class="pad-l-r-b" style="background-color:#ECEFF1; padding:0 70px 40px;">
                    <table cellpadding="0" cellspacing="0" class="full-wid">
            
                    </table>
    
                <table cellpadding="0" cellspacing="0"  style="width:100%; background-color:#FFFFFF; border-radius:4px;box-shadow:0 0 20px #ccc;margin-top:40px">
            <tr>
            <td>
                <table border="0" style="margin:0; width:100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td class="logo" style="padding:25px 0 30px 0; text-align:center; border-bottom:1px solid #E1E1E1">
                            <img src="${app_logo}" alt="" width="20%" >
                            <h2>${subject}</h2>
                        </td>
                    </tr>
                    <tr><td></td></tr>	
                    <tr>
                        <td class="content" style="padding:40px 40px;">
                            <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0"> Dear <b> ${fromName} </b> , </p>
                            
                            <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0"> ${message} </p>
            
                            <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0; font-weight:bold">
                            Best Regards,                  	
                            </p>
                            <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0;  font-weight:bold">
                          ${app_name} 
                            </p>
                        </td>
                    </tr>
                    <tr>              	
                        <td  style="background: #14CA5D;  padding-bottom:60px;">
                            <table style="width:100%" border="0" cellspacing="0" cellpadding="0" class="full-wid" align="center">
                            <tr>
                                <td>	 
                                    <div style="margin:0 auto; text-align:center; padding:0 100px" class="foot-items">
                                        <p style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#ffffff; margin-top:40px; line-height:20px;">
                                        &#169; ${moment().year()}  ${app_name} |  All right Reserved
                                        </p>
                                        <p style="font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#000000; line-height:20px; margin-bottom:40px;">
                                        <p style="font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#fff; line-height:20px;">
                                            This email and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed. 
                                                                If you have received this email in error, please notify the system manager. This message contains confidential information and is intended only for the individual named. 
                                                                If you are not the named addressee, you should not disseminate, distribute or copy this email. Please notify the sender immediately by email if you have received this email by mistake and delete this email from your system. 
                                                                If you are not the intended recipient, you are notified that disclosing, copying, distributing or taking any action in reliance on the contents of this information is strictly prohibited.
                                        </p>



                                        
                                    </div>
                                </td>
                            </tr>
                        
                </table>
                </td>
            </tr>              
    </table>
    </td>
    </tr>        
    </table>
    </td>
    </tr>   
    </table>
    </body>
    </html>`,
    };

    // Send mail with defined transport object
    try {
        let info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
        var data = {
            status: "yes",
        };
        return data;
    } catch (error) {
        console.error("Error occurred while sending email:", error.message);
        return "no";
    }
}


async function contectusMailer(
    admin_name,
    user_type_name,
    email,
    app_name,
    message,
    title,
    app_logo = "https://example.com/default-logo.png"
) {
    let mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: title,
        html: `<!DOCTYPE html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta charset="UTF-8">
        <title>Welcome to ${app_name}</title>
    </head>
    <body style="margin: 0; padding: 0; font-size:13px; color:#444; font-family:Arial, Helvetica, sans-serif; padding-top:70px; padding-bottom:70px;">
        <table cellspacing="0" cellpadding="0" align="center" width="768" class="outer-tbl" style="margin:0 auto;">
        <tr>
            <td class="pad-l-r-b" style="background-color:#ECEFF1; padding:0 70px 40px;">
                <table cellpadding="0" cellspacing="0" class="full-wid">
                </table>
                <table cellpadding="0" cellspacing="0" style="width:100%; background-color:#FFFFFF; border-radius:4px;box-shadow:0 0 20px #ccc;margin-top:40px">
                <tr>
                <td>
                    <table border="0" style="margin:0; width:100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td class="logo" style="padding:25px 0 30px 0; text-align:center; border-bottom:1px solid #E1E1E1">
                                 <img src=${app_logo} alt="logo" width="20%" >
                                <h2>Contact to ${user_type_name}</h2>
                            </td>
                        </tr>
                        <tr><td></td></tr>  
                        <tr>
                            <td class="content" style="padding:40px 40px;">
                                <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0"> Dear <b> ${user_type_name}, </b></p>
                                <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0"> <b>  ${admin_name}  </b> Want to contact with you..!! </p>
                                <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0"> <b> Email : </b> ${email} ,</p>
                                <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0">  <b> Message : </b> ${message}. </p>
                                <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0; font-weight:bold">
                                Regards,                    
                                </p>
                                <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0;  font-weight:bold">
                                ${app_name}
                                </p>
                            </td>
                        </tr>
                        <tr>                
                            <td style="background-color:#5DC89A; padding-bottom:60px;">
                                <table style="width:100%" border="0" cellspacing="0" cellpadding="0" class="full-wid" align="center">
                                <tr>
                                    <td>     
                                        <div style="margin:0 auto; text-align:center; padding:0 100px" class="foot-items">
                                            <p style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#ffffff; margin-top:40px; line-height:20px;">
                                            &#169;   ${moment().year()} ${app_name} |  All right Reserved
                                            </p>
                                            <p style="font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#000000; line-height:20px; margin-bottom:40px;">
                                            <p style="font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#fff; line-height:20px;">
                                                This email and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed. 
                                                If you have received this email in error, please notify the system manager. This message contains confidential information and is intended only for the individual named. 
                                                If you are not the named addressee, you should not disseminate, distribute or copy this email. Please notify the sender immediately by email if you have received this email by mistake and delete this email from your system. 
                                                If you are not the intended recipient, you are notified that disclosing, copying, distributing or taking any action in reliance on the contents of this information is strictly prohibited.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                </table>
                            </td>
                        </tr>              
                    </table>
                </td>
                </tr>   
            </table>
        </td>
        </tr>   
        </table>
    </body>
    </html>`,
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
        return "yes";
    } catch (error) {
        console.error("Error occurred while sending email:", error.message);
        return "no";
    }
}

// mailfunction.js
// Nodemailer transporter
var mailSMTPSecure = "ssl";

// var transporter = nodemailer.createTransport({
//   host: "mail.hii.life",
//   port: 465, // Port number should be an integer
//   secure: mailSMTPSecure === "ssl", // true for 465, false for other ports
//   auth: {
//     user: "support@hii.life",
//     pass: "ZA3_N9fGSwNuZRIl",
//   },
//   tls: {
//     rejectUnauthorized: false, // for testing purposes only, to avoid certificate validation errors
//   },
// });

// Function to send email
async function sendMail(email, subject, mailBody) {
    const mailOptions = {
        from: "support@hii.life",
        to: email,
        subject: subject,
        html: mailBody,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        return { success: true, message: "Email sent successfully", info };
    } catch (error) {
        return {
            success: false,
            message: "Failed to send email",
            error: error.message,
        };
    }
}

// forget password

var mailSMTPSecure = "ssl";

// var transporter = nodemailer.createTransport({
//   host: "mail.hii.life",
//   port: 465, // Port number should be an integer
//   secure: mailSMTPSecure === "ssl", // true for 465, false for other ports
//   auth: {
//     user: "support@hii.life",
//     pass: "ZA3_N9fGSwNuZRIl",
//   },
//   tls: {
//     rejectUnauthorized: false, // for testing purposes only, to avoid certificate validation errors
//   },
// });

// Function to send email
async function ForgetPasswordMail(email, subject, mailBody) {
    const mailOptions = {
        from: "support@hii.life",
        to: email,
        subject: subject,
        html: mailBody,
    };

    try {
        // Use transporter to send email
        const info = await transporter.sendMail(mailOptions);
        return {
            success: true,
            message: "Forget password email sent successfully.",
            info,
        };
    } catch (error) {
        return {
            success: false,
            message: "Failed to send forget password email.",
            error: error.message,
        };
    }
}


function mailBodyForgetPassword(postData) {


    console.log(postData)
    const year = new Date().getFullYear();
    const mailBody = `<!DOCTYPE html>



    <head>



        <meta name="viewport" content="width=device-width, initial-scale=1" />



        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />



        <meta charset="UTF-8">



        <title>Welcome to ${postData.app_name}</title>



    </head>



    <body style="margin: 0; padding: 0; font-size:13px; color:#444; font-family:Arial, Helvetica, sans-serif; padding-top:70px; padding-bottom:70px;">



        <table cellspacing="0" cellpadding="0" align="center" width="768" class="outer-tbl" style="margin:0 auto;">



        <tr>



            <td class="pad-l-r-b" style="background-color:#ECEFF1; padding:0 70px 40px;">



                <table cellpadding="0" cellspacing="0" class="full-wid">



                </table>



                <table cellpadding="0" cellspacing="0" style="width:100%; background-color:#FFFFFF; border-radius:4px;box-shadow:0 0 20px #ccc;margin-top:40px">


                <tr>

                <td>

                    <table border="0" style="margin:0; width:100%" cellpadding="0" cellspacing="0">

                        <tr>

                            <td class="logo" style="padding:25px 0 30px 0; text-align:center; border-bottom:1px solid #E1E1E1">


                                <img src=${postData.app_logo} alt="" width="20%" >

                                <h2>Forgot Your Password</h2>

                            </td>

                        </tr>

                        <tr><td></td></tr>  

                        <tr>

                            <td class="content" style="padding:40px 40px;">


                                <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0"> Dear <b> ${postData.adminName}, </b></p>

                                <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0"> <b> Email : </b> ${postData.adminEmail} ,</p>

                    <br /><br />

                                <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0"> </b>Recently a request was submitted to reset a password for your account. If this was a mistake, just ignore this email and nothing will happen. </p>


                                <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0"> </b>To reset your password, visit the following link </p>

                                <br />

<center>
  <a href="${postData.resetLink}" 
     style="display: inline-block; padding: 10px 20px; border-radius: 10px; border: none; background: #0A0A0F; color: #fff; text-decoration: none; text-align: center;">
    Reset Password
  </a>
</center>

                               Reset Password
                              </a></button></center>

                                <br /><br />

                                <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0; font-weight:bold">



                                Regards,                    



                                </p>



                                <p style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#333333; margin-top:0;  font-weight:bold">

                                ${postData.app_name} Team



                                </p>



                            </td>



                        </tr>



                        <tr>                



                            <td style="background-color:#0A0A0F; padding-bottom:60px;">



                                <table style="width:100%" border="0" cellspacing="0" cellpadding="0" class="full-wid" align="center">



                                <tr>



                                    <td>     



                                        <div style="margin:0 auto; text-align:center; padding:0 100px" class="foot-items">



                                            <p style="font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#ffffff; margin-top:40px; line-height:20px;">



                                            &#169;   ${year} ${postData.app_name} App Team |  All right Reserved



                                            </p>



                                            <p style="font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#000000; line-height:20px; margin-bottom:40px;">



                                            <p style="font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#fff; line-height:20px;">



                                                This email and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed. 



                                                If you have received this email in error, please notify the system manager. This message contains confidential information and is intended only for the individual named. 



                                                If you are not the named addressee, you should not disseminate, distribute or copy this email. Please notify the sender immediately by email if you have received this email by mistake and delete this email from your system. 



                                                If you are not the intended recipient, you are notified that disclosing, copying, distributing or taking any action in reliance on the contents of this information is strictly prohibited.



                                            </p>



                                        </div>



                                    </td>



                                </tr>



                                </table>



                            </td>



                        </tr>              



                    </table>



                </td>



                </tr>   



            </table>



        </td>



        </tr>   



        </table>



    </body>



    </html>`;







    return mailBody;



}

function mailBodyVendorForgetPassword(postData) {
    const year = new Date().getFullYear();

    return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta charset="UTF-8">
      <title>Reset Password - ${postData.app_name}</title>
  </head>

  <body style="margin:0; padding:0; font-size:13px; color:#444; font-family:Arial; padding-top:70px; padding-bottom:70px;">

  <table cellspacing="0" cellpadding="0" align="center" width="768" style="margin:0 auto;">
    <tr>
      <td style="background-color:#ECEFF1; padding:0 70px 40px;">

        <table cellpadding="0" cellspacing="0" style="width:100%; background-color:#FFFFFF; border-radius:4px; box-shadow:0 0 20px #ccc; margin-top:40px">

          <tr>
            <td style="padding:25px 0 30px 0; text-align:center; border-bottom:1px solid #E1E1E1">
              <img src="${postData.app_logo}" width="20%" />
              <h2>Vendor Password Reset</h2>
            </td>
          </tr>

          <tr>
            <td style="padding:40px;">
              <p>Dear <b>${postData.vendorName}</b>,</p>

              <p><b>Email:</b> ${postData.vendorEmail}</p>

              <p>
                A request was received to reset your vendor account password.
                If you did not request this, please ignore this email.
              </p>

              <p>To reset your password, click below:</p>

              <center>
                <a href="${postData.resetLink}"
                   style="display:inline-block; padding:12px 25px; border-radius:8px; background:#0A0A0F; color:#fff; text-decoration:none;">
                  Reset Password
                </a>
              </center>

              <br/><br/>

              <p style="font-weight:bold;">Regards,</p>
              <p style="font-weight:bold;">${postData.app_name} Team</p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#0A0A0F; padding:40px; text-align:center;">
              <p style="color:#ffffff;">
                © ${year} ${postData.app_name}. All Rights Reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

  </body>
  </html>
  `;
}

async function vendorStatusMailer(
    vendor_name,
    vendor_email,
    app_name,
    status_type, // "activated" or "deactivated"
    reason = "",
    app_logo = process.env.APP_LOGO
) {
    // Debug log to see what's being passed
    console.log(`📧 vendorStatusMailer called with:`, {
        vendor_name,
        vendor_email,
        app_name,
        status_type,
        reason,
        app_logo
    });

    // Fix: Correct status text
    const subject = status_type === "activated"
        ? `Your ${app_name} Vendor Account Has Been Activated`
        : `Your ${app_name} Vendor Account Has Been Deactivated`;

    const status_text = status_type; // Should be "activated" or "deactivated"

    // Fix: Correct action text based on status
    const action_text = status_type === "activated"
        ? "You can now access all vendor features."
        : "You cannot access vendor features until your account is reactivated.";

    // Fix: Correct badge color
    const badge_color = status_type === 'activated' ? '#28a745' : '#dc3545';
    const badge_text = status_type === 'activated' ? 'ACTIVATED' : 'DEACTIVATED';
    const status_display_text = status_type === 'activated' ? 'Activated' : 'Deactivated';

    let mailOptions = {
        from: `"${app_name}" <${process.env.SMTP_USER}>`,
        to: vendor_email,
        subject: subject,
        html: `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account ${status_display_text}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { background: #00163D; color: white; padding: 30px 20px; text-align: center; }
            .logo { max-width: 150px; margin-bottom: 15px; }
            .content { padding: 30px; }
            .status-badge { 
                display: inline-block; 
                padding: 10px 20px; 
                border-radius: 20px; 
                font-weight: bold; 
                margin: 20px 0; 
                color: white;
                background-color: ${badge_color};
            }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; }
            .contact-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .btn { 
                display: inline-block; 
                padding: 10px 20px; 
                background: #00163D; 
                color: white; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 10px 0; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                ${app_logo ? `<img src="${app_logo}" alt="${app_name} Logo" class="logo">` : ''}
                <h1>${app_name}</h1>
                <h2>Vendor Account Update</h2>
            </div>
            
            <div class="content">
                <h3>Dear ${vendor_name},</h3>
                
                <p>This is to inform you that your vendor account has been <strong>${status_text}</strong> by the administration team.</p>
                
                <div class="status-badge">
                    Account ${badge_text}
                </div>
                
                <p>${action_text}</p>
                
                ${reason ? `<div class="contact-info"><strong>Reason:</strong> ${reason}</div>` : ''}
                
                <p><strong>Account Details:</strong></p>
                <ul>
                    <li><strong>Name:</strong> ${vendor_name}</li>
                    <li><strong>Email:</strong> ${vendor_email}</li>
                    <li><strong>Status:</strong> ${status_display_text}</li>
                    <li><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}</li>
                </ul>
                
                ${status_type === 'deactivated' ? `
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                    <p><strong>⚠️ Important:</strong> If you believe this was done in error, please contact our support team.</p>
                </div>
                ` : ''}
                
                <p>If you have any questions or concerns, please don't hesitate to contact our support team.</p>
                
                <div class="contact-info">
                    <p><strong>Contact Support:</strong></p>
                    <p>Email: support@${app_name.toLowerCase().replace(/\s+/g, '')}.com</p>
                    <p>Phone: +1-XXX-XXX-XXXX</p>
                </div>
                
                <a href="mailto:support@${app_name.toLowerCase().replace(/\s+/g, '')}.com" class="btn">
                    Contact Support
                </a>
            </div>
            
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ${app_name}. All rights reserved.</p>
                <p>This email was sent to ${vendor_email} because you are a registered vendor.</p>
                <p>If you no longer wish to receive these emails, please contact support.</p>
            </div>
        </div>
    </body>
    </html>`
    };

    try {
        console.log(`📧 Sending ${status_type} email to vendor: ${vendor_email}`);
        console.log(`📧 Email subject: ${subject}`);
        console.log(`📧 Status badge: ${badge_text}`);

        let info = await transporter.sendMail(mailOptions);
        console.log(`✅ ${status_type} email sent successfully to ${vendor_email}: ${info.messageId}`);

        return {
            success: true,
            messageId: info.messageId,
            status: status_type,
            subject: subject
        };
    } catch (error) {
        console.error(`❌ Failed to send ${status_type} email to ${vendor_email}:`, error.message);
        return {
            success: false,
            error: error.message,
            status: status_type
        };
    }
}

// Also add this function for general vendor notifications
// async function vendorNotificationMailer(
//     vendor_name,
//     vendor_email,
//     app_name,
//     subject,
//     message,
//     action_text = "",
//     app_logo = process.env.APP_LOGO
// ) {
//     let mailOptions = {
//         from: `"${app_name}" <${process.env.SMTP_USER}>`,
//         to: vendor_email,
//         subject: subject,
//         html: `<!DOCTYPE html>
//     <html>
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>${subject}</title>
//         <style>
//             body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
//             .email-container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; }
//             .header { background: linear-gradient(135deg, #00163D 0%, #003366 100%); color: white; padding: 30px; text-align: center; }
//             .content { padding: 30px; color: #333; }
//             .message-box { background: #f8f9fa; border-left: 4px solid #00163D; padding: 20px; margin: 20px 0; }
//             .footer { background: #f0f0f0; padding: 20px; text-align: center; color: #666; font-size: 12px; }
//             .button { display: inline-block; background: #00163D; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
//             .logo { max-width: 150px; margin-bottom: 15px; }
//         </style>
//     </head>
//     <body>
//         <div class="email-container">
//             <div class="header">
//                 ${app_logo ? `<img src="${app_logo}" alt="Logo" class="logo">` : ''}
//                 <h1>${app_name}</h1>
//                 <h2>Vendor Notification</h2>
//             </div>

//             <div class="content">
//                 <h3>Hello ${vendor_name},</h3>

//                 <div class="message-box">
//                     ${message}
//                 </div>

//                 ${action_text ? `
//                 <div style="text-align: center; margin: 25px 0;">
//                     <p>${action_text}</p>
//                 </div>
//                 ` : ''}

//                 <p><strong>Account Information:</strong></p>
//                 <ul>
//                     <li><strong>Vendor Name:</strong> ${vendor_name}</li>
//                     <li><strong>Email:</strong> ${vendor_email}</li>
//                     <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
//                 </ul>

//                 <p>If you have any questions, please contact our support team:</p>
//                 <p><strong>Support Email:</strong> support@${app_name.toLowerCase().replace(/\s+/g, '')}.com</p>

//                 <div style="text-align: center; margin-top: 30px;">
//                     <a href="mailto:support@${app_name.toLowerCase().replace(/\s+/g, '')}.com" class="button">
//                         Contact Support
//                     </a>
//                 </div>
//             </div>

//             <div class="footer">
//                 <p>&copy; ${new Date().getFullYear()} ${app_name}. All rights reserved.</p>
//                 <p>This is an automated notification. Please do not reply to this email.</p>
//                 <p>You are receiving this email because you are a registered vendor.</p>
//             </div>
//         </div>
//     </body>
//     </html>`
//     };

//     try {
//         console.log(`📧 Sending vendor notification to: ${vendor_email}`);
//         let info = await transporter.sendMail(mailOptions);
//         console.log(`✅ Vendor notification sent: ${info.messageId}`);
//         return { success: true, messageId: info.messageId };
//     } catch (error) {
//         console.error(`❌ Vendor notification failed:`, error.message);
//         return { success: false, error: error.message };
//     }
// }

async function vendorNotificationMailer(
    vendor_name,
    vendor_email,
    password,
    app_name,
    subject,
    message,
    action_text = "",
    app_logo = 'https://hii.life/app/server/uploads/hii_dark_logo.png'
) {

    let mailOptions = {
        from: process.env.SMTP_USER, // ✅ same as contact mail
        to: vendor_email,
        subject: subject,
        html: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
<style>
body {
    margin: 0;
    padding: 0;
    background-color: #f5f5f5;
    font-family: Arial, Helvetica, sans-serif;
    color: #333333;
}
.container {
    max-width: 768px;
    margin: 0 auto;
    padding: 40px 20px;
}
.content-wrapper {
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 0 15px #e0e0e0;
    overflow: hidden;
}
.header {
    padding: 25px 20px;
    text-align: center;
    border-bottom: 1px solid #eeeeee;
}
.logo {
    max-width: 120px;
    margin-bottom: 10px;
}
.content {
    padding: 40px;
    line-height: 1.6;
}
.message-box {
    background-color: #f8f9fa;
    padding: 20px;
    border-radius: 6px;
    margin: 20px 0;
}
.footer {
    padding: 30px 20px;
    text-align: center;
    border-top: 1px solid #eeeeee;
    font-size: 13px;
    background-color: #ffffff;
}
</style>
</head>

<body>
<div class="container">
<div class="content-wrapper">

    <div class="header">
        ${app_logo ? `<img src="${app_logo}" alt="${app_name}" class="logo" />` : ''}
        <h2 style="margin:10px 0 0 0;">${subject}</h2>
    </div>

    <div class="content">
        <p style="font-size:16px;">
            Hello <strong>${vendor_name}</strong>,
        </p>

        <div class="message-box">
            ${message}
        </div>

        ${action_text ? `<p style="margin-top:20px;">${action_text}</p>` : ''}

        <div style="margin-top:30px; font-size:14px;">
            <p><strong>Vendor Name:</strong> ${vendor_name}</p>
            <p><strong>Email:</strong> ${vendor_email}</p>
            <p><strong>Password:</strong> ${password}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <p style="margin-top:30px;">
            <strong>Regards,</strong><br/>
            ${app_name}
        </p>
    </div>

    <div class="footer">
        <p style="margin:0 0 10px 0;">
            © ${new Date().getFullYear()} ${app_name} | All rights reserved.
        </p>
        <p style="margin:0; max-width:600px; margin:0 auto;">
            This email and any files transmitted with it are confidential.
            If you received this email by mistake, please notify the sender
            and delete it immediately.
        </p>
    </div>

</div>
</div>
</body>
</html>`
    };

    try {

        console.log("📤 Preparing vendor email for:", vendor_email);

        let info = await transporter.sendMail(mailOptions);

        console.log("✅ Vendor notification sent:", info.messageId);

        return "yes"; // ✅ same return as contact mail

    } catch (error) {

        console.error("❌ Vendor notification failed:", error);

        return "no";
    }
}


// OTP send on email
function mailBodyEmailOtp(postData) {

    const year = new Date().getFullYear();

    const mailBody = `<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta charset="UTF-8">
    <title>${postData.app_name} - Email Verification</title>
</head>

<body style="margin:0; padding:0; font-size:13px; color:#444; font-family:Arial, Helvetica, sans-serif; padding-top:70px; padding-bottom:70px;">

<table cellspacing="0" cellpadding="0" align="center" width="768" style="margin:0 auto;">
<tr>
<td style="background-color:#ECEFF1; padding:0 70px 40px;">

<table cellpadding="0" cellspacing="0" style="width:100%; background-color:#FFFFFF; border-radius:4px; box-shadow:0 0 20px #ccc; margin-top:40px">
<tr>
<td>

<table border="0" width="100%" cellpadding="0" cellspacing="0">

<tr>
<td style="padding:25px 0 30px 0; text-align:center; border-bottom:1px solid #E1E1E1">
    <img src="${postData.app_logo}" alt="" width="20%" />
    <h2 style="margin-top:15px;">Email Verification</h2>
</td>
</tr>

<tr>
<td style="padding:40px 40px;">

<p style="font-size:15px; color:#333;">Dear <b>${postData.name}</b>,</p>

<p style="font-size:15px; color:#333;">
You requested to verify your email address for your <b>${postData.app_name}</b> account.
</p>

<p style="font-size:15px; color:#333;">
Please use the OTP below to complete the verification process:
</p>

<br/>

<center>
    <div style="
        display:inline-block;
        padding:15px 40px;
        font-size:22px;
        font-weight:bold;
        letter-spacing:4px;
        background:#0A0A0F;
        color:#ffffff;
        border-radius:10px;
    ">
        ${postData.otp}
    </div>
</center>

<br/><br/>

<p style="font-size:14px; color:#333;">
This OTP is valid for a limited time. Please do not share it with anyone.
</p>

<p style="font-size:14px; color:#333;">
If you did not request this, you can safely ignore this email.
</p>

<br/>

<p style="font-size:15px; font-weight:bold;">
Regards,
</p>

<p style="font-size:15px; font-weight:bold;">
${postData.app_name} Team
</p>

</td>
</tr>

<tr>
<td style="background-color:#0A0A0F; padding-bottom:60px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:0 100px;">

<p style="font-size:14px; color:#ffffff; margin-top:40px;">
&#169; ${year} ${postData.app_name} App Team | All Rights Reserved
</p>

<p style="font-size:12px; color:#ffffff; line-height:20px;">
This email and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed.
If you have received this email in error, please notify the sender and delete this email.
</p>

</td>
</tr>
</table>
</td>
</tr>

</table>

</td>
</tr>
</table>

</td>
</tr>
</table>

</body>
</html>`;

    return mailBody;
}



export default {
    sendMail,
    // mailer,
    mailBodyForgetPassword,
    ForgetPasswordMail,
    contectusMailer,
    purchaseSubscription,
    vendorStatusMailer,
    vendorNotificationMailer,
    mailBodyEmailOtp,
    mailBodyVendorForgetPassword
};
