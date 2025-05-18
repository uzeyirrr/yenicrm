"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { tr } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 select-none", className)}
      locale={tr}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-6 sm:space-y-0",
        month: "space-y-6",
        caption: "flex justify-center pt-1 relative items-center mb-6",
        caption_label: "text-base font-semibold text-foreground tracking-wide",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-background p-0 opacity-80 hover:opacity-100 hover:bg-accent border border-input rounded-full"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-2",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-10 font-medium text-[0.9rem] py-2 uppercase text-xs tracking-wider",
        row: "flex w-full mt-2 gap-1",
        cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent/30 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 hover:bg-accent/20 transition-colors duration-200",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-accent/30 hover:text-accent-foreground transition-colors duration-200 rounded-full"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full shadow-sm",
        day_today: "bg-accent/50 text-accent-foreground font-semibold ring-2 ring-accent ring-offset-1",
        day_outside: "text-muted-foreground/60 opacity-50",
        day_disabled: "text-muted-foreground/50 opacity-40 line-through",
        day_range_middle:
          "aria-selected:bg-accent/30 aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: (props: React.ComponentProps<"svg">) => <ChevronLeft className="h-5 w-5" {...props} />,
        IconRight: (props: React.ComponentProps<"svg">) => <ChevronRight className="h-5 w-5" {...props} />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
