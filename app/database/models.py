
from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Date,
    Time,
    DateTime,
    Index,
    text,
)
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.db import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    speciality = Column(String, nullable=False)
    experience = Column(Integer, default=0)

    slots = relationship(
        "Slot",
        back_populates="doctor"
    )

    appointments = relationship(
        "Appointment",
        back_populates="doctor"
    )


class Slot(Base):
    __tablename__ = "slots"

    id = Column(Integer, primary_key=True, index=True)

    doctor_id = Column(
        Integer,
        ForeignKey("doctors.id"),
        nullable=False
    )

    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    status = Column(String, default="available", nullable=False)

    doctor = relationship(
        "Doctor",
        back_populates="slots"
    )

    appointment = relationship(
        "Appointment",
        back_populates="slot",
        uselist=False
    )


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)

    phone_number = Column(String, nullable=False)

    doctor_id = Column(
        Integer,
        ForeignKey("doctors.id"),
        nullable=False
    )

    slot_id = Column(
        Integer,
        ForeignKey("slots.id"),
        nullable=False
    )

    status = Column(String, default="booked", nullable=False)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    doctor = relationship(
        "Doctor",
        back_populates="appointments"
    )

    slot = relationship(
        "Slot",
        back_populates="appointment"
    )


# Prevent two active bookings for the same slot.
Index(
    "uq_active_appointment_slot",
    Appointment.slot_id,
    unique=True,
    sqlite_where=text("status = 'booked'")
)
