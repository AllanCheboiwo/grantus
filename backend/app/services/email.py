from datetime import datetime
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.message import Message, MessageChannel
from app.models.application import Application
from app.models.client import Client, ClientUser
from app.models.user import User


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
        
        # In production, actually send the email here
        # For MVP, we just log the message
        
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
