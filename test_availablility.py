from datetime import date, timedelta
from app.tools.appointments import check_doctor_availability

specialities = ["GP", "general practitioner", "General Physician"]

for speciality in specialities:
    slots = check_doctor_availability(
        speciality=speciality,
        requested_date=date.today() + timedelta(days=1)
    )

    print(f"{speciality}: {len(slots)} slots")