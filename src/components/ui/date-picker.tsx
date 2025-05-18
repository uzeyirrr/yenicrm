"use client";

import * as React from "react";
import ReactDatePicker from "react-datepicker";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import "react-datepicker/dist/react-datepicker.css";
import { Label } from "./label";

export interface CustomDatePickerProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
}

export function CustomDatePicker({
  selected,
  onSelect,
  placeholder = "Tarih seçin",
  className,
  id,
  disabled,
  label,
  error,
}: CustomDatePickerProps) {
  // Custom input to match our design
  const CustomInput = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<"button">>(({ value, onClick }, ref) => (
    <Button
      id={id}
      disabled={disabled}
      variant={"outline"}
      onClick={onClick}
      ref={ref}
      type="button"
      className={cn(
        "w-full justify-start text-left font-normal border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2",
        !selected && "text-muted-foreground",
        error && "border-red-500",
        className
      )}
    >
      <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
      {value ? (
        <span className="font-medium">{value}</span>
      ) : (
        <span className="text-muted-foreground">{placeholder}</span>
      )}
    </Button>
  ));
  
  CustomInput.displayName = "CustomDatePickerInput";

  // Apply custom styles to the calendar
  React.useEffect(() => {
    // Add custom styles for the datepicker
    const style = document.createElement('style');
    style.innerHTML = `
      .react-datepicker {
        font-family: inherit;
        border-radius: 0.5rem;
        border: 1px solid hsl(var(--border));
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        background-color: white;
      }
      .react-datepicker__header {
        background-color: white;
        border-bottom: 1px solid hsl(var(--border));
        border-top-left-radius: 0.5rem;
        border-top-right-radius: 0.5rem;
        padding-top: 0.5rem;
      }
      .react-datepicker__month-container {
        background-color: white;
      }
      .react-datepicker__day-name {
        color: hsl(var(--muted-foreground));
        font-weight: 500;
        font-size: 0.75rem;
        margin: 0.4rem;
        text-transform: uppercase;
      }
      .react-datepicker__month {
        background-color: white;
      }
      .react-datepicker__day {
        margin: 0.4rem;
        border-radius: 9999px;
        color: hsl(var(--foreground));
        transition: all 150ms;
        background-color: white;
      }
      .react-datepicker__day:hover {
        background-color: hsl(var(--accent) / 0.3);
      }
      .react-datepicker__day--selected {
        background-color: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
      }
      .react-datepicker__day--keyboard-selected {
        background-color: hsl(var(--primary) / 0.8);
        color: hsl(var(--primary-foreground));
      }
      .react-datepicker__day--today {
        font-weight: bold;
        border: 2px solid hsl(var(--accent));
      }
      .react-datepicker__day--outside-month {
        color: hsl(var(--muted-foreground) / 0.6);
      }
      .react-datepicker__navigation {
        top: 0.5rem;
      }
      .react-datepicker__navigation-icon::before {
        border-color: hsl(var(--foreground));
      }
      .react-datepicker__current-month {
        color: hsl(var(--foreground));
        font-weight: 600;
        font-size: 1rem;
        padding-bottom: 0.5rem;
      }
      .react-datepicker__day-names {
        background-color: white;
      }
      .react-datepicker__week {
        background-color: white;
      }
      .react-datepicker__month-text {
        background-color: white;
      }
      .react-datepicker__month-container {
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
        selected={selected}
        onChange={(date: Date | null) => onSelect?.(date || undefined)}
        customInput={<CustomInput />}
        dateFormat="d MMMM yyyy"
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

// Export with the original name for backward compatibility
export { CustomDatePicker as DatePicker };
