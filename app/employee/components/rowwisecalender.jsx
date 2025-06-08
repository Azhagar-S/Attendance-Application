import React from 'react';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, XCircle, Briefcase } from 'lucide-react';

const RowWiseCalendar = ({ attendanceData = [],  selectedDate, onDateSelect }) => {
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
      {/* Day labels */}
      <div className="flex justify-between mb-2 w-full">
        {dates.map((date, index) => (
          <div key={index} className="flex-1 text-center">
            <span className="text-xs sm:text-sm text-gray-500 font-medium">
              {format(date, 'EEE')}
            </span>
          </div>
        ))}
      </div>
      
      {/* Date row */}
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
                "h-8 w-8 text-[10px] sm:h-12 sm:w-12 sm:text-xs md:h-16 md:w-16 md:text-sm min-w-0", // Responsive sizing for all breakpoints
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
                "text-xs sm:text-sm font-semibold leading-none",
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
      
      {/* Legend - Responsive layout */}
      <div className="mt-3 sm:mt-4">
        <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 text-xs sm:text-sm whitespace-nowrap">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
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