"""
Email sending utilities using Gmail SMTP.
Handles all email notifications for the system.
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from email_templates import (
    build_email_verification_html,
    build_item_disabled_email_html,
    build_item_enabled_email_html,
    build_order_shipped_email_html,
    build_order_cancelled_email_html,
)


def _get_email_config() -> tuple[str, str]:
    """Get email configuration from environment variables."""
    contact_recipient = os.getenv("CONTACT_EMAIL", "shathesisgroup@gmail.com")
    gmail_app_password = os.getenv("GMAIL_APP_PASSWORD", "")
    return contact_recipient, gmail_app_password


def send_email(
    recipient_email: str,
    subject: str,
    html_body: str,
) -> bool:
    """
    Send an email via Gmail SMTP.
    
    Args:
        recipient_email: Email address to send to
        subject: Email subject
        html_body: HTML content of the email
        
    Returns:
        True if successful, False otherwise
    """
    contact_email, gmail_password = _get_email_config()
    
    if not gmail_password:
        print(f"[EMAIL ERROR] GMAIL_APP_PASSWORD not set")
        return False
    
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = contact_email
        msg["To"] = recipient_email
        msg["Subject"] = subject
        
        # Attach HTML content
        msg.attach(MIMEText(html_body, "html"))
        
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(contact_email, gmail_password)
            server.sendmail(contact_email, recipient_email, msg.as_string())
        
        print(f"[EMAIL SUCCESS] Email sent to {recipient_email}: {subject}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"[EMAIL ERROR] Gmail authentication failed: {str(e)}")
        return False
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send email to {recipient_email}: {str(e)}")
        return False


def send_verification_email(user_email: str, user_name: str, verification_link: str) -> bool:
    """
    Send email verification email.
    
    Args:
        user_email: User's email address
        user_name: User's display name
        verification_link: URL for email verification
        
    Returns:
        True if successful, False otherwise
    """
    html_body = build_email_verification_html(user_name, verification_link)
    
    return send_email(
        recipient_email=user_email,
        subject="[DaingGrader] Verify Your Email Address",
        html_body=html_body,
    )


def send_item_disabled_email(
    user_email: str,
    user_name: str,
    item_type: str,
    item_name: str,
    reason: Optional[str] = None,
    admin_name: Optional[str] = None,
    admin_email: Optional[str] = None,
) -> tuple[bool, bool]:
    """
    Send notification email when an item is disabled.
    Sends email to both user and admin.
    
    Args:
        user_email: Email of the item owner
        user_name: Name of the item owner
        item_type: Type of item (account, product, comment, scan, review)
        item_name: Name/title of the disabled item
        reason: Optional reason for disabling
        admin_name: Name of the admin
        admin_email: Email of the admin who performed the action
        
    Returns:
        Tuple of (user_email_sent, admin_email_sent)
    """
    html_body = build_item_disabled_email_html(
        recipient_name=user_name,
        item_type=item_type,
        item_name=item_name,
        reason=reason,
        admin_name=admin_name,
    )
    
    # Send to user
    user_email_sent = send_email(
        recipient_email=user_email,
        subject=f"[DaingGrader] Your {item_type.capitalize()} Has Been Disabled",
        html_body=html_body,
    )
    
    # Send to admin (if email provided)
    admin_email_sent = True
    if admin_email:
        admin_html = html_body.replace(
            "Hi <strong>", 
            "Admin Action Log - "
        )
        admin_email_sent = send_email(
            recipient_email=admin_email,
            subject=f"[DaingGrader Admin] {item_type.capitalize()} Disabled - {item_name}",
            html_body=admin_html,
        )
    
    return user_email_sent, admin_email_sent


def send_item_enabled_email(
    user_email: str,
    user_name: str,
    item_type: str,
    item_name: str,
    admin_name: Optional[str] = None,
    admin_email: Optional[str] = None,
) -> tuple[bool, bool]:
    """
    Send notification email when an item is re-enabled/enabled.
    Sends email to both user and admin.
    
    Args:
        user_email: Email of the item owner
        user_name: Name of the item owner
        item_type: Type of item (account, product, comment, scan, review)
        item_name: Name/title of the enabled item
        admin_name: Name of the admin
        admin_email: Email of the admin who performed the action
        
    Returns:
        Tuple of (user_email_sent, admin_email_sent)
    """
    html_body = build_item_enabled_email_html(
        recipient_name=user_name,
        item_type=item_type,
        item_name=item_name,
        admin_name=admin_name,
    )
    
    # Send to user
    user_email_sent = send_email(
        recipient_email=user_email,
        subject=f"[DaingGrader] Your {item_type.capitalize()} Has Been Re-enabled",
        html_body=html_body,
    )
    
    # Send to admin (if email provided)
    admin_email_sent = True
    if admin_email:
        admin_html = html_body.replace(
            "Hi <strong>",
            "Admin Action Log - "
        )
        admin_email_sent = send_email(
            recipient_email=admin_email,
            subject=f"[DaingGrader Admin] {item_type.capitalize()} Re-enabled - {item_name}",
            html_body=admin_html,
        )
    
    return user_email_sent, admin_email_sent


def send_order_shipped_email(
    customer_email: str,
    customer_name: str,
    order_number: str,
    items: list,
    total: float,
    address: dict,
) -> bool:
    """
    Send notification email to the customer when their order is shipped.
    
    Returns:
        True if email sent successfully, False otherwise
    """
    html_body = build_order_shipped_email_html(
        customer_name=customer_name,
        order_number=order_number,
        items=items,
        total=total,
        address=address,
    )
    return send_email(
        recipient_email=customer_email,
        subject=f"[DaingGrader] Your Order #{order_number} Has Been Shipped!",
        html_body=html_body,
    )


def send_order_cancelled_email(
    customer_email: str,
    customer_name: str,
    order_number: str,
    items: list,
    total: float,
    reason: str = None,
) -> bool:
    """
    Send notification email to the customer when their order is cancelled.
    
    Returns:
        True if email sent successfully, False otherwise
    """
    html_body = build_order_cancelled_email_html(
        customer_name=customer_name,
        order_number=order_number,
        items=items,
        total=total,
        reason=reason,
    )
    return send_email(
        recipient_email=customer_email,
        subject=f"[DaingGrader] Your Order #{order_number} Has Been Cancelled",
        html_body=html_body,
    )