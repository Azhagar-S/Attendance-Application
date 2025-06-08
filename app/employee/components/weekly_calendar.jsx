"use client";

import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

const getThisWeek = () => {
  const today = new Date();
  const start = startOfWeek(today);
  const end = endOfWeek(today);
  const days = eachDayOfInterval({ start, end });

  return days.map((date) => ({
    date,
    day: format(date, "EEE"),
    fullDate: format(date, "yyyy-MM-dd"),
    isToday: format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd"),
    isCurrentWeek: true // All days in this array are current week
  }));
};  

const WeeklyCalendar = ({ attendanceData }) => {
    const week = getThisWeek();
    const today = new Date();
  
    return (
      <div className="w-full space-y-4">
        {/* Week Navigation */}
        <div className="flex justify-between items-center px-2">
          <span className="text-sm font-medium">
            Current Week: {format(startOfWeek(today), "MMM d")} - {format(endOfWeek(today), "MMM d")}
          </span>
        </div>
  
        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Weekdays Header */}
          {week.map((day) => (
            <div 
              key={day.fullDate}
              className="text-xs text-muted-foreground text-center"
            >
              {day.day}
            </div>
          ))}
  
          {/* Days of the Week */}
          {week.map((day) => {
            // Find attendance record for this day
            const attendanceRecord = attendanceData?.find(
              (record) => 
                // Compare dates without time
                format(new Date(record.date), "yyyy-MM-dd") === day.fullDate
            );
  
            // Get status with case-insensitive comparison
            const status = attendanceRecord?.status?.toLowerCase() || "absent";
            const isToday = day.isToday;
            const isCurrentWeek = day.isCurrentWeek;
  
            return (
              <div 
                key={day.fullDate}
                className={cn(
                  "h-16 sm:h-20 flex flex-col items-center justify-center rounded-md border",
                  {
                    "bg-green-100 hover:bg-green-200": status === "present",
                    "bg-yellow-100 hover:bg-yellow-200": status === "late",
                    "bg-red-100/50 hover:bg-red-200/50": status === "absent" && isCurrentWeek,
                    "border-primary": isToday,
                    "text-muted-foreground": status === "absent",
                  },
                  "transition-colors duration-200"
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm sm:text-base font-medium">
                    {day.date.getDate()}
                  </span>
                  {status && status !== "absent" && (
                    <div className="flex items-center gap-1">
                      {status === "present" && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {status === "late" && (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

export default WeeklyCalendar;