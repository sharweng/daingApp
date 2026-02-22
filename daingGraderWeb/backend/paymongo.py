"""
PayMongo Payment Integration Module
Handles e-wallet and card payment processing with PayMongo API
"""
import os
import requests
import base64
from typing import Dict, Optional, Any
from dotenv import load_dotenv

load_dotenv()

# PayMongo API Configuration
PAYMONGO_SECRET_KEY = os.getenv("PAYMONGO_SECRET_KEY", "sk_test_")
PAYMONGO_PUBLIC_KEY = os.getenv("PAYMONGO_PUBLIC_KEY", "pk_test_")
PAYMONGO_TEST_MODE = True  # Always use test mode by default

# API Endpoints
PAYMONGO_API_URL = "https://api.paymongo.com/v1"

def _get_auth_header():
    """Generate Basic Auth header for PayMongo API"""
    # Use secret key for Authorization header
    credentials = base64.b64encode(f"{PAYMONGO_SECRET_KEY}:".encode()).decode()
    return {"Authorization": f"Basic {credentials}"}


def create_payment_intent_for_ewallet(
    amount: int,  # in centavos (PHP)
    provider: str,  # 'gcash', 'grabpay', 'maya'
    description: str = "",
    redirect_url: str = ""
) -> Dict[str, Any]:
    """
    Create a payment intent for e-wallet (GCash/GrabPay/Maya)
    Uses redirect flow - returns checkout_url for user to complete payment
    
    Args:
        amount: Amount in PHP centavos (e.g., 50000 = PHP 500.00)
        provider: E-wallet provider ('gcash', 'grabpay', 'maya')
        description: Order description
        redirect_url: URL to redirect after payment completion
    
    Returns:
        Dict with checkout_url and payment_intent_id on success
        Dict with error details on failure
    """
    try:
        # Map provider names to PayMongo format
        provider_map = {
            'gcash': 'gcash',
            'grabpay': 'grab_pay',
            'maya': 'paymaya'
        }
        
        paymongo_provider = provider_map.get(provider.lower(), provider)
        
        payload = {
            "data": {
                "attributes": {
                    "amount": amount,  # in centavos
                    "currency": "PHP",
                    "description": description,
                    "statement_descriptor": "DaingGrader",
                    "payment_method_allowed": [paymongo_provider],
                    "redirect": {
                        "success": redirect_url,
                        "failed": redirect_url,
                        "cancelled": redirect_url,
                    },
                }
            }
        }
        
        response = requests.post(
            f"{PAYMONGO_API_URL}/payment_intents",
            json=payload,
            headers=_get_auth_header(),
            timeout=10
        )
        
        if response.status_code not in [200, 201]:
            return {
                "success": False,
                "error": f"PayMongo API error: {response.status_code}",
                "details": response.text
            }
        
        data = response.json().get("data", {})
        payment_intent = data.get("attributes", {})
        
        # Get the checkout URL
        client_key = data.get("id", "")
        checkout_url = payment_intent.get("checkout_url", "")
        
        if not checkout_url:
            return {
                "success": False,
                "error": "No checkout URL returned from PayMongo"
            }
        
        return {
            "success": True,
            "payment_intent_id": client_key,
            "checkout_url": checkout_url,
            "amount": amount,
            "provider": provider
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def create_payment_intent_for_card(
    amount: int,
    description: str = "",
    redirect_url: str = ""
) -> Dict[str, Any]:
    """
    Create a payment intent for card payment
    
    Args:
        amount: Amount in PHP centavos
        description: Order description
        redirect_url: URL to redirect after payment
    
    Returns:
        Dict with payment_intent_id and client_key
    """
    try:
        payload = {
            "data": {
                "attributes": {
                    "amount": amount,
                    "currency": "PHP",
                    "description": description,
                    "statement_descriptor": "DaingGrader",
                    "payment_method_allowed": ["card"],
                    "redirect": {
                        "success": redirect_url,
                        "failed": redirect_url,
                        "cancelled": redirect_url,
                    },
                }
            }
        }
        
        response = requests.post(
            f"{PAYMONGO_API_URL}/payment_intents",
            json=payload,
            headers=_get_auth_header(),
            timeout=10
        )
        
        if response.status_code not in [200, 201]:
            return {
                "success": False,
                "error": f"PayMongo API error: {response.status_code}"
            }
        
        data = response.json().get("data", {})
        client_key = data.get("id", "")
        
        return {
            "success": True,
            "payment_intent_id": client_key,
            "client_key": client_key
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def retrieve_payment_intent(payment_intent_id: str) -> Dict[str, Any]:
    """
    Retrieve payment intent details from PayMongo
    Used to check payment status
    
    Args:
        payment_intent_id: PayMongo payment intent ID
    
    Returns:
        Payment intent data including status
    """
    try:
        response = requests.get(
            f"{PAYMONGO_API_URL}/payment_intents/{payment_intent_id}",
            headers=_get_auth_header(),
            timeout=10
        )
        
        if response.status_code != 200:
            return {
                "success": False,
                "error": f"Failed to retrieve payment intent: {response.status_code}"
            }
        
        data = response.json().get("data", {})
        attributes = data.get("attributes", {})
        
        return {
            "success": True,
            "id": data.get("id"),
            "status": attributes.get("status"),  # succeeded, failed, etc
            "amount": attributes.get("amount"),
            "currency": attributes.get("currency"),
            "description": attributes.get("description"),
            "payment_method": attributes.get("payments", [{}])[0] if attributes.get("payments") else None
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def attach_payment_method_to_intent(
    payment_intent_id: str,
    payment_method_id: str
) -> Dict[str, Any]:
    """
    Attach a payment method to a payment intent (for card payments)
    
    Args:
        payment_intent_id: PayMongo payment intent ID
        payment_method_id: PayMongo payment method ID (from tokenization)
    
    Returns:
        Result of the attachment
    """
    try:
        payload = {
            "data": {
                "attributes": {
                    "payment_method": payment_method_id
                }
            }
        }
        
        response = requests.post(
            f"{PAYMONGO_API_URL}/payment_intents/{payment_intent_id}/attach",
            json=payload,
            headers=_get_auth_header(),
            timeout=10
        )
        
        if response.status_code not in [200, 201]:
            return {
                "success": False,
                "error": f"Failed to attach payment method: {response.status_code}"
            }
        
        return {"success": True}
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
