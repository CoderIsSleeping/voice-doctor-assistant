
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database.db import engine, get_db
from app.database.models import Base, Doctor, Slot, Appointment

from app.schemas.appointment import (
    BookAppointmentRequest,
    CancelAppointmentRequest,
    AvailabilityRequest
)

from app.tools.appointments import (
    check_doctor_availability,
    book_appointment,
    cancel_appointment,
    seed_database
)


app = FastAPI(
    title="Voice AI Doctor Assistant",
    description="Doctor appointment management API",
    version="1.0.0"
)


# Allow Next.js frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# Initialize database
Base.metadata.create_all(bind=engine)
seed_database()


@app.get("/")
def home():
    return {
        "message": "Voice AI Doctor Assistant API is running"
    }


# ----------------------------------
# GET ALL DOCTORS
# ----------------------------------

@app.get("/api/doctors")
def get_doctors(db: Session = Depends(get_db)):

    doctors = db.query(Doctor).all()

    return [
        {
            "id": doctor.id,
            "name": doctor.name,
            "speciality": doctor.speciality,
            "experience": doctor.experience
        }
        for doctor in doctors
    ]


# ----------------------------------
# CHECK AVAILABILITY
# ----------------------------------

@app.get("/api/availability")
def get_availability(
    doctor_id: int = None,
    requested_date: str = None
):

    from datetime import date

    parsed_date = None

    if requested_date:
        try:
            parsed_date = date.fromisoformat(requested_date)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date. Use YYYY-MM-DD."
            )

    return check_doctor_availability(
        doctor_id=doctor_id,
        requested_date=parsed_date
    )


# ----------------------------------
# BOOK APPOINTMENT
# ----------------------------------

@app.post("/api/appointments/book")
def book(request: BookAppointmentRequest):

    result = book_appointment(
        phone_number=request.phone_number,
        doctor_id=request.doctor_id,
        slot_id=request.slot_id,
        phone_confirmed=request.phone_confirmed
    )

    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail=result["message"]
        )

    return result


# ----------------------------------
# CANCEL APPOINTMENT
# ----------------------------------

@app.post("/api/appointments/cancel")
def cancel(request: CancelAppointmentRequest):

    result = cancel_appointment(
        phone_number=request.phone_number,
        phone_confirmed=request.phone_confirmed,
        appointment_id=request.appointment_id
    )

    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail=result["message"]
        )

    return result


# ----------------------------------
# GET APPOINTMENTS
# ----------------------------------

@app.get("/api/appointments")
def get_appointments(
    phone_number: str = None,
    db: Session = Depends(get_db)
):

    query = (
        db.query(Appointment, Doctor, Slot)
        .join(Doctor, Appointment.doctor_id == Doctor.id)
        .join(Slot, Appointment.slot_id == Slot.id)
    )

    if phone_number:
        query = query.filter(
            Appointment.phone_number == phone_number
        )

    results = query.order_by(
        Appointment.created_at.desc()
    ).all()

    return [
        {
            "appointment_id": appointment.id,
            "phone_number": appointment.phone_number,
            "doctor_name": doctor.name,
            "speciality": doctor.speciality,
            "date": slot.date.isoformat(),
            "time": slot.start_time.strftime("%H:%M"),
            "status": appointment.status
        }
        for appointment, doctor, slot in results
    ]
