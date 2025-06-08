"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast as sonnerToast } from "sonner";
import {
  MoreVertical,
  Edit2,
  LogOut,
  CalendarDays,
  Briefcase,
  MapPin,
  ClockIcon,
  Loader2 as PageLoader,
  Edit,
  Check,
  PenLine,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/datepicker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, addDays, parse, differenceInMinutes } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

import DashboardWidget from "@/app/employee/components/dashboardwidget";
import { auth } from "@/app/firebase/config";
import { db } from "@/app/firebase/config";

import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  updateDoc, 
  where, 
  setDoc, 
  serverTimestamp, 
  limit,
  Timestamp
} from 'firebase/firestore';
import clsx from "clsx";



// DailyAttendance component (Check-in/Check-out)
export function DailyAttendance({
  onMarkSuccess,
  employeeId,
  currentLocation,
    user,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [attendanceId, setAttendanceId] = useState(null);
  const [attendanceType, setAttendanceType] = useState(""); // "check-in" or "check-out"
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [attendanceSettings, setAttendanceSettings] = useState({
    workingHours: "09:00",
    earlyCheckInAllowed: 30,
    lateCheckInAllowed: 30,
    checkInStartTime: "08:30",
    checkInEndTime: "10:00",
    checkOutStartTime: "17:00",
    checkOutEndTime: "18:30"
  });

  const [sampleData, setSampleData] = useState(null);

  const [checkAndStatus, setCheckAndStatus] = useState({
    checkInTime: null,
    checkOutTime: null,
    status: null  
  });

  // Fetch attendance settings
  useEffect(() => {
    const fetchAttendanceSettings = async () => {
      if (!user?.phoneNumber) return;
      
      try {
        const phoneNumber = user.phoneNumber.slice(3);
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("phone", "==", phoneNumber));
        const userSnapshot = await getDocs(userQuery);
        
        if (userSnapshot.empty) return;
        
        const userData = userSnapshot.docs[0].data();
        const adminUid = userData.adminuid;

        // Fetch daily attendance settings
        const dailySettingsRef = collection(db, "Daily_attendance");
        const dailySettingsQuery = query(
          dailySettingsRef,
          where("adminUid", "==", adminUid)
        );
        const dailySettingsSnapshot = await getDocs(dailySettingsQuery);

        if (!dailySettingsSnapshot.empty) {
          const settings = dailySettingsSnapshot.docs[0].data();
          setAttendanceSettings({
            workingHours: settings.workingHours || "09:00",
            earlyCheckInAllowed: settings.earlyCheckInAllowed || 30,
            lateCheckInAllowed: settings.lateCheckInAllowed || 30,
            checkInStartTime: settings.checkInStartTime || "08:30",
            checkInEndTime: settings.checkInEndTime || "10:00",
            checkOutStartTime: settings.checkOutStartTime || "17:00",
            checkOutEndTime: settings.checkOutEndTime || "18:30"
          });
        }
      } catch (error) {
        console.error("Error fetching attendance settings:", error);
      }
    };

    fetchAttendanceSettings();
  }, [user]);

  // Fetch attendance status on component mount
  useEffect(() => {
    const fetchTodayAttendance = async () => {
      if (!user?.phoneNumber) return;
      
      try {
        setIsLoadingAttendance(true);
        const phoneNumber = user.phoneNumber.slice(3);
        const dateToday = format(new Date(), "yyyy-MM-dd");
        
        // First get the user's employee ID
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("phone", "==", phoneNumber));
        const userSnapshot = await getDocs(userQuery);
        
        if (userSnapshot.empty) return;
        
        const userData = userSnapshot.docs[0].data();
        const employeeId = userData.uid;

        console.log("Employee ID:", employeeId);
        
        // Now get today's attendance record
        const attendanceRef = collection(db, "attendance");
        const attendanceQuery = query(
          attendanceRef,
          where("employeeId", "==", employeeId),
          where("date", "==", dateToday),
          limit(1)
        );
        console.log("Attendance Query:", attendanceQuery);
        const attendanceSnapshot = await getDocs(attendanceQuery);
        
        if (!attendanceSnapshot.empty) {
          const attendanceData = attendanceSnapshot.docs[0].data();
          setAttendanceId(attendanceSnapshot.docs[0].id);

          
        }
        fetchCheckAndStatus(employeeId);
      } catch (error) {
        console.error("Error fetching attendance:", error);
      } finally {
        setIsLoadingAttendance(false);
      }
    };


    const fetchCheckAndStatus = async(employeeId)=>{
      console.log("fetchCheckAndStatus started")

      console.log("employeeId",employeeId)
      
      try {
        const date_type = format(new Date(), "yyyy-MM-dd");
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("employeeId", "==", employeeId),
          where("date", "==", date_type),
      
        );
    
       
        const attendanceSnapshot = await getDocs(attendanceQuery);

        if (attendanceSnapshot.empty) {
          console.log("No attendance record found for today")
          return;
        }
    
        // Get the most recent attendance record
        const attendanceDoc = attendanceSnapshot.docs[0];
        const attendanceData = attendanceDoc.data();

        console.log("attendanceData",attendanceData)
        setCheckAndStatus({
          checkInTime: attendanceData.checkInTime,
          checkOutTime: attendanceData.checkOutTime,
          status: attendanceData.status
        });
        
        if(attendanceData.checkInTime){
          setIsCheckedIn(true);
          if(attendanceData.checkOutTime){
            setIsCheckedOut(true);
          }
        }

        
        console.log("checkAndStatus",checkAndStatus)
      } catch (error) {
        console.error("Error fetching check and status:", error);
      }
    };
    
    fetchTodayAttendance();
  }, [user]);

  // Update button states based on check-in/check-out status
  useEffect(() => {
    if (isCheckedIn && !isCheckedOut) {
      // User has checked in but not out
      setAttendanceType("check-out");
    } else if (!isCheckedIn) {
      // User hasn't checked in today
      setAttendanceType("check-in");
    } else {
      // User has completed check-in and check-out for today
      setAttendanceType("");
    }
  }, [isCheckedIn, isCheckedOut]);

  // Disable buttons while loading
  const isButtonDisabled = isLoading || isLoadingAttendance;


  const openCheckInDialog = () => {
    setAttendanceType("check-in");
    setIsDialogOpen(true);
  };

  const openCheckOutDialog = () => {
    setAttendanceType("check-out");
    setIsDialogOpen(true);
  };

  const isLateCheckIn = (time) => {
    const checkInEndTime = parse(attendanceSettings.checkInEndTime, "HH:mm", new Date());
    const actualCheckIn = parse(time, "hh:mm a", new Date());
    const diff = differenceInMinutes(actualCheckIn, checkInEndTime);
    return diff > attendanceSettings.lateCheckInAllowed;
  };

  const isEarlyCheckIn = (time) => {
    const checkInStartTime = parse(attendanceSettings.checkInStartTime, "HH:mm", new Date());
    const actualCheckIn = parse(time, "hh:mm a", new Date());
    const diff = differenceInMinutes(checkInStartTime, actualCheckIn);
    return diff > attendanceSettings.earlyCheckInAllowed;
  };

  const isAbsent = (time) => {
    const checkInEndTime = parse(attendanceSettings.checkInEndTime, "HH:mm", new Date());
    const currentTime = parse(time, "hh:mm a", new Date());
    return currentTime > checkInEndTime;
  };



  const handleCheckIn = async () => {
    setIsLoading(true);

   

    try {
      if (!user || !user.phoneNumber) {
        throw new Error("User not authenticated or phone number not available");
      }

      const phoneNumber = user.phoneNumber.slice(3);
      const dateToday = format(new Date(), "yyyy-MM-dd");
      const nowTime = format(new Date(), "hh:mm a");

      const isLate = isLateCheckIn(nowTime);
      const isEarly = isEarlyCheckIn(nowTime);

      // Query the users collection to find the user document
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phone", "==", phoneNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("User not found in database");
      }

      // Get the user document reference and data
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();


      let status = "present";
      if (isLate) {
        status = "late";
      } else if (isEarly) {
        status = "early";
      }
      
      if (isAbsent(nowTime)) {
        status = "absent";
      }
      
      // Create new attendance document in 'attendance' collection
      const newAttendanceRef = doc(collection(db, "attendance"));
      const newEntry = {
        name: userData.name,
        uid: newAttendanceRef.id,
        employeeId: userData.uid,
        adminUid: userData.adminuid,
        date: dateToday,
        checkInTime: nowTime,
        checkOutTime: null,
        status: status,
        location: currentLocation || "Office Geo",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        purpose: "Checked in",
        workingHours: attendanceSettings.workingHours,
        earlyCheckIn: isEarly,
        lateCheckIn: isLate
      };

      // Save the new attendance record
      await setDoc(newAttendanceRef, newEntry);
      
      // Store the attendance ID in state for check-out
      setAttendanceId(newAttendanceRef.id);

      setIsCheckedIn(true);
      onMarkSuccess("Checked In");
      const statusMessage = isEarly ? "Early" : isLate ? "Late" : "On time";
      sonnerToast.success(`Checked In Successfully! (${statusMessage})`, {
        description: `Time: ${nowTime}, Location: ${currentLocation || 'Office Geo'}`,
      });
    } catch (error) {
      console.error("Error during check-in:", error);
      sonnerToast.error("Check-in Failed", {
        description: error.message || "Failed to process check-in. Please try again.",
      });
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
    }

    setTimeout(() => {
      setIsCheckedIn(true);
      // localStorage.setItem(`dailyAttendance_${employeeId}_${format(new Date(), "yyyy-MM-dd")}`, "checkedIn");
      onMarkSuccess("Checked In");
      setIsLoading(false);
      setIsDialogOpen(false);
    }, 1000);
  };

  const handleCheckOut = async () => {
    setIsLoading(true);

    try {
      if (!user || !user.phoneNumber) {
        throw new Error("User not authenticated or phone number not available");
      }

      const phoneNumber = user.phoneNumber.slice(3);
      const dateToday = format(new Date(), "yyyy-MM-dd");
      const nowTime = format(new Date(), "hh:mm a");

     

      // Query the users collection to find the user document
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phone", "==", phoneNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("User not found in database");
      }

      // Get the user document reference and data
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // Find the most recent attendance record for today that doesn't have a check-out time
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("employeeId", "==", userData.uid),
        where("date", "==", dateToday),
      );

      const attendanceSnapshot = await getDocs(attendanceQuery);

      if (attendanceSnapshot.empty) {
        throw new Error("No active check-in found for today");
      }

      // Get the first matching attendance record (should be the most recent check-in)
      const attendanceDoc = attendanceSnapshot.docs[0];
      const attendanceRef = doc(db, "attendance", attendanceDoc.id);

      // Update the attendance record with check-out time
      await updateDoc(attendanceRef, {
        checkOutTime: nowTime,
        updatedAt: serverTimestamp(),
        timestamp: Timestamp.now(),
        purpose: "Checked out"
      });

      setIsCheckedOut(true);
      onMarkSuccess("Checked Out");
      sonnerToast.success("Checked Out Successfully!", {
        description: `Time: ${nowTime}, Location: ${currentLocation || 'Office Geo'}`,
      });
    } catch (error) {
      console.error("Error during check-out:", error);
      sonnerToast.error("Check-out Failed", {
        description: error.message || "Failed to process check-out. Please try again.",
      });
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="space-y-3 self-center">
      <p className="text-sm text-muted-foreground font-semibold">
        Log your daily start and end times.
      </p>
      {!isCheckedIn && (
        <Button
          onClick={openCheckInDialog}
          disabled={isLoading || isCheckedOut}
          className="w-full sm:w-auto bg-green-500 hover:bg-green-600"
        >
          {isLoading ? (
            <PageLoader className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Check-in"
          )}
        </Button>
      )}
      {isCheckedIn && !isCheckedOut && (
        <Button
          onClick={openCheckOutDialog}
          disabled={isLoading}
          className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600"
        >
          {isLoading ? (
            <PageLoader className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Check-out"
          )}
        </Button>
      )}
      {isCheckedIn && isCheckedOut && (
        <Button disabled className="w-full sm:w-auto bg-slate-400">
          Attendance Marked for Today
        </Button>
      )}

      {/* Dialog for Check-in/Check-out with Markattendace component */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {attendanceType === "check-in" ? "Check In" : "Check Out"}
            </DialogTitle>
            <DialogDescription>
              Please confirm your{" "}
              {attendanceType === "check-in" ? "arrival" : "departure"} details.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <DashboardWidget />
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              onClick={
                attendanceType === "check-in" ? handleCheckIn : handleCheckOut
              }
              disabled={isLoading}
              className={
                attendanceType === "check-in"
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-orange-500 hover:bg-orange-600"
              }
            >
              {isLoading ? (
                <PageLoader className="mr-2 h-4 w-4 animate-spin" />
              ) : attendanceType === "check-in" ? (
                "Confirm Check-in"
              ) : (
                "Confirm Check-out"
              )}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isCheckedIn && !isCheckedOut && (
        <p className="text-xs text-green-600">You are currently checked in.</p>
      )}
    </div>
  );
}
