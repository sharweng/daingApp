"""
Email template builder for various system notifications.
Supports beautiful, responsive HTML emails with a professional design.
"""

from datetime import datetime
from typing import Optional


SYSTEM_NAME = "DaingGrader"
SYSTEM_COLOR = "#3b82f6"  # Blue
SYSTEM_COLOR_LIGHT = "#dbeafe"  # Light blue


def get_email_header() -> str:
    """Returns the HTML header and styling for all emails."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background-color: #f8fafc;
                margin: 0;
                padding: 20px;
                color: #334155;
            }}
            .email-container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: white;
                border-radius: 12px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
                overflow: hidden;
            }}
            .email-header {{
                background: linear-gradient(135deg, {SYSTEM_COLOR} 0%, #1e40af 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
            }}
            .email-header h1 {{
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                letter-spacing: -0.5px;
            }}
            .email-header p {{
                margin: 8px 0 0 0;
                font-size: 14px;
                opacity: 0.9;
            }}
            .email-body {{
                padding: 40px 30px;
            }}
            .email-body h2 {{
                color: #0f172a;
                font-size: 20px;
                margin: 0 0 20px 0;
                font-weight: 600;
            }}
            .email-body p {{
                line-height: 1.6;
                margin: 0 0 16px 0;
                color: #475569;
            }}
            .highlight-box {{
                background-color: {SYSTEM_COLOR_LIGHT};
                border-left: 4px solid {SYSTEM_COLOR};
                padding: 16px;
                border-radius: 6px;
                margin: 20px 0;
            }}
            .highlight-box p {{
                margin: 0;
                color: #1e3a8a;
                font-weight: 500;
            }}
            .info-grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 20px 0;
                background-color: #f1f5f9;
                padding: 20px;
                border-radius: 8px;
            }}
            .info-item {{
                font-size: 14px;
            }}
            .info-item-label {{
                color: #64748b;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }}
            .info-item-value {{
                color: #0f172a;
                font-size: 16px;
                font-weight: 600;
            }}
            .button {{
                display: inline-block;
                background-color: {SYSTEM_COLOR};
                color: white;
                padding: 12px 24px;
                border-radius: 6px;
                text-decoration: none;
                font-weight: 600;
                font-size: 14px;
                margin: 20px 0;
                text-align: center;
                border: none;
                cursor: pointer;
            }}
            .button:hover {{
                background-color: #1e40af;
            }}
            .footer {{
                background-color: #f8fafc;
                padding: 30px;
                text-align: center;
                font-size: 12px;
                color: #64748b;
                border-top: 1px solid #e2e8f0;
            }}
            .footer a {{
                color: {SYSTEM_COLOR};
                text-decoration: none;
            }}
            .divider {{
                height: 1px;
                background-color: #e2e8f0;
                margin: 30px 0;
            }}
            .status-badge {{
                display: inline-block;
                padding: 6px 12px;
                border-radius: 4px;
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}
            .status-disabled {{
                background-color: #fee2e2;
                color: #991b1b;
            }}
            .status-enabled {{
                background-color: #dcfce7;
                color: #166534;
            }}
            .timestamp {{
                color: #94a3b8;
                font-size: 12px;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
    """


def get_email_footer() -> str:
    """Returns the HTML footer for all emails."""
    return """
        <div class="footer">
            <p style="margin: 0 0 10px 0;">
                © """ + datetime.now().strftime("%Y") + """ DaingGrader. All rights reserved.
            </p>
            <p style="margin: 0;">
                This is an automated message. Please do not reply to this email.
            </p>
        </div>
        </div>
    </body>
    </html>
    """


def build_email_verification_html(user_name: str, verification_link: str) -> str:
    """Build HTML for email verification email."""
    return (
        get_email_header()
        + f"""
        <div class="email-header">
            <h1>DaingGrader</h1>
            <p>Email Verification Required</p>
        </div>

        <div class="email-body">
            <h2>Welcome to DaingGrader!</h2>
            
            <p>Hi <strong>{user_name}</strong>,</p>
            
            <p>Thank you for creating an account with us. To get started, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
                <a href="{verification_link}" class="button">Verify Email Address</a>
            </div>
            
            <p style="font-size: 13px; color: #64748b;">
                Or copy and paste this link in your browser:<br>
                <span style="word-break: break-all;"><a href="{verification_link}" style="color: {SYSTEM_COLOR}; text-decoration: none;">{verification_link}</a></span>
            </p>
            
            <div class="highlight-box">
                <p>⏱️ This link expires in 24 hours. If you didn't create this account, please ignore this email.</p>
            </div>
            
            <p>Need help? Reply to this email or contact our support team.</p>
            
            <p>Best regards,<br><strong>DaingGrader Team</strong></p>
        </div>
        """
        + get_email_footer()
    )


def build_item_disabled_email_html(
    recipient_name: str,
    item_type: str,
    item_name: str,
    reason: Optional[str] = None,
    admin_name: Optional[str] = None,
) -> str:
    """
    Build HTML for item disabled notification email.
    
    Args:
        recipient_name: Name of the person receiving the email
        item_type: Type of item (account, product, comment, scan, review)
        item_name: Name/title of the disabled item
        reason: Optional reason for disabling
        admin_name: Name of the admin who disabled the item
    """
    item_type_display = item_type.capitalize()
    timestamp = datetime.now().strftime("%B %d, %Y at %H:%M")
    
    return (
        get_email_header()
        + f"""
        <div class="email-header">
            <h1>DaingGrader</h1>
            <p>{item_type_display} Disabled</p>
        </div>

        <div class="email-body">
            <h2>Your {item_type_display} Has Been Disabled</h2>
            
            <p>Hi <strong>{recipient_name}</strong>,</p>
            
            <p>We wanted to inform you that your {item_type} "<strong>{item_name}</strong>" has been disabled by our moderation team.</p>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-item-label">Item Type</div>
                    <div class="info-item-value">{item_type_display}</div>
                </div>
                <div class="info-item">
                    <div class="info-item-label">Status</div>
                    <div class="status-badge status-disabled">Disabled</div>
                </div>
                <div class="info-item">
                    <div class="info-item-label">Item Name</div>
                    <div class="info-item-value" style="font-size: 14px; word-break: break-word;">{item_name}</div>
                </div>
                <div class="info-item">
                    <div class="info-item-label">Timestamp</div>
                    <div class="info-item-value" style="font-size: 13px;">{timestamp}</div>
                </div>
            </div>
            
            {f'<div class="highlight-box"><p><strong>Reason:</strong> {reason}</p></div>' if reason else ''}
            
            <h3 style="color: #0f172a; font-size: 16px; margin-top: 30px; margin-bottom: 12px;">What This Means</h3>
            <p>Your {item_type} is no longer visible to other users and has been temporarily deactivated. {
                "Your account is still accessible to you for review purposes." if item_type.lower() == "account" else 
                "You can still view it from your dashboard for reference."
            }</p>
            
            <h3 style="color: #0f172a; font-size: 16px; margin-top: 30px; margin-bottom: 12px;">Next Steps</h3>
            <p>If you believe this is a mistake or would like to appeal this decision, please contact our support team at <strong>support@daigrader.com</strong> with the details of your {item_type}.</p>
            
            <div class="divider"></div>
            
            <p style="font-size: 13px; color: #64748b; margin: 0;">
                Questions? Reply to this email or contact our support team.
            </p>
            
            <p style="margin-top: 20px;">Best regards,<br><strong>DaingGrader Moderation Team</strong></p>
        </div>
        """
        + get_email_footer()
    )


def build_item_enabled_email_html(
    recipient_name: str,
    item_type: str,
    item_name: str,
    admin_name: Optional[str] = None,
) -> str:
    """
    Build HTML for item re-enabled/enabled notification email.
    
    Args:
        recipient_name: Name of the person receiving the email
        item_type: Type of item (account, product, comment, scan, review)
        item_name: Name/title of the enabled item
        admin_name: Name of the admin who enabled the item
    """
    item_type_display = item_type.capitalize()
    timestamp = datetime.now().strftime("%B %d, %Y at %H:%M")
    
    return (
        get_email_header()
        + f"""
        <div class="email-header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <h1>DaingGrader</h1>
            <p>{item_type_display} Re-enabled</p>
        </div>

        <div class="email-body">
            <h2>Your {item_type_display} Has Been Re-enabled</h2>
            
            <p>Hi <strong>{recipient_name}</strong>,</p>
            
            <p>Great news! Your {item_type} "<strong>{item_name}</strong>" has been re-enabled and is now visible again.</p>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-item-label">Item Type</div>
                    <div class="info-item-value">{item_type_display}</div>
                </div>
                <div class="info-item">
                    <div class="info-item-label">Status</div>
                    <div class="status-badge status-enabled">Active</div>
                </div>
                <div class="info-item">
                    <div class="info-item-label">Item Name</div>
                    <div class="info-item-value" style="font-size: 14px; word-break: break-word;">{item_name}</div>
                </div>
                <div class="info-item">
                    <div class="info-item-label">Timestamp</div>
                    <div class="info-item-value" style="font-size: 13px;">{timestamp}</div>
                </div>
            </div>
            
            <div class="highlight-box" style="background-color: #e7f5ea; border-left-color: #10b981;">
                <p style="color: #065f46;">✓ Your {item_type} is now active and visible to other users.</p>
            </div>
            
            {f'<div class="info-grid" style="background-color: #f0fdf4; margin-top: 20px;"><div style="grid-column: 1 / -1;"><p style="color: #15803d; margin: 0;"><strong>Thank you</strong> for your cooperation. We appreciate your understanding and look forward to your continued participation in DaingGrader.</p></div></div>' if item_type.lower() != "account" else ''}
            
            <p style="margin-top: 30px; margin-bottom: 0;">Best regards,<br><strong>DaingGrader Team</strong></p>
        </div>
        """
        + get_email_footer()
    )


def build_order_shipped_email_html(
    customer_name: str,
    order_number: str,
    items: list,
    total: float,
    address: dict,
) -> str:
    """Build HTML for order shipped notification email sent to the customer."""
    timestamp = datetime.now().strftime("%B %d, %Y at %H:%M")
    items_rows = "".join(
        f"""
        <tr>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155;">{i.get('name', 'Item')}</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155; text-align: center;">{i.get('qty', 1)}</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">&#8369;{float(i.get('price', 0)) * int(i.get('qty', 1)):,.2f}</td>
        </tr>
        """
        for i in items
    )
    delivery_addr = ", ".join(
        filter(None, [address.get("address_line"), address.get("city"), address.get("province"), address.get("postal_code")])
    ) or "N/A"

    return (
        get_email_header()
        + f"""
        <div class="email-header" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);">
            <h1>DaingGrader</h1>
            <p>Your Order Has Been Shipped!</p>
        </div>

        <div class="email-body">
            <h2>&#128666; Order Shipped</h2>

            <p>Hi <strong>{customer_name}</strong>,</p>

            <p>Great news! Your order <strong>#{order_number}</strong> has been shipped and is on its way to you.</p>

            <div class="highlight-box" style="background-color: #fff7ed; border-left-color: #f97316;">
                <p style="color: #9a3412;">&#128666; Your package is on the way. Once you receive it, please mark it as <strong>Delivered</strong> in your orders page.</p>
            </div>

            <div class="info-grid">
                <div class="info-item">
                    <div class="info-item-label">Order Number</div>
                    <div class="info-item-value">#{order_number}</div>
                </div>
                <div class="info-item">
                    <div class="info-item-label">Status</div>
                    <div class="info-item-value" style="color: #ea580c;">Shipped</div>
                </div>
                <div class="info-item">
                    <div class="info-item-label">Delivery Address</div>
                    <div class="info-item-value" style="font-size: 13px;">{delivery_addr}</div>
                </div>
                <div class="info-item">
                    <div class="info-item-label">Date</div>
                    <div class="info-item-value" style="font-size: 13px;">{timestamp}</div>
                </div>
            </div>

            <h3 style="color: #0f172a; font-size: 16px; margin: 24px 0 12px 0;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden;">
                <thead>
                    <tr style="background: #e2e8f0;">
                        <th style="padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Item</th>
                        <th style="padding: 10px 8px; text-align: center; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Qty</th>
                        <th style="padding: 10px 8px; text-align: right; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    {items_rows}
                </tbody>
                <tfoot>
                    <tr style="background: #e2e8f0;">
                        <td colspan="2" style="padding: 12px 8px; font-weight: 700; font-size: 14px; color: #0f172a;">Total</td>
                        <td style="padding: 12px 8px; font-weight: 700; font-size: 16px; color: #ea580c; text-align: right;">&#8369;{total:,.2f}</td>
                    </tr>
                </tfoot>
            </table>

            <div class="divider"></div>
            <p>Thank you for shopping with us! If you have any questions, contact our support team.</p>
            <p>Best regards,<br><strong>DaingGrader Team</strong></p>
        </div>
        """
        + get_email_footer()
    )


def build_order_cancelled_email_html(
    customer_name: str,
    order_number: str,
    items: list,
    total: float,
    reason: str = None,
) -> str:
    """Build HTML for order cancelled notification email sent to the customer."""
    timestamp = datetime.now().strftime("%B %d, %Y at %H:%M")
    items_rows = "".join(
        f"""
        <tr>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155;">{i.get('name', 'Item')}</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155; text-align: center;">{i.get('qty', 1)}</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">&#8369;{float(i.get('price', 0)) * int(i.get('qty', 1)):,.2f}</td>
        </tr>
        """
        for i in items
    )

    return (
        get_email_header()
        + f"""
        <div class="email-header" style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);">
            <h1>DaingGrader</h1>
            <p>Order Cancellation Notice</p>
        </div>

        <div class="email-body">
            <h2>&#10060; Order Cancelled</h2>

            <p>Hi <strong>{customer_name}</strong>,</p>

            <p>We're sorry to inform you that your order <strong>#{order_number}</strong> has been cancelled.</p>

            {f'<div class="highlight-box" style="background-color: #fee2e2; border-left-color: #ef4444;"><p style="color: #991b1b;"><strong>Reason:</strong> {reason}</p></div>' if reason else ''}

            <div class="info-grid">
                <div class="info-item">
                    <div class="info-item-label">Order Number</div>
                    <div class="info-item-value">#{order_number}</div>
                </div>
                <div class="info-item">
                    <div class="info-item-label">Status</div>
                    <div class="info-item-value" style="color: #dc2626;">Cancelled</div>
                </div>
                <div class="info-item">
                    <div class="info-item-label">Cancelled On</div>
                    <div class="info-item-value" style="font-size: 13px;">{timestamp}</div>
                </div>
                <div class="info-item">
                    <div class="info-item-label">Order Total</div>
                    <div class="info-item-value">&#8369;{total:,.2f}</div>
                </div>
            </div>

            <h3 style="color: #0f172a; font-size: 16px; margin: 24px 0 12px 0;">Cancelled Items</h3>
            <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden;">
                <thead>
                    <tr style="background: #e2e8f0;">
                        <th style="padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Item</th>
                        <th style="padding: 10px 8px; text-align: center; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Qty</th>
                        <th style="padding: 10px 8px; text-align: right; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    {items_rows}
                </tbody>
            </table>

            <div class="highlight-box" style="margin-top: 24px;">
                <p>If you have already made a payment, a refund will be processed within 3–5 business days. For assistance, please contact our support team.</p>
            </div>

            <div class="divider"></div>
            <p>We apologize for the inconvenience. We hope to serve you again soon.</p>
            <p>Best regards,<br><strong>DaingGrader Team</strong></p>
        </div>
        """
        + get_email_footer()
    )
