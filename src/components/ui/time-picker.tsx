"use client";

import * as React from "react";
import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/lib/utils";

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
  ...props
}: TimePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor="time">{label}</Label>}
      <Input
        type="time"
        id="time"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={cn(error && "border-red-500", "w-full")}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
