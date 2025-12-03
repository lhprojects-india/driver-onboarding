import { Check } from "lucide-react";

function CheckboxWithLabel({ label, checked, onChange }) {
  const handleClick = () => {
    onChange(!checked);
  };

  return (
    <div className="flex items-center gap-3 mb-6 animate-fade-in">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={handleClick}
        className={`flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all overflow-hidden box-border p-0 ${
          checked ? 'bg-laundryheap-yellow border-transparent' : 'bg-transparent border-white'
        }`}
        style={{ aspectRatio: '1 / 1' }}
      >
        {checked && <Check size={16} className="text-black" />}
      </button>
      <span className="text-sm">{label}</span>
    </div>
  );
}

export default CheckboxWithLabel;
