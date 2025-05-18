"use client";

import * as React from "react";
import ReactDatePicker from "react-datepicker";
import { format, parse, isValid } from "date-fns";
import { tr } from "date-fns/locale";
import { Clock } from "lucide-react";
import { Label } from "./label";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import "react-datepicker/dist/react-datepicker.css";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
}

export function TimePicker({
  value,
  onChange,
  label,
  error,
  className,
  disabled,
  id,
  placeholder = "Saat seçin",
  ...props
}: TimePickerProps) {
  // Convert string time to Date object for DatePicker
  const getTimeAsDate = (timeString: string): Date | null => {
    if (!timeString) return null;
    
    // Create a date object with today's date and the time string
    const today = new Date();
    const dateString = format(today, "yyyy-MM-dd");
    const dateTimeString = `${dateString}T${timeString}`;
    
    try {
      const date = new Date(dateTimeString);
      return isValid(date) ? date : null;
    } catch (e) {
      return null;
    }
  };

  const selectedTime = getTimeAsDate(value);

  // Handle time change from the date picker
  const handleTimeChange = (date: Date | null) => {
    if (date) {
      const timeString = format(date, "HH:mm");
      onChange(timeString);
    } else {
      onChange("");
    }
  };

  // Custom input to match our design
  const CustomInput = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<"button">>(({ value: inputValue, onClick }, ref) => (
    <Button
      id={id}
      disabled={disabled}
      variant={"outline"}
      onClick={onClick}
      ref={ref}
      type="button"
      className={cn(
        "w-full justify-start text-left font-normal border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2",
        !value && "text-muted-foreground",
        error && "border-red-500",
        className
      )}
    >
      <Clock className="mr-2 h-5 w-5 text-primary" />
      <span className={cn(!value && "text-muted-foreground", value && "font-medium")}>
        {value || placeholder}
      </span>
    </Button>
  ));
  
  CustomInput.displayName = "CustomTimePickerInput";

  // Apply custom styles to the time picker
  React.useEffect(() => {
    // Add custom styles for the time picker
    const style = document.createElement('style');
    style.innerHTML = `
      .react-datepicker__time-container {
        width: 120px;
      }
      .react-datepicker__time-container .react-datepicker__time {
        background-color: white;
        border-radius: 0.5rem;
      }
      .react-datepicker__time-container .react-datepicker__time-box {
        width: 100%;
        overflow-x: hidden;
      }
      .react-datepicker__time-container .react-datepicker {
        font-family: inherit;
        border-radius: 0.5rem;
        border: 1px solid hsl(var(--border));
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        background-color: white;
      }
      .react-datepicker__time-container .react-datepicker__time-list-item {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 40px !important;
        color: hsl(var(--foreground));
        background-color: white;
      }
      .react-datepicker__time-container .react-datepicker__time-list-item:hover {
        background-color: hsl(var(--accent) / 0.3) !important;
      }
      .react-datepicker__time-container .react-datepicker__time-list-item--selected {
        background-color: hsl(var(--primary)) !important;
        color: hsl(var(--primary-foreground)) !important;
        font-weight: 600;
      }
      .react-datepicker__triangle {
        display: none;
      }
      .react-datepicker__time-list {
        background-color: white;
      }
      .react-datepicker__time-container {
        background-color: white;
      }
      .react-datepicker__time-box {
        background-color: white;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <ReactDatePicker
        selected={selectedTime}
        onChange={handleTimeChange}
        customInput={<CustomInput />}
        showTimeSelect
        showTimeSelectOnly
        timeIntervals={60}
        timeCaption="Saat"
        dateFormat="HH"
        timeFormat="HH"
        locale={tr}
        disabled={disabled}
        calendarClassName="shadow-lg"
        showPopperArrow={false}
        popperClassName="z-50"
        popperPlacement="bottom-start"
        popperModifiers={[]}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
