"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { format, addDays } from "date-fns";
import { ClockIcon, MapPin } from "lucide-react";
import { DailyAttendance } from "./profileheader";
import Meetingattendance from "./meetingattendance";
import { db } from "@/app/firebase/config";
import { query, collection, where, getDocs } from "firebase/firestore";
import WeeklyCalendar from "./weekly_calendar";
import { cn } from "@/lib/utils";
import { CheckCircle, Clock, XCircle, Briefcase, User, Calendar as CalendarIcon } from "lucide-react";
import RowWiseCalendar from './rowwisecalender';

// Helper function to safely convert Firestore date to JavaScript Date
const convertToDate = (dateValue) => {
  if (!dateValue) return null;
  
  // If it's already a Date object
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }
  
  // If it's a Firestore Timestamp
  if (dateValue && typeof dateValue.toDate === 'function') {
    return dateValue.toDate();
  }
  
  // If it's a string or number, try to parse it
  const parsedDate = new Date(dateValue);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

// New component to display selected date attendance details
const SelectedDateDetails = ({ selectedDate, attendanceData }) => {
  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  // Defensive: always check attendanceData is an array
  const safeAttendanceData = Array.isArray(attendanceData) ? attendanceData : [];

  let selectedAttendance = undefined;
  if (selectedDateStr) {
    selectedAttendance = safeAttendanceData.find((record) => {
      try {
        const recordDate = convertToDate(record?.date);
        if (!recordDate) return false;
        return format(recordDate, "yyyy-MM-dd") === selectedDateStr;
      } catch (error) {
        console.error("Date formatting error:", error, record?.date);
        return false;
      }
    });
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'late':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'absent':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'leave':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'late':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'leave':
        return <Briefcase className="h-5 w-5 text-blue-600" />;
      default:
        return <CalendarIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : "Attendance Details"}
        </CardTitle>
        <CardDescription>
          {selectedDate ? "Details for the selected date" : "Select a date to see attendance."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedDate ? (
          // If a date is selected, show attendance details or "No Record"
          selectedAttendance ? (
            <div className="space-y-4">
              {/* Status Badge */}
              <div className={cn(
                "flex items-center gap-3 p-4 rounded-lg border",
                getStatusColor(selectedAttendance?.status)
              )}>
                {getStatusIcon(selectedAttendance?.status)}
                <div className="flex-1">
                  <div className="font-semibold text-lg">
                    {selectedAttendance?.status || 'Unknown'}
                  </div>
                  <div className="text-sm opacity-80">
                    Attendance Status
                  </div>
                </div>
              </div>

              {/* Time Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedAttendance?.checkInTime && (
                  <div className="bg-white border rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700 mb-1">
                      <ClockIcon className="h-4 w-4" />
                      <span className="font-medium">Check In</span>
                    </div>
                    <div className="text-lg font-semibold">
                      {selectedAttendance?.checkInTime}
                    </div>
                  </div>
                )}

                {selectedAttendance?.checkOutTime && (
                  <div className="bg-white border rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-700 mb-1">
                      <ClockIcon className="h-4 w-4" />
                      <span className="font-medium">Check Out</span>
                    </div>
                    <div className="text-lg font-semibold">
                      {selectedAttendance?.checkOutTime}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                No Attendance Record
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {`No attendance was recorded for ${format(selectedDate, 'MMMM d, yyyy')}`}
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Absent</span>
                </div>
              </div>
            </div>
          )
        ) : (
          // If no date is selected, show a placeholder
          <div className="text-center py-8">
            <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Select a Date
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Click on a date in the calendar to view attendance details.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// AttendanceHistoryTab component
export default function AttendanceHistoryTab({ employeeId, user }) {
  const [selectedDate, setSelectedDate] = useState(new Date()); // Auto-populated to current date
  const [attendanceData, setAttendanceData] = useState([]);
  const [isMobileView, setIsMobileView] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [location, setLocation] = useState("Office Location");
  const [attendanceStatusMsg, setAttendanceStatusMsg] = useState("");
  const router = useRouter();
  const [admin_uid, setAdmin_uid] = useState("");
  const [profile, setProfile] = useState({
    tracingMethod: "",
  });
  const [realAbsent, setRealAbsent] = useState(false);
  const handleDateSelect = (date) => {
    // This prevents deselection. If a date is clicked when already selected,
    // the calendar passes `undefined`. We check for that and do nothing,
    // keeping the original date selected.
    if (date) {
      setSelectedDate(date);
    }
  };

  useEffect(() => {
         console.log("selectedDate",selectedDate)
  },[selectedDate])

  const handleAttendanceMarked = (status) => {
    setAttendanceStatusMsg(
      `Status: ${status} at ${new Date().toLocaleTimeString()}`
    );
    setTimeout(() => setAttendanceStatusMsg(""), 5000); // Clear message after 5s
  };

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const q = query(
          collection(db, "attendance"),
          where("employeeId", "==", employeeId)
        );
        const querySnapshot = await getDocs(q);
        const fetchedAttendanceData = [];
        querySnapshot.docs.forEach((doc) => {
          fetchedAttendanceData.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        if(querySnapshot.empty){
          setRealAbsent(true);
        }

        // Debug: Log the employee ID we're querying with
        console.log("Fetching user data for employeeId:", employeeId);
        
        const userQuery = query(
          collection(db, "users"),
          where("uid", "==", employeeId)
        );
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          const userData = userDoc.data();

          console.log("userData",userData)
          
          const adminUid = userData.adminuid;
          setAdmin_uid(adminUid);
          
          if (adminUid) {
            const adminQuery = query(
              collection(db, "users"),
              where("adminuid", "==", adminUid)
            );
            const adminSnapshot = await getDocs(adminQuery);

            console.log("adminSnapshot",adminSnapshot.docs[0].data())
            
            if (!adminSnapshot.empty) {
              const adminDoc = adminSnapshot.docs[0];
              const employeeData = adminDoc.data();
              
              const tracingMethod = employeeData.tracingMethod;
              
              setProfile({
                tracingMethod: tracingMethod,
              });
            } else {
              console.log("No admin document found");
            }
          } else {
            console.log("No admin UID found in user data");
          }
        } else {
          console.log("No user document found for employeeId:", employeeId);
        }
        
        setAttendanceData(fetchedAttendanceData);
        console.log("Attendance Data:", fetchedAttendanceData);
      } catch (error) {
        console.error("Error fetching attendance data:", error);
      }
    };
    fetchAttendanceData();
  }, [employeeId, router]);

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Helper function to convert dates for calendar modifiers
  const getCalendarDates = (status) => {
    return attendanceData
      .filter((d) => d.status?.toLowerCase() === status.toLowerCase())
      .map((d) => convertToDate(d.date))
      .filter((date) => date !== null); // Filter out invalid dates
  };

  const statusColors = {
    present: {
      background: "bg-green-100",
      hover: "hover:bg-green-200",
      icon: <CheckCircle className="h-4 w-4 text-green-600" />,
    },
    late: {
      background: "bg-yellow-100",
      hover: "hover:bg-yellow-200",
      icon: <Clock className="h-4 w-4 text-yellow-600" />,
    },
    absent: {
      background: "bg-red-100",
      hover: "hover:bg-red-200",
      icon: <XCircle className="h-4 w-4 text-red-600" />,
    },
    leave: {
      background: "bg-blue-100",
      hover: "hover:bg-blue-200",
      icon: <Briefcase className="h-4 w-4 text-blue-600" />,
    },
  };

  if(admin_uid){
    console.log("admin_uid the final",admin_uid)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Attendance Log</CardTitle>
        <CardDescription>
          Select a date on the calendar to view detailed attendance information.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isMobileView ? ( // Desktop View
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Calendar Section - Enhanced for better responsiveness */}
            <div className="lg:col-span-1 bg-white rounded-lg border p-2 sm:p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="rounded-md border shadow mx-auto"
                initialFocus
                defaultMonth={selectedDate}
                modifiers={{
                  today: new Date(),
                  present: getCalendarDates("present"),
                  late: getCalendarDates("late"),
                  absent: getCalendarDates("absent"),
                  leave: getCalendarDates("leave"),
                }}
                modifiersStyles={{
                  today: {
                    border: '2px solid #3b82f6',
                    fontWeight: 'bold',
                  },
                  present: {
                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                    borderColor: "rgba(16, 185, 129, 0.5)",
                  },
                  late: {
                    backgroundColor: "rgba(245, 158, 11, 0.2)",
                    borderColor: "rgba(245, 158, 11, 0.5)",
                  },
                  absent: {
                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                    borderColor: "rgba(239, 68, 68, 0.5)",
                  },
                  leave: {
                    backgroundColor: "rgba(59, 130, 246, 0.2)",
                    borderColor: "rgba(59, 130, 246, 0.5)",
                  },
                }}
              />
            </div>

            {/* Selected Date Details Section - Enhanced for better responsiveness */}
            <div className="lg:col-span-2">
              <SelectedDateDetails 
                selectedDate={selectedDate}
                attendanceData={attendanceData}
              />
            </div>

            {/* Attendance Marking Section */}
            <div className="lg:col-span-3">
              {profile.tracingMethod === "Daily Attendance" ? (
                <DailyAttendance
                  onMarkSuccess={handleAttendanceMarked}
                  employeeId={profile.id}
                  user={user}
                />
              ) : profile.tracingMethod === "Schedule Meetings" ? (
                <Meetingattendance
                  onMarkSuccess={handleAttendanceMarked}
                  employeeId={profile.id}
                />
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 font-medium">
                    ⚠️ Error: Attendance tracing method not configured.
                  </p>
                </div>
              )}
              
              {attendanceStatusMsg && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                  <p className="text-green-600 font-medium">
                    {attendanceStatusMsg}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Mobile View - Enhanced for better responsiveness
          <div className="mt-4 space-y-4">
            {/* Row-wise Calendar */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <RowWiseCalendar 
                attendanceData={attendanceData}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />
            </div>
            
            {/* Selected Date Details for Mobile - Enhanced spacing */}
            <div className="mt-4">
              <SelectedDateDetails 
                selectedDate={selectedDate}
                attendanceData={attendanceData}
              />
            </div>
        
            {/* Attendance Marking Section */}
            <div className="mt-4">
              {profile.tracingMethod === "Daily Attendance" ? (
                <DailyAttendance
                  onMarkSuccess={handleAttendanceMarked}
                  employeeId={profile.id}
                  user={user}
                />
              ) : profile.tracingMethod === "Schedule Meetings" ? (
                <Meetingattendance
                  onMarkSuccess={handleAttendanceMarked}
                  employeeId={profile.id}
                  admin_uid={admin_uid}
                />
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600 font-medium">
                    ⚠️ Attendance tracing method not configured
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    Please contact your administrator to set up attendance tracking.
                  </p>
                </div>
              )}
            </div>
        
            {/* Status Message */}
            {attendanceStatusMsg && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <p className="text-sm text-green-700 font-medium">
                    {attendanceStatusMsg}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}