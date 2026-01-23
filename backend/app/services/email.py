import resend
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.message import Message, MessageChannel
from app.models.application import Application
from app.models.client import Client, ClientUser
from app.models.user import User

# Initialize Resend
resend.api_key = settings.RESEND_API_KEY


def send_email(to: str, subject: str, html: str) -> bool:
    """Send an email using Resend"""
    if not settings.RESEND_API_KEY:
        print(f"[EMAIL - NO API KEY] To: {to}, Subject: {subject}")
        print(f"Would send: {html[:200]}...")
        return False
    
    try:
        params = {
            "from": settings.EMAIL_FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        }
        resend.Emails.send(params)
        print(f"[EMAIL SENT] To: {to}, Subject: {subject}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False


def send_invite_email(email: str, name: str, client_name: str, invite_token: str) -> bool:
    """Send an invite email to a client user"""
    invite_url = f"{settings.FRONTEND_URL}/accept-invite?token={invite_token}"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; }}
            .header {{ text-align: center; margin-bottom: 40px; }}
            .logo {{ width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6, #6366f1); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; }}
            .content {{ background: #f8fafc; border-radius: 12px; padding: 32px; margin-bottom: 24px; }}
            .button {{ display: inline-block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 24px 0; }}
            .footer {{ text-align: center; color: #64748b; font-size: 14px; }}
            .link {{ word-break: break-all; color: #3b82f6; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">G</div>
                <h1 style="margin: 0; color: #1e293b;">Grantus</h1>
                <p style="color: #64748b; margin: 8px 0 0;">Client Portal</p>
            </div>
            
            <div class="content">
                <h2 style="margin-top: 0;">You're Invited!</h2>
                <p>Hi{' ' + name if name else ''},</p>
                <p>You've been invited to join <strong>{client_name}</strong> on the Grantus Client Portal. This will give you access to track your organization's grant applications.</p>
                
                <div style="text-align: center;">
                    <a href="{invite_url}" class="button">Accept Invitation</a>
                </div>
                
                <p style="font-size: 14px; color: #64748b;">Or copy and paste this link into your browser:</p>
                <p class="link" style="font-size: 14px;">{invite_url}</p>
                
                <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">This invitation expires in 7 days.</p>
            </div>
            
            <div class="footer">
                <p>© {datetime.now().year} Grantus. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(
        to=email,
        subject=f"You're invited to {client_name} on Grantus",
        html=html
    )


async def send_status_notification(
    db: Session,
    application: Application,
    new_stage: str
):
    """Send email notification to client about status change"""
    client = db.query(Client).filter(Client.id == application.client_id).first()
    if not client:
        return
    
    grant = application.grant
    
    # Get client users with email
    client_users = db.query(ClientUser).filter(
        ClientUser.client_id == client.id
    ).all()
    
    for cu in client_users:
        user = db.query(User).filter(User.id == cu.user_id).first()
        if not user or not user.email:
            continue
        
        # Build email content
        subject = f"Application Update: {grant.name}"
        body = f"""
Dear {user.name or 'Client'},

Your grant application status has been updated.

Organization: {client.name}
Grant: {grant.name}
New Status: {new_stage.replace('_', ' ').title()}
Updated: {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p')}

{get_stage_message(new_stage)}

If you have any questions, please contact your grant coordinator.

Best regards,
The Grantus Team
        """.strip()
        
        # Send email if configured
        html_body = body.replace('\n', '<br>')
        send_email(user.email, subject, f"<p>{html_body}</p>")
        
        # Log message to database
        message = Message(
            client_id=client.id,
            application_id=application.id,
            channel=MessageChannel.email,
            subject=subject,
            body=body,
            sent_to=user.email,
            sent_at=datetime.utcnow(),
            created_by_user_id=None  # System-generated
        )
        
        db.add(message)
    
    db.commit()


def get_stage_message(stage: str) -> str:
    """Get a friendly message for each stage"""
    messages = {
        "draft": "Your application is being prepared.",
        "in_progress": "Your application is currently being worked on.",
        "submitted": "Great news! Your application has been submitted to the funder.",
        "awarded": "Congratulations! Your application has been awarded funding!",
        "declined": "We regret to inform you that your application was not successful this time.",
        "reporting": "Your funded project is now in the reporting phase.",
        "closed": "This application has been closed."
    }
    return messages.get(stage, "")
