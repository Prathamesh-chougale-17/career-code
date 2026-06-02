"use client";

import { CalendarDays } from "lucide-react";

import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";

export function DiaryDatePickerPopover({
  dateLabel,
  disabled,
  open,
  selectedDate,
  onOpenChange,
  onSelectDate,
}: {
  dateLabel: string;
  disabled: boolean;
  open: boolean;
  selectedDate: Date;
  onOpenChange: (open: boolean) => void;
  onSelectDate: (date: Date) => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            disabled={disabled}
          />
        }
      >
        <CalendarDays data-icon="inline-start" aria-hidden="true" />
        {dateLabel}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) {
              return;
            }

            onSelectDate(date);
            onOpenChange(false);
          }}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}
