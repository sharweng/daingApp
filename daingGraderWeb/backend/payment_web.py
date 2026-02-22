"""
PayMongo Payment API Endpoints for Web Frontend
Handles secure payment intent creation and attachment
Secret keys are kept on backend only
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from paymongo import create_payment_intent_for_card
import requests
import base64
import os

router = APIRouter()

# PayMongo configuration
PAYMONGO_SECRET_KEY = os.getenv("PAYMONGO_SECRET_KEY", "")
PAYMONGO_API_URL = "https://api.paymongo.com/v1"


class CreatePaymentIntentRequest(BaseModel):
    amount: int  # in centavos
    description: str = "Order Payment"


class AttachPaymentIntentRequest(BaseModel):
    payment_intent_id: str
    payment_method_id: str
    return_url: str


def _get_auth_header():
    """Generate Basic Auth header for PayMongo API"""
    credentials = base64.b64encode(f"{PAYMONGO_SECRET_KEY}:".encode()).decode()
    return {"Authorization": f"Basic {credentials}"}


@router.post("/api/payment/create-intent")
async def create_payment_intent_endpoint(req: CreatePaymentIntentRequest):
    """
    Create a PayMongo payment intent for card payment
    Frontend calls this instead of PayMongo directly
    """
    try:
        # Use the paymongo.py function
        result = create_payment_intent_for_card(
            amount=req.amount,
            description=req.description,
            redirect_url="http://localhost:5173/order-confirmed"  # Will be overridden by attach
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to create payment intent")
            )
        
        return {
            "success": True,
            "payment_intent_id": result["payment_intent_id"],
            "client_key": result["client_key"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating payment intent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/payment/attach-intent")
async def attach_payment_intent_endpoint(req: AttachPaymentIntentRequest):
    """
    Attach a payment method to a payment intent
    Frontend calls this instead of PayMongo directly
    """
    try:
        payload = {
            "data": {
                "attributes": {
                    "payment_method": req.payment_method_id,
                    "return_url": req.return_url,
                }
            }
        }
        
        response = requests.post(
            f"{PAYMONGO_API_URL}/payment_intents/{req.payment_intent_id}/attach",
            json=payload,
            headers=_get_auth_header(),
            timeout=10
        )
        
        if response.status_code not in [200, 201]:
            error_data = response.json()
            raise HTTPException(
                status_code=response.status_code,
                detail=error_data.get("errors", [{}])[0].get("detail", "Failed to attach payment")
            )
        
        data = response.json().get("data", {})
        attributes = data.get("attributes", {})
        
        return {
            "success": True,
            "payment_intent_id": data.get("id"),
            "status": attributes.get("status"),
            "amount": attributes.get("amount"),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error attaching payment intent: {e}")
        raise HTTPException(status_code=500, detail=str(e))
