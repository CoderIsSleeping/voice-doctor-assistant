
from datetime import date
import logging

from app.tools.appointments import (
    get_patient_appointments as fetch_patient_appointments
)



from pipecat.services.llm_service import FunctionCallParams

from app.tools.appointments import (
    check_doctor_availability as get_availability,
    search_doctor_by_name as find_doctor,
    book_appointment as save_appointment,
    cancel_appointment as remove_appointment,
    normalize_phone,
)

logger = logging.getLogger(__name__)


def create_voice_tools():

    # Session-local state: created separately for every bot session.
    session_state = {
        "booking_pending_phone": None,
        "cancellation_pending_phone": None,
        "appointments_pending_phone": None,
    }


    async def get_patient_appointments(
        params: FunctionCallParams,
        phone_number: str,
        phone_confirmed: bool = False,
    ):
        """Retrieve active appointments for a patient."""

        try:
            phone = normalize_phone(phone_number)

            if session_state.get("appointments_pending_phone") != phone:
                session_state["appointments_pending_phone"] = phone

                await send_result(
                    params,
                    {
                        "success": False,
                        "confirmation_required": True,
                        "message": "Ask the patient to confirm their phone number."
                    }
                )
                return

            if not phone_confirmed:
                await send_result(
                    params,
                    {
                        "success": False,
                        "confirmation_required": True,
                        "message": "Phone confirmation is required."
                    }
                )
                return

            result = fetch_patient_appointments(
                phone_number=phone,
                phone_confirmed=True,
            )

            if result.get("success"):
                session_state["appointments_pending_phone"] = None

            await send_result(params, result)

        except ValueError as error:
            await send_result(
                params,
                {"success": False, "message": str(error)}
            )

        except Exception:
            logger.exception("Appointment lookup failed")
            await send_result(
                params,
                {
                    "success": False,
                    "message": "Unable to retrieve appointments."
                }
            )


    async def send_result(params: FunctionCallParams, result: dict):
        """Send the tool result back to the LLM."""
        await params.result_callback(result)

    async def search_doctor_by_name(
        params: FunctionCallParams,
        doctor_name: str,
    ):
        """Search for a doctor using their full or partial name.

        Args:
            doctor_name: Full or partial doctor name.
        """
        try:
            if not doctor_name or not doctor_name.strip():
                result = {
                    "success": False,
                    "message": "Please provide the doctor's name.",
                }
            else:
                result = find_doctor(doctor_name.strip())

            await send_result(params, result)

        except Exception:
            logger.exception("Doctor search failed")
            await send_result(
                params,
                {
                    "success": False,
                    "message": "Unable to search for the doctor right now.",
                },
            )

    async def check_doctor_availability(
        params: FunctionCallParams,
        doctor_id: int = 0,
        speciality: str = "",
        requested_date: str = "",
        available_after: str = "",
    ):
        """Find actual available appointment slots.

        Args:
            doctor_id: Doctor ID returned by doctor search.
            speciality: Medical specialty to filter by.
            requested_date: Optional date in YYYY-MM-DD format.
        """
        try:
            parsed_date = None

            if requested_date:
                try:
                    parsed_date = date.fromisoformat(requested_date)
                except ValueError:
                    await send_result(
                        params,
                        {
                            "success": False,
                            "message": "Invalid date. Use YYYY-MM-DD format.",
                        },
                    )
                    return


            parsed_time = None

            if available_after:
                try:
                    from datetime import time
                    parsed_time = time.fromisoformat(available_after)
                except ValueError:
                    await send_result(
                        params,
                        {
                            "success": False,
                            "message": "Invalid time. Use HH:MM format."
                        }
                    )
                    return

            slots = get_availability(
                doctor_id=doctor_id or None,
                requested_date=parsed_date,
                speciality=speciality.strip() or None,
                available_after=parsed_time,
            )

            result = {
                "success": True,
                "count": len(slots),
                "slots": slots[:10],
                "message": (
                    f"Found {len(slots)} available appointment slots."
                    if slots
                    else "No available appointment slots were found."
                ),
            }

            await send_result(params, result)

        except Exception:
            logger.exception("Availability lookup failed")
            await send_result(
                params,
                {
                    "success": False,
                    "message": "Unable to check appointment availability.",
                },
            )

    async def book_appointment(
        params: FunctionCallParams,
        phone_number: str,
        doctor_id: int,
        slot_id: int,
        phone_confirmed: bool = False,
    ):
        """Book an appointment after explicit phone number confirmation.

        Args:
            phone_number: Patient phone number.
            doctor_id: Doctor ID.
            slot_id: Available appointment slot ID.
            phone_confirmed: True only after the patient explicitly confirms the number.
        """
        try:
            phone = normalize_phone(phone_number)

            pending_phone = session_state["booking_pending_phone"]

            if pending_phone != phone:
                session_state["booking_pending_phone"] = phone

                result = {
                    "success": False,
                    "confirmation_required": True,
                    "message": (
                        "Read the phone number back to the patient "
                        "and ask for explicit confirmation before booking."
                    ),
                }

                await send_result(params, result)
                return

            if not phone_confirmed:
                await send_result(
                    params,
                    {
                        "success": False,
                        "confirmation_required": True,
                        "message": "The patient has not confirmed the phone number.",
                    },
                )
                return

            result = save_appointment(
                phone_number=phone,
                doctor_id=doctor_id,
                slot_id=slot_id,
                phone_confirmed=True,
            )

            if result.get("success"):
                session_state["booking_pending_phone"] = None

            await send_result(params, result)

        except ValueError as error:
            await send_result(
                params,
                {
                    "success": False,
                    "message": str(error),
                },
            )

        except Exception:
            logger.exception("Appointment booking failed")
            await send_result(
                params,
                {
                    "success": False,
                    "message": "Unable to complete the booking right now.",
                },
            )

    async def cancel_appointment(
        params: FunctionCallParams,
        phone_number: str,
        phone_confirmed: bool = False,
        appointment_id: int = 0,
    ):
        """Cancel an appointment after confirming the patient's phone number.

        Args:
            phone_number: Patient phone number.
            phone_confirmed: True only after explicit patient confirmation.
            appointment_id: Appointment ID to cancel, if known.
        """
        try:
            phone = normalize_phone(phone_number)

            pending_phone = session_state["cancellation_pending_phone"]

            if pending_phone != phone:
                session_state["cancellation_pending_phone"] = phone

                result = {
                    "success": False,
                    "confirmation_required": True,
                    "message": (
                        "Read the phone number back to the patient "
                        "and ask for explicit confirmation before cancellation."
                    ),
                }

                await send_result(params, result)
                return

            if not phone_confirmed:
                await send_result(
                    params,
                    {
                        "success": False,
                        "confirmation_required": True,
                        "message": "The patient has not confirmed the phone number.",
                    },
                )
                return

            result = remove_appointment(
                phone_number=phone,
                phone_confirmed=True,
                appointment_id=appointment_id or None,
            )

            if result.get("success"):
                session_state["cancellation_pending_phone"] = None

            await send_result(params, result)

        except ValueError as error:
            await send_result(
                params,
                {
                    "success": False,
                    "message": str(error),
                },
            )

        except Exception:
            logger.exception("Appointment cancellation failed")
            await send_result(
                params,
                {
                    "success": False,
                    "message": "Unable to cancel the appointment right now.",
                },
            )

    return [
        search_doctor_by_name,
        check_doctor_availability,
        book_appointment,
        cancel_appointment,
        get_patient_appointments,
    ]
