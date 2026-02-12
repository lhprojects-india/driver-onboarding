import Switch from "./Switch";

const DAYS_ORDER = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];

function AvailabilityGrid({ availability, onAvailabilityChange }) {
  const handleChange = (day, slot, value) => {
    const newAvailability = {
      ...availability,
      [day]: {
        ...availability[day],
        [slot]: value,
      },
    };
    onAvailabilityChange(newAvailability);
  };

  return (
    <div className="w-full max-w-lg mt-6 animate-fade-in">
      <div className="grid grid-cols-4 mb-4 items-center">
        <div className="col-span-1"></div>
        <div className="col-span-1 text-center text-sm font-medium">8 - 12 PM</div>
        <div className="col-span-1 text-center text-sm font-medium">12 - 5 PM</div>
        <div className="col-span-1 text-center text-sm font-medium">5 - 10 PM</div>
      </div>

      {DAYS_ORDER.map((day) => {
        const slots = availability[day] || { morning: false, noon: false, evening: false };
        return (
          <div key={day} className="grid grid-cols-4 items-center mb-4">
            <div className="col-span-1 text-left text-sm font-medium">{day}</div>

            <div className="col-span-1 flex justify-center">
              <button
                role="switch"
                aria-checked={slots.morning}
                onClick={() => handleChange(day, "morning", !slots.morning)}
                className={`laundryheap-switch ${slots.morning ? 'laundryheap-switch-checked' : ''}`}
              >
                <span
                  className={`laundryheap-switch-thumb ${slots.morning ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            <div className="col-span-1 flex justify-center">
              <button
                role="switch"
                aria-checked={slots.noon}
                onClick={() => handleChange(day, "noon", !slots.noon)}
                className={`laundryheap-switch ${slots.noon ? 'laundryheap-switch-checked' : ''}`}
              >
                <span
                  className={`laundryheap-switch-thumb ${slots.noon ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>
            <div className="col-span-1 flex justify-center">
              <button
                role="switch"
                aria-checked={slots.evening}
                onClick={() => handleChange(day, "evening", !slots.evening)}
                className={`laundryheap-switch ${slots.evening ? 'laundryheap-switch-checked' : ''}`}
              >
                <span
                  className={`laundryheap-switch-thumb ${slots.evening ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AvailabilityGrid;
