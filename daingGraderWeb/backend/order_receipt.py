import os
from io import BytesIO
from typing import Dict, Any, List
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas


def _get_email_config() -> tuple[str, str]:
    """Get email configuration from environment variables."""
    contact_recipient = os.getenv("CONTACT_EMAIL", "shathesisgroup@gmail.com")
    gmail_app_password = os.getenv("GMAIL_APP_PASSWORD", "")
    return contact_recipient, gmail_app_password


def _format_currency(value: float) -> str:
    try:
        return f"PHP {float(value):,.2f}"
    except Exception:
        return "PHP 0.00"


def _safe_text(value: Any) -> str:
    return str(value or "").strip()


def _truncate(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


def build_receipt_email_html(order: Dict[str, Any], user_name: str) -> str:
    address = order.get("address") or {}
    items: List[Dict[str, Any]] = order.get("items") or []
    created_at = _safe_text(order.get("created_at"))
    order_number = _safe_text(order.get("order_number"))
    payment_method = _safe_text(order.get("payment_method") or "")
    seller_name = _safe_text(order.get("seller_name"))

    items_rows = "".join(
        f"""
        <tr>
          <td style=\"padding:10px 0;border-bottom:1px solid #e5e7eb;\">{_safe_text(item.get('name'))}</td>
          <td style=\"padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:center;\">{item.get('qty', 1)}</td>
          <td style=\"padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;\">{_format_currency(item.get('price', 0))}</td>
        </tr>
        """
        for item in items
    )

    return f"""
<!DOCTYPE html>
<html>
  <body style=\"margin:0;padding:0;background:#f1f5f9;font-family:Arial, sans-serif;\">
    <div style=\"max-width:720px;margin:24px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;\">
      <div style=\"background:#2563eb;color:#ffffff;padding:24px 28px;\">
        <div style=\"font-size:20px;font-weight:bold;letter-spacing:0.3px;\">DaingGrader Receipt</div>
        <div style=\"font-size:14px;opacity:0.9;margin-top:6px;\">Thank you for your purchase, {user_name or 'Customer'}!</div>
      </div>
      <div style=\"padding:24px 28px;color:#0f172a;\">
        <table style=\"width:100%;border-collapse:collapse;font-size:14px;margin-bottom:18px;\">
          <tr>
            <td style=\"padding:6px 0;color:#64748b;\">Order Number</td>
            <td style=\"padding:6px 0;text-align:right;font-weight:600;\">{order_number}</td>
          </tr>
          <tr>
            <td style=\"padding:6px 0;color:#64748b;\">Order Date</td>
            <td style=\"padding:6px 0;text-align:right;\">{created_at}</td>
          </tr>
          <tr>
            <td style=\"padding:6px 0;color:#64748b;\">Payment Method</td>
            <td style=\"padding:6px 0;text-align:right;\">{payment_method}</td>
          </tr>
          <tr>
            <td style=\"padding:6px 0;color:#64748b;\">Seller</td>
            <td style=\"padding:6px 0;text-align:right;\">{seller_name or 'DaingGrader Store'}</td>
          </tr>
        </table>

        <div style=\"border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin-bottom:18px;\">
          <div style=\"font-weight:bold;margin-bottom:8px;\">Billing Address</div>
          <div style=\"color:#334155;line-height:1.5;\">
            <div>{_safe_text(address.get('full_name'))}</div>
            <div>{_safe_text(address.get('address_line'))}</div>
            <div>{_safe_text(address.get('city'))} {_safe_text(address.get('province'))} {_safe_text(address.get('postal_code'))}</div>
            <div>{_safe_text(address.get('phone'))}</div>
          </div>
        </div>

        <div style=\"font-weight:bold;margin-bottom:10px;\">Order Summary</div>
        <table style=\"width:100%;border-collapse:collapse;font-size:14px;\">
          <thead>
            <tr style=\"border-bottom:2px solid #e2e8f0;\">
              <th style=\"text-align:left;padding-bottom:8px;\">Item</th>
              <th style=\"text-align:center;padding-bottom:8px;\">Qty</th>
              <th style=\"text-align:right;padding-bottom:8px;\">Price</th>
            </tr>
          </thead>
          <tbody>
            {items_rows}
          </tbody>
        </table>

        <div style=\"display:flex;justify-content:space-between;margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:15px;font-weight:bold;\">
          <span>Total</span>
          <span>{_format_currency(order.get('total', 0))}</span>
        </div>
      </div>

      <div style=\"padding:16px 28px;background:#f8fafc;color:#64748b;font-size:12px;\">
        This receipt is also attached as a PDF. If you have questions, reply to this email.
      </div>
    </div>
  </body>
</html>
"""


def build_receipt_text(order: Dict[str, Any], user_name: str) -> str:
    address = order.get("address") or {}
    items: List[Dict[str, Any]] = order.get("items") or []
    lines = [
        f"Hello {user_name or 'Customer'},",
        "",
        "Thank you for your purchase. Here is your receipt:",
        "",
        f"Order Number: {_safe_text(order.get('order_number'))}",
        f"Order Date: {_safe_text(order.get('created_at'))}",
        f"Payment Method: {_safe_text(order.get('payment_method'))}",
        f"Seller: {_safe_text(order.get('seller_name'))}",
        "",
        "Billing Address:",
        f"{_safe_text(address.get('full_name'))}",
        f"{_safe_text(address.get('address_line'))}",
        f"{_safe_text(address.get('city'))} {_safe_text(address.get('province'))} {_safe_text(address.get('postal_code'))}",
        f"{_safe_text(address.get('phone'))}",
        "",
        "Items:",
    ]
    for item in items:
        lines.append(f"- {_safe_text(item.get('name'))} x{item.get('qty', 1)} ({_format_currency(item.get('price', 0))})")
    lines.append("")
    lines.append(f"Total: {_format_currency(order.get('total', 0))}")
    lines.append("")
    lines.append("A PDF receipt is attached.")
    return "\n".join(lines)


def build_receipt_pdf_bytes(order: Dict[str, Any]) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 40

    header_color = colors.HexColor("#2563eb")
    text_color = colors.HexColor("#0f172a")
    muted_color = colors.HexColor("#64748b")
    line_color = colors.HexColor("#e2e8f0")

    def draw_line(y_pos: float) -> None:
        pdf.setStrokeColor(line_color)
        pdf.setLineWidth(1)
        pdf.line(margin, y_pos, width - margin, y_pos)

    y = height - margin
    pdf.setFillColor(header_color)
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(margin, y, "Order Receipt")
    y -= 22

    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(muted_color)
    pdf.drawString(margin, y, "DaingGrader")
    y -= 20

    pdf.setFillColor(text_color)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(margin, y, "Order Details")
    y -= 14

    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(text_color)
    details = [
        ("Order Number", _safe_text(order.get("order_number"))),
        ("Order Date", _safe_text(order.get("created_at"))),
        ("Payment Method", _safe_text(order.get("payment_method"))),
        ("Seller", _safe_text(order.get("seller_name"))),
    ]
    for label, value in details:
        pdf.setFillColor(muted_color)
        pdf.drawString(margin, y, f"{label}:")
        pdf.setFillColor(text_color)
        pdf.drawString(margin + 110, y, value)
        y -= 14

    y -= 6
    draw_line(y)
    y -= 16

    pdf.setFont("Helvetica-Bold", 12)
    pdf.setFillColor(text_color)
    pdf.drawString(margin, y, "Billing Address")
    y -= 14

    address = order.get("address") or {}
    pdf.setFont("Helvetica", 10)
    address_lines = [
        _safe_text(address.get("full_name")),
        _safe_text(address.get("address_line")),
        f"{_safe_text(address.get('city'))} {_safe_text(address.get('province'))} {_safe_text(address.get('postal_code'))}",
        _safe_text(address.get("phone")),
    ]
    for line in address_lines:
        if not line:
            continue
        pdf.drawString(margin, y, line)
        y -= 14

    y -= 6
    draw_line(y)
    y -= 16

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(margin, y, "Order Summary")
    y -= 16

    pdf.setFont("Helvetica-Bold", 10)
    pdf.setFillColor(muted_color)
    pdf.drawString(margin, y, "Item")
    pdf.drawString(width - margin - 160, y, "Qty")
    pdf.drawString(width - margin - 80, y, "Price")
    y -= 10
    draw_line(y)
    y -= 12

    items: List[Dict[str, Any]] = order.get("items") or []
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(text_color)
    for item in items:
        name = _truncate(_safe_text(item.get("name")), 48)
        qty = str(item.get("qty", 1))
        price = _format_currency(item.get("price", 0))

        pdf.drawString(margin, y, name)
        pdf.drawRightString(width - margin - 130, y, qty)
        pdf.drawRightString(width - margin, y, price)
        y -= 14
        if y < margin + 80:
            pdf.showPage()
            y = height - margin
            pdf.setFont("Helvetica", 10)
            pdf.setFillColor(text_color)

    y -= 6
    draw_line(y)
    y -= 18

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawRightString(width - margin, y, f"Total: {_format_currency(order.get('total', 0))}")

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.read()


def send_order_receipt_email(user_email: str, user_name: str, order: Dict[str, Any], pdf_bytes: bytes) -> None:
    contact_recipient, gmail_app_password = _get_email_config()
    
    if not gmail_app_password:
        raise ValueError("GMAIL_APP_PASSWORD is not set in .env")

    msg = MIMEMultipart("mixed")
    msg["From"] = contact_recipient
    msg["To"] = user_email
    msg["Subject"] = f"[DaingGrader] Order Receipt {order.get('order_number', '')}"

    alternative = MIMEMultipart("alternative")
    alternative.attach(MIMEText(build_receipt_text(order, user_name), "plain"))
    alternative.attach(MIMEText(build_receipt_email_html(order, user_name), "html"))
    msg.attach(alternative)

    attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
    attachment.add_header("Content-Disposition", "attachment", filename=f"receipt-{order.get('order_number', 'order')}.pdf")
    msg.attach(attachment)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(contact_recipient, gmail_app_password)
        server.sendmail(contact_recipient, user_email, msg.as_string())
