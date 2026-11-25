
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class BookAppointmentRequest(BaseModel):
    phone_number: str = Field(min_length=10, max_length=16)
    doctor_id: int
    slot_id: int
    phone_confirmed: bool


class CancelAppointmentRequest(BaseModel):
    phone_number: str = Field(min_length=10, max_length=16)
    appointment_id: Optional[int] = None
    phone_confirmed: bool


class AvailabilityRequest(BaseModel):
    doctor_id: Optional[int] = None
    date: Optional[date] = None
