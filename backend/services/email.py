from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from config import settings
from typing import Optional

# Email configuration
def get_mail_config() -> Optional[ConnectionConfig]:
    """Get email configuration if SMTP is configured."""
    if not settings.mail_username or not settings.mail_password:
        return None
    
    return ConnectionConfig(
        MAIL_USERNAME=settings.mail_username,
        MAIL_PASSWORD=settings.mail_password,
        MAIL_FROM=settings.mail_from or settings.mail_username,
        MAIL_FROM_NAME=settings.mail_from_name,
        MAIL_PORT=settings.mail_port,
        MAIL_SERVER=settings.mail_server,
        MAIL_STARTTLS=settings.mail_use_tls,
        MAIL_SSL_TLS=settings.mail_use_ssl,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True
    )


async def send_verification_email(email: EmailStr, token: str) -> bool:
    """Send email verification link."""
    config = get_mail_config()
    if not config:
        print(f"[EMAIL] SMTP not configured. Verification token for {email}: {token}")
        return False
    
    verification_url = f"{settings.frontend_url}/verify-email?token={token}"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f7; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .card {{ background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }}
            .logo {{ text-align: center; margin-bottom: 30px; }}
            .logo h1 {{ color: #4F46E5; margin: 0; font-size: 32px; }}
            h2 {{ color: #1a1a2e; margin-bottom: 20px; }}
            p {{ color: #4a4a68; line-height: 1.6; }}
            .button {{ display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
            .button:hover {{ opacity: 0.9; }}
            .footer {{ text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="logo">
                    <h1>🧠 Intelekt</h1>
                </div>
                <h2>Verify Your Email</h2>
                <p>Welcome to Intelekt! Please verify your email address to complete your registration.</p>
                <p>Click the button below to verify your email:</p>
                <a href="{verification_url}" class="button">Verify Email</a>
                <p style="font-size: 14px; color: #9ca3af;">If you didn't create an account with Intelekt, you can safely ignore this email.</p>
                <p style="font-size: 12px; color: #9ca3af;">This link will expire in 24 hours.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Intelekt. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    message = MessageSchema(
        subject="Verify Your Email - Intelekt",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )
    
    try:
        fm = FastMail(config)
        await fm.send_message(message)
        return True
    except Exception as e:
        print(f"[EMAIL] Failed to send verification email: {e}")
        return False


async def send_password_reset_email(email: EmailStr, token: str) -> bool:
    """Send password reset link."""
    config = get_mail_config()
    if not config:
        print(f"[EMAIL] SMTP not configured. Reset token for {email}: {token}")
        return False
    
    reset_url = f"{settings.frontend_url}/reset-password?token={token}"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f7; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .card {{ background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }}
            .logo {{ text-align: center; margin-bottom: 30px; }}
            .logo h1 {{ color: #4F46E5; margin: 0; font-size: 32px; }}
            h2 {{ color: #1a1a2e; margin-bottom: 20px; }}
            p {{ color: #4a4a68; line-height: 1.6; }}
            .button {{ display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }}
            .button:hover {{ opacity: 0.9; }}
            .footer {{ text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px; }}
            .warning {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="logo">
                    <h1>🧠 Intelekt</h1>
                </div>
                <h2>Reset Your Password</h2>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <a href="{reset_url}" class="button">Reset Password</a>
                <div class="warning">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ This link will expire in 1 hour for security reasons.</p>
                </div>
                <p style="font-size: 14px; color: #9ca3af;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 Intelekt. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    message = MessageSchema(
        subject="Reset Your Password - Intelekt",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )
    
    try:
        fm = FastMail(config)
        await fm.send_message(message)
        return True
    except Exception as e:
        print(f"[EMAIL] Failed to send password reset email: {e}")
        return False
