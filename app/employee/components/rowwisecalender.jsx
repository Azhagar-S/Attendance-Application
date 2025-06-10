import React from 'react';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, XCircle, Briefcase, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const RowWiseCalendar = ({ attendanceData = [], selectedDate, onDateSelect }) => {
  const today = new Date();
  
  // Create an array of 7 days with today in the center (index 3)
  const daysToShow = 7;
  const centerIndex = Math.floor(daysToShow / 2); // This will be 3 for 7 days
  
  const dates = [];
  for (let i = -centerIndex; i <= centerIndex; i++) {
    dates.push(addDays(today, i));
  }

  const statusColors = {
    present: {
      background: "bg-green-100",
      border: "border-green-300",
      icon: <CheckCircle className="h-3 w-3 text-green-600" />,
      dot: "bg-green-500"
    },
    late: {
      background: "bg-yellow-100",
      border: "border-yellow-300",
      icon: <Clock className="h-3 w-3 text-yellow-600" />,
      dot: "bg-yellow-500"
    },
    absent: {
      background: "bg-red-100",
      border: "border-red-300",
      icon: <XCircle className="h-3 w-3 text-red-600" />,
      dot: "bg-red-500"
    },
    leave: {
      background: "bg-blue-100",
      border: "border-blue-300",
      icon: <Briefcase className="h-3 w-3 text-blue-600" />,
      dot: "bg-blue-500"
    },
  };

  const getAttendanceForDate = (date) => {
    return attendanceData?.find(
      (record) => 
        format(new Date(record.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  return (
    <div className="w-full px-1 sm:px-4">
      <div className="max-w-full mx-auto">
        {/* Date Picker Button - Enhanced for better mobile responsiveness */}
        <div className="flex justify-end mb-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] sm:w-[160px] justify-start text-left font-normal text-xs sm:text-sm",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {selectedDate ? format(selectedDate, "MMM d") : <span>Pick date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onDateSelect}
                initialFocus
                className="rounded-md border"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Day labels - Enhanced for better mobile display */}
      <div className="flex justify-between mb-2 w-full">
        {dates.map((date, index) => (
          <div key={index} className="flex-1 text-center">
              <span className="text-[10px] sm:text-xs md:text-sm text-gray-500 font-medium">
              {format(date, 'EEE')}
            </span>
          </div>
        ))}
      </div>
      
        {/* Date row - Enhanced for better mobile display */}
      <div className="flex justify-between gap-0.5 sm:gap-2 w-full">
        {dates.map((date, index) => {
          const attendanceRecord = getAttendanceForDate(date);
          const status = attendanceRecord?.status?.toLowerCase();
          const styles = status ? statusColors[status] : null;
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          
          return (
            <button
              key={index}
              aria-label={`Select ${format(date, 'EEEE, MMMM d, yyyy')}${isToday ? ' (Today)' : ''}`}
              onClick={() => onDateSelect && onDateSelect(date)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center rounded-lg border-2 relative transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                  "h-7 w-7 text-[10px] sm:h-10 sm:w-10 sm:text-xs md:h-14 md:w-14 md:text-sm min-w-0", // Adjusted sizes for better mobile display
                "touch-manipulation select-none",
                isToday && "ring-2 ring-blue-500 ring-offset-1",
                isSelected && "bg-blue-600 text-white border-blue-600",
                !isSelected && styles?.background,
                !isSelected && styles?.border,
                !isSelected && !styles && "bg-gray-50 border-gray-200 hover:bg-gray-100",
                "active:scale-95"
              )}
              tabIndex={0}
              type="button"
            >
              {/* Date number */}
              <span className={cn(
                  "text-[10px] sm:text-xs md:text-sm font-semibold leading-none",
                isToday && !isSelected && "text-blue-600",
                isSelected && "text-white"
              )}>
                {format(date, 'd')}
              </span>
              
              {/* Status indicator */}
              {status && !isSelected && (
                <div className="mt-0.5 sm:mt-1">
                  <div className="scale-75 sm:scale-100">
                    {styles.icon}
                  </div>
                </div>
              )}
              
              {/* Status dot for selected date */}
              {status && isSelected && (
                <div className={cn(
                  "absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
                  styles.dot
                )} />
              )}
              
              {/* Today indicator */}
              {isToday && (
                <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      
        {/* Legend - Enhanced for better mobile display */}
        <div className="mt-2 sm:mt-3">
          <div className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm whitespace-nowrap">
          <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500" />
            <span className="text-gray-600">Today</span>
          </div>
          {Object.entries(statusColors).map(([status, style]) => (
            <div key={status} className="flex items-center gap-1 min-w-fit">
              <div className="scale-75 sm:scale-100">
                {style.icon}
              </div>
              <span className="text-gray-600 capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
};

export default RowWiseCalendar;