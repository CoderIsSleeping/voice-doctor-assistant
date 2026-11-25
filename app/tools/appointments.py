
import re

from datetime import date, time, timedelta

from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from app.database.db import SessionLocal
from app.database.models import Doctor, Slot, Appointment


# ----------------------------------
# PHONE NUMBER VALIDATION
# ----------------------------------

def normalize_phone(phone_number: str) -> str:
    if not phone_number:
        raise ValueError("Phone number is required.")

    phone = re.sub(r"[\s\-()]", "", phone_number.strip())

    if not re.fullmatch(r"\+?\d{10,15}", phone):
        raise ValueError("Invalid phone number.")

    return phone

def normalize_speciality(speciality: str) -> str:
    value = speciality.strip().lower()

    aliases = {
        "general medicine": "general physician",
        "general practitioner": "general physician",
        "gp": "general physician",
    }

    return aliases.get(value, value)


# ----------------------------------
# 1. SEARCH DOCTOR BY NAME
# ----------------------------------

def search_doctor_by_name(doctor_name: str):

    if not doctor_name or not doctor_name.strip():
        return {
            "success": False,
            "doctors": [],
            "message": "Please provide a doctor's name."
        }

    with SessionLocal() as db:

        doctors = db.scalars(
            select(Doctor).where(
                func.lower(Doctor.name).contains(
                    doctor_name.strip().lower()
                )
            )
        ).all()

        if not doctors:
            return {
                "success": False,
                "doctors": [],
                "message": "Doctor not found."
            }

        return {
            "success": True,
            "count": len(doctors),
            "doctors": [
                {
                    "doctor_id": doctor.id,
                    "doctor_name": doctor.name,
                    "speciality": doctor.speciality,
                    "experience": doctor.experience,
                }
                for doctor in doctors
            ],
            "message": "Doctor search completed successfully."
        }


# ----------------------------------
# 2. CHECK DOCTOR AVAILABILITY
# ----------------------------------


def check_doctor_availability(
    doctor_id: int = None,
    requested_date: date = None,
    speciality: str = None,
    available_after: time = None,
):
    with SessionLocal() as db:

        query = (
            select(Slot, Doctor)
            .join(Doctor, Slot.doctor_id == Doctor.id)
            .where(
                Slot.status == "available",
                Slot.date >= date.today()
            )
        )

        # Filter by doctor
        if doctor_id is not None:
            query = query.where(
                Slot.doctor_id == doctor_id
            )

        # Filter by specialty
        if speciality:
            normalized = normalize_speciality(speciality)

            query = query.where(
                func.lower(Doctor.speciality) == normalized
            )

        # Filter by requested date
        if requested_date is not None:
            query = query.where(
                Slot.date == requested_date
            )

        # Filter by starting time
        if available_after is not None:
            query = query.where(
                Slot.start_time >= available_after
            )

        results = db.execute(
            query.order_by(Slot.date, Slot.start_time)
        ).all()

        slots = [
            {
                "slot_id": slot.id,
                "doctor_id": doctor.id,
                "doctor_name": doctor.name,
                "speciality": doctor.speciality,
                "date": slot.date.isoformat(),
                "start_time": slot.start_time.strftime("%H:%M"),
                "end_time": slot.end_time.strftime("%H:%M"),
            }
            for slot, doctor in results
        ]

        return slots


# ----------------------------------
# 3. BOOK APPOINTMENT
# ----------------------------------

def book_appointment(
    phone_number: str,
    doctor_id: int,
    slot_id: int,
    phone_confirmed: bool
):

    if not phone_confirmed:
        return {
            "success": False,
            "message": "Phone number confirmation is required."
        }

    try:
        phone = normalize_phone(phone_number)
    except ValueError as error:
        return {
            "success": False,
            "message": str(error)
        }

    try:

        with SessionLocal.begin() as db:

            # Lock the selected slot where supported by the database.
            slot = db.scalar(
                select(Slot)
                .where(Slot.id == slot_id)
                .with_for_update()
            )

            if not slot:
                return {
                    "success": False,
                    "message": "Slot not found."
                }

            if slot.doctor_id != doctor_id:
                return {
                    "success": False,
                    "message": "Slot does not belong to this doctor."
                }

            if slot.status != "available":
                return {
                    "success": False,
                    "message": "This slot is no longer available."
                }

            if slot.date < date.today():
                return {
                    "success": False,
                    "message": "Cannot book a past appointment."
                }

            slot.status = "booked"

            appointment = Appointment(
                phone_number=phone,
                doctor_id=doctor_id,
                slot_id=slot_id,
                status="booked"
            )

            db.add(appointment)
            db.flush()

            result = {
                "success": True,
                "appointment_id": appointment.id,
                "doctor": appointment.doctor.name,
                "date": slot.date.isoformat(),
                "time": slot.start_time.strftime("%H:%M"),
                "phone_number": phone,
                "message": "Appointment booked successfully."
            }

        return result

    except IntegrityError:
        return {
            "success": False,
            "message": "This slot has already been booked."
        }


# ----------------------------------
# 4. CANCEL APPOINTMENT
# ----------------------------------

def cancel_appointment(
    phone_number: str,
    phone_confirmed: bool,
    appointment_id: int = None
):

    if not phone_confirmed:
        return {
            "success": False,
            "message": "Phone number confirmation is required."
        }

    try:
        phone = normalize_phone(phone_number)
    except ValueError as error:
        return {
            "success": False,
            "message": str(error)
        }

    with SessionLocal.begin() as db:

        query = (
            select(Appointment)
            .where(
                Appointment.phone_number == phone,
                Appointment.status == "booked"
            )
        )

        if appointment_id is not None:
            query = query.where(
                Appointment.id == appointment_id
            )

        appointments = db.scalars(
            query.order_by(Appointment.created_at.desc())
        ).all()

        if not appointments:
            return {
                "success": False,
                "message": "No active appointment found."
            }

        if len(appointments) > 1 and appointment_id is None:
            return {
                "success": False,
                "multiple_appointments": True,
                "appointments": [
                    {
                        "appointment_id": appointment.id,
                        "doctor_id": appointment.doctor_id,
                        "doctor_name": appointment.doctor.name,
                        "date": appointment.slot.date.isoformat(),
                        "time": appointment.slot.start_time.strftime("%H:%M"),
                    }
                    for appointment in appointments
                ],
                "message": (
                    "Multiple active appointments found. "
                    "Ask the patient which appointment they want to cancel."
                )
            }

        appointment = appointments[0]

        slot = db.get(Slot, appointment.slot_id)

        if not slot:
            return {
                "success": False,
                "message": "Associated appointment slot could not be found."
            }

        appointment.status = "cancelled"
        slot.status = "available"

        return {
            "success": True,
            "appointment_id": appointment.id,
            "doctor": appointment.doctor.name,
            "date": slot.date.isoformat(),
            "time": slot.start_time.strftime("%H:%M"),
            "message": "Appointment cancelled successfully."
        }


# ----------------------------------
# 5. SEED MOCK DATA
# ----------------------------------

def seed_database():

    with SessionLocal.begin() as db:

        if db.query(Doctor).count() > 0:
            return

        doctors = [
            Doctor(
                name="Dr. Rajesh Sharma",
                speciality="Cardiology",
                experience=15
            ),
            Doctor(
                name="Dr. Priya Verma",
                speciality="Dermatology",
                experience=10
            ),
            Doctor(
                name="Dr. Amit Kumar",
                speciality="Neurology",
                experience=12
            ),
            Doctor(
                name="Dr. Neha Singh",
                speciality="General Physician",
                experience=8
            )
        ]

        db.add_all(doctors)
        db.flush()

        for doctor in doctors:

            for day_offset in range(1, 8):

                appointment_date = (
                    date.today() + timedelta(days=day_offset)
                )

                for hour in [9, 10, 11, 14, 15, 16]:

                    slot = Slot(
                        doctor_id=doctor.id,
                        date=appointment_date,
                        start_time=time(hour, 0),
                        end_time=time(hour + 1, 0),
                        status="available"
                    )

                    db.add(slot)



# ----------------------------------
# 6. GET PATIENT APPOINTMENTS
# ----------------------------------

def get_patient_appointments(
    phone_number: str,
    phone_confirmed: bool,
):
    if not phone_confirmed:
        return {
            "success": False,
            "message": "Phone confirmation is required."
        }

    try:
        phone = normalize_phone(phone_number)
    except ValueError as error:
        return {
            "success": False,
            "message": str(error)
        }

    with SessionLocal() as db:

        appointments = db.scalars(
            select(Appointment)
            .where(
                Appointment.phone_number == phone,
                Appointment.status == "booked"
            )
            .order_by(Appointment.created_at.desc())
        ).all()

        if not appointments:
            return {
                "success": True,
                "count": 0,
                "appointments": [],
                "message": "No active appointments found."
            }

        return {
            "success": True,
            "count": len(appointments),
            "appointments": [
                {
                    "appointment_id": appointment.id,
                    "doctor_name": appointment.doctor.name,
                    "speciality": appointment.doctor.speciality,
                    "date": appointment.slot.date.isoformat(),
                    "start_time": appointment.slot.start_time.strftime("%H:%M"),
                    "end_time": appointment.slot.end_time.strftime("%H:%M"),
                    "status": appointment.status,
                }
                for appointment in appointments
            ],
            "message": "Appointments retrieved successfully."
        }


# ----------------------------------
# 7. COMPLETE EXPIRED APPOINTMENTS
# ----------------------------------

def complete_expired_appointments():

    from datetime import datetime

    now = datetime.now()

    with SessionLocal.begin() as db:

        expired_appointments = db.scalars(
            select(Appointment)
            .join(Slot, Appointment.slot_id == Slot.id)
            .where(
                Appointment.status == "booked",
                Slot.date <= now.date()
            )
        ).all()

        completed_count = 0

        for appointment in expired_appointments:

            slot = db.get(Slot, appointment.slot_id)

            if not slot:
                continue

            appointment_end = datetime.combine(
                slot.date,
                slot.end_time
            )

            if appointment_end <= now:
                appointment.status = "completed"
                slot.status = "completed"
                completed_count += 1

        return {
            "success": True,
            "completed_count": completed_count,
            "message": f"{completed_count} expired appointments completed."
        }
