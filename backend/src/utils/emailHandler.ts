import nodemailer, { Transporter } from "nodemailer";
import logger from "./logger";

interface EmailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    from?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: Array<{
        filename: string;
        path?: string;
        content?: string | Buffer;
    }>;
}

interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
}

class EmailHandler {
    private transporter: Transporter | null = null;
    private defaultFrom: string;

    constructor() {
        this.defaultFrom = process.env.EMAIL_FROM || "noreply@steadygig.com";
        this.initializeTransporter();
    }

    private initializeTransporter(): void {
        try {
            const emailConfig: EmailConfig = {
                host: process.env.EMAIL_HOST || "smtp.gmail.com",
                port: parseInt(process.env.EMAIL_PORT || "587"),
                secure: process.env.EMAIL_SECURE === "true",
                auth: {
                    user: process.env.EMAIL_USER || "",
                    pass: process.env.EMAIL_PASSWORD || "",
                },
            };

            if (!emailConfig.auth.user || !emailConfig.auth.pass) {
                logger.warn(
                    "Email credentials not configured. Email service will not work.",
                );
                return;
            }

            this.transporter = nodemailer.createTransport(emailConfig);

            this.transporter.verify((error) => {
                if (error) {
                    logger.error(
                        "Email transporter verification failed:",
                        error,
                    );
                } else {
                    logger.info("Email service is ready to send messages");
                }
            });
        } catch (error) {
            logger.error("Failed to initialize email transporter:", error);
        }
    }

    async sendEmail(options: EmailOptions): Promise<boolean> {
        if (!this.transporter) {
            logger.error(
                "Email transporter not initialized. Cannot send email.",
            );
            return false;
        }

        try {
            const mailOptions = {
                from: options.from || this.defaultFrom,
                to: Array.isArray(options.to)
                    ? options.to.join(", ")
                    : options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
                cc: options.cc
                    ? Array.isArray(options.cc)
                        ? options.cc.join(", ")
                        : options.cc
                    : undefined,
                bcc: options.bcc
                    ? Array.isArray(options.bcc)
                        ? options.bcc.join(", ")
                        : options.bcc
                    : undefined,
                attachments: options.attachments,
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Email sent successfully: ${info.messageId}`);
            return true;
        } catch (error) {
            logger.error("Failed to send email:", error);
            return false;
        }
    }

    async sendVerificationEmail(
        to: string,
        verificationToken: string,
        userName?: string,
    ): Promise<boolean> {
        const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${verificationToken}`;

        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Email Verification</h1>
            </div>
            <div class="content">
              <p>Hello ${userName || "there"},</p>
              <p>Thank you for signing up with SteadyGig! Please verify your email address by clicking the button below:</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account with SteadyGig, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} SteadyGig. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

        return this.sendEmail({
            to,
            subject: "Verify Your Email - SteadyGig",
            html,
            text: `Hello ${userName || "there"},\n\nThank you for signing up with SteadyGig! Please verify your email by visiting: ${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, please ignore this email.`,
        });
    }

    async sendPasswordResetEmail(
        to: string,
        resetToken: string,
        userName?: string,
    ): Promise<boolean> {
        const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF5722; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #FF5722; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello ${userName || "there"},</p>
              <p>We received a request to reset your password for your SteadyGig account.</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              <div class="warning">
                <strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} SteadyGig. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

        return this.sendEmail({
            to,
            subject: "Password Reset Request - SteadyGig",
            html,
            text: `Hello ${userName || "there"},\n\nWe received a request to reset your password. Visit this link to reset it: ${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
        });
    }

    async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to SteadyGig!</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>Welcome to SteadyGig! We're excited to have you on board.</p>
              <p>You can now start exploring opportunities and connecting with others in the gig economy.</p>
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard" class="button">Get Started</a>
              </p>
              <p>If you have any questions, feel free to reach out to our support team.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} SteadyGig. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

        return this.sendEmail({
            to,
            subject: "Welcome to SteadyGig!",
            html,
            text: `Hello ${userName},\n\nWelcome to SteadyGig! We're excited to have you on board.\n\nYou can now start exploring opportunities and connecting with others in the gig economy.\n\nIf you have any questions, feel free to reach out to our support team.`,
        });
    }
}

const emailHandler = new EmailHandler();

export default emailHandler;
export { EmailOptions, EmailHandler };
