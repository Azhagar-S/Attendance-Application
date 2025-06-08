"use client";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast as sonnerToast } from 'sonner';
import { Loader2 as PageLoader } from 'lucide-react';

export default function DailyAttendance({ onMarkSuccess, employeeId }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);

  // const handleCheckIn = async () => {
  //   setIsLoading(true);
  //   setTimeout(() => {
  //     // Sonner notification
  //     sonnerToast.success("Checked In Successfully!", { description: `Time: ${new Date().toLocaleTimeString()}` });
  //     setIsCheckedIn(true);
  //     onMarkSuccess("Checked In");
  //     setIsLoading(false);
  //   }, 1000);
  // };

  const handleCheckOut = async () => {
    setIsLoading(true);
    setTimeout(() => {
      // Sonner notification
      sonnerToast.success("Checked Out Successfully!", { description: `Time: ${new Date().toLocaleTimeString()}` });
      setIsCheckedOut(true);
      onMarkSuccess("Checked Out");
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Log your daily start and end times.</p>
      {!isCheckedIn && (
        <Button disabled={isLoading || isCheckedOut} className="w-full sm:w-auto bg-green-500 hover:bg-green-600">
          {isLoading ? <PageLoader className="mr-2 h-4 w-4 animate-spin" /> : "Check-in"}
        </Button>
      )}
      {isCheckedIn && !isCheckedOut && (
        <Button disabled={isLoading} className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600">
          {isLoading ? <PageLoader className="mr-2 h-4 w-4 animate-spin" /> : "Check-out"}
        </Button>
      )}
      {isCheckedIn && isCheckedOut && (
        <Button disabled className="w-full sm:w-auto bg-slate-400">Attendance Marked for Today</Button>
      )}
      {isCheckedIn && !isCheckedOut && <p className="text-xs text-green-600">You are currently checked in.</p>}
    </div>
  );
}
