"use client";
import { useEffect, useState } from "react";
import { toast as sonnerToast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2 as PageLoader, X } from "lucide-react";
import { format } from "date-fns";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PenLine, Calendar, Clock, FileText, User } from "lucide-react";
import { db } from "@/app/firebase/config";
import {
  query,
  collection,
  where,
  getDocs,
  setDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { Switch } from "@/components/ui/switch";

// Enhanced Logging System
class Logger {
  static LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
  };

  static currentLevel = Logger.LOG_LEVELS.INFO;

  static log(level, message, data = null, context = "LeaveTab") {
    if (level > Logger.currentLevel) return;

    const timestamp = new Date().toISOString();
    const levelNames = ["ERROR", "WARN", "INFO", "DEBUG"];
    const levelName = levelNames[level];

    const logEntry = {
      timestamp,
      level: levelName,
      context,
      message,
      data,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    try {
      const logs = JSON.parse(sessionStorage.getItem("app_logs") || "[]");
      logs.push(logEntry);
      if (logs.length > 100) logs.shift();
      sessionStorage.setItem("app_logs", JSON.stringify(logs));
    } catch (e) {
      console.warn("Failed to store log in sessionStorage:", e);
    }

    if (level === Logger.LOG_LEVELS.ERROR) {
      Logger.reportError(logEntry);
    }

    return logEntry;
  }

  static error(message, data, context) {
    return Logger.log(Logger.LOG_LEVELS.ERROR, message, data, context);
  }

  static warn(message, data, context) {
    return Logger.log(Logger.LOG_LEVELS.WARN, message, data, context);
  }

  static info(message, data, context) {
    return Logger.log(Logger.LOG_LEVELS.INFO, message, data, context);
  }

  static debug(message, data, context) {
    return Logger.log(Logger.LOG_LEVELS.DEBUG, message, data, context);
  }

  static reportError(logEntry) {
    console.log("🚨 Critical error reported:", logEntry);
  }

  static getLogs() {
    try {
      return JSON.parse(sessionStorage.getItem("app_logs") || "[]");
    } catch (e) {
      return [];
    }
  }

  static clearLogs() {
    sessionStorage.removeItem("app_logs");
  }
}

// Performance monitoring utility
class PerformanceMonitor {
  static timers = new Map();

  static start(label) {
    Logger.debug(`Performance timer started: ${label}`);
    PerformanceMonitor.timers.set(label, performance.now());
  }

  static end(label) {
    const startTime = PerformanceMonitor.timers.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      Logger.info(
        `Performance: ${label} completed in ${duration.toFixed(2)}ms`
      );
      PerformanceMonitor.timers.delete(label);
      return duration;
    }
    Logger.warn(`Performance timer '${label}' not found`);
    return null;
  }
}

export default function LeaveTab({ user }) {

  const [monthlyQuota, setMonthlyQuota] = useState(0);
  const [totalAvailableLeaves, setTotalAvailableLeaves] = useState(0);

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [isApplyLeaveDialogOpen, setIsApplyLeaveDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(new Date().setDate(new Date().getDate() + 1))
  );
  const [leaveType, setLeaveType] = useState("");
  const [reason, setReason] = useState("");
  const [employeeData, setEmployeeData] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [leaveQuota, setLeaveQuota] = useState("");
  const [carryForward, setCarryForward] = useState(false);
  const [maximumDaysCarryForward, setMaximumDaysCarryForward] = useState("");
  const [leavesTakenThisMonth, setLeavesTakenThisMonth] = useState(0);
  const [carriedForwardLeaves, setCarriedForwardLeaves] = useState(0);
  const [addTime, setAddTime] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [notClicked, setNotClicked] = useState(false);
  const [adminTrackingMethod, setAdminTrackingMethod] = useState(null);
  const [partialLeave, setPartialLeave] = useState(false);
  const [officeStartTime, setOfficeStartTime] = useState(null);
  const [officeEndTime, setOfficeEndTime] = useState(null);

  // Check for mobile view
  useEffect(() => {
    Logger.info("LeaveTab component mounted", { userId: user?.phoneNumber });

    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      Logger.debug("Screen size check", {
        width: window.innerWidth,
        isMobile: mobile,
      });
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
      Logger.info("LeaveTab component unmounted");
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchEmployeeData = async () => {
      if (!user) {
        Logger.warn("No user provided for employee data fetch");
        return;
      }

      PerformanceMonitor.start("fetchEmployeeData");
      Logger.info("Starting employee data fetch", { userId: user.phoneNumber });

      try {
        const phone = user.phoneNumber.slice(3);
        const q = query(collection(db, "users"), where("phone", "==", phone));
        const querySnapshot = await getDocs(q);

        if (!isMounted) {
          Logger.debug("Component unmounted, skipping employee data update");
          return;
        }

        if (querySnapshot.empty) {
          Logger.warn("No employee data found", { phone });
          return;
        }

        const employeeData = querySnapshot.docs[0].data();
        setEmployeeData(employeeData);

        if (employeeData.adminuid) {
          const adminQuery = query(
            collection(db, "users"),
            where("uid", "==", employeeData.adminuid)
          );
          const adminSnapshot = await getDocs(adminQuery);

          if (!adminSnapshot.empty) {
            const adminData = adminSnapshot.docs[0].data();
            setAdminTrackingMethod(adminData.trackingMethod || "monthly");
            Logger.info("Admin tracking method fetched", {
              adminId: employeeData.adminuid,
              trackingMethod: adminData.trackingMethod,
            });
          }
        }

        await fetchLeaveRequests(employeeData.uid);
        await fetchLeaveQuota(employeeData.adminuid);
        await fetchOfficeStartTime(employeeData.adminuid);

        Logger.info("Employee data fetched successfully", {
          employeeId: employeeData.uid,
          adminId: employeeData.adminuid,
        });

        PerformanceMonitor.end("fetchEmployeeData");
      } catch (error) {
        Logger.error(
          "Error fetching employee data",
          error,
          "fetchEmployeeData"
        );
        sonnerToast.error("Failed to load employee data", {
          description: "Please refresh the page or contact support.",
        });
        PerformanceMonitor.end("fetchEmployeeData");
      }
    };

    const fetchLeaveRequests = async (employeeUid) => {
      if (!employeeUid) {
        Logger.warn("No employee UID provided for leave requests fetch");
        return;
      }

      PerformanceMonitor.start("fetchLeaveRequests");
      Logger.info("Starting leave requests fetch", { employeeUid });

      try {
        const leavesQuery = query(
          collection(db, "leaves"),
          where("employeeuid", "==", employeeUid)
        );
        const querySnapshot = await getDocs(leavesQuery);

        if (!isMounted) {
          Logger.debug("Component unmounted, skipping leave requests update");
          return;
        }

        let count = 0;
        const requests = [];
        querySnapshot.forEach((doc) => {
          requests.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        requests.sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn));
        setLeaveRequests(requests);

        setLeavesTakenThisMonth(calculateLeavesTakenThisMonth(requests));
        setCarriedForwardLeaves(calculateCarriedForwardLeaves(requests));

        Logger.info("Leave requests fetched successfully", {
          count: requests.length,
          requests: requests.map((r) => ({
            id: r.id,
            status: r.status,
            appliedOn: r.appliedOn,
          })),
        });

        PerformanceMonitor.end("fetchLeaveRequests");
      } catch (error) {
        Logger.error(
          "Error fetching leave requests",
          error,
          "fetchLeaveRequests"
        );
        sonnerToast.error("Failed to load leave history", {
          description: "Please refresh the page or contact support.",
        });
        PerformanceMonitor.end("fetchLeaveRequests");
      }
    };

    const fetchLeaveQuota = async (adminuid) => {
      try {
        const leaveQuotaRef = query(
          collection(db, "Daily_attendance"),
          where("adminUid", "==", adminuid)
        );
        const querySnapshot = await getDocs(leaveQuotaRef);

        if (querySnapshot.empty) {
          console.log("No leave quota data found for adminuid:", adminuid);
          return;
        }

        const leaveQuotaData = querySnapshot.docs[0].data();
        if (leaveQuotaData) {
          setLeaveQuota(leaveQuotaData.leaveQuota || 0);
          setCarryForward(leaveQuotaData.carryForward || false);
          setMaximumDaysCarryForward(
            leaveQuotaData.maximumDaysCarryForward || 0
          );
        }
      } catch (error) {
        console.error("Error fetching leave quota:", error);
        sonnerToast.error("Failed to load leave quota", {
          description: "Please refresh the page or contact support.",
        });
      }
    };

    const fetchOfficeStartTime = async (adminuid) => {
      const officeStartTimeRef = query(
        collection(db, "Daily_attendance"),
        where("adminUid", "==", adminuid)
      );
      const querySnapshot = await getDocs(officeStartTimeRef);
      if (!querySnapshot.empty) {
        const officeStartTime = querySnapshot.docs[0].data().defaultStartTime;
        setOfficeStartTime(officeStartTime);
        const officeEndTime = querySnapshot.docs[0].data().defaultEndTime;
        setOfficeEndTime(officeEndTime);
      }
    };

    fetchEmployeeData();

    return () => {
      isMounted = false;
      Logger.debug("Cleanup: fetchEmployeeData effect unmounted");
    };
  }, [user]);

  useEffect(() => {
    if (startDate && endDate) {
      const isSameDay = startDate.toDateString() === endDate.toDateString();
      setAddTime(isSameDay);
      if (isSameDay) {
        setStartTime(officeStartTime);
        setEndTime(officeEndTime);
      }
      Logger.debug("Date comparison", {
        startDate: startDate.toDateString(),
        endDate: endDate.toDateString(),
        isSameDay,
      });
    }
  }, [startDate, endDate]);

  const calculateLeavesTakenThisMonth = (requests) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    return requests.reduce((total, request) => {
      if (request.status !== "Approved") return total;
      
      const requestMonth = new Date(request.startDate).getMonth();
      const requestYear = new Date(request.startDate).getFullYear();

      if (requestMonth === currentMonth && requestYear === currentYear) {
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }
      return total;
    }, 0);
  };

  const calculateCarriedForwardLeaves = (requests) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const lastMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthYear = lastMonth.getFullYear();
    const lastMonthMonth = lastMonth.getMonth();

    const lastMonthLeaves = requests.filter((request) => {
      const requestDate = new Date(request.startDate);
      return (
        requestDate.getMonth() === lastMonthMonth &&
        requestDate.getFullYear() === lastMonthYear &&
        request.status === "Approved"
      );
    });

    const lastMonthDaysTaken = lastMonthLeaves.reduce((total, request) => {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return total + days;
    }, 0);

    const unusedLeaves = Math.max(0, leaveQuota - lastMonthDaysTaken);
    return Math.min(unusedLeaves, maximumDaysCarryForward || 0);
  };

  const validateTimeInputs = () => {
    if (!partialLeave) return true;

    const currentDate = new Date();
    const currentTime = format(currentDate, 'HH:mm');
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const currentDateStr = format(currentDate, 'yyyy-MM-dd');

    if (startDateStr === currentDateStr && startTime < currentTime) {
      sonnerToast.error("Invalid Start Time", {
        description: "Start time cannot be before current time for today's date.",
      });
      return false;
    }

    if (startDate.toDateString() === endDate.toDateString() && startTime >= endTime) {
      sonnerToast.error("Invalid Time Range", {
        description: "End time must be after start time for same day leave.",
      });
      return false;
    }

    return true;
  };

  const handleApplyLeaveSubmit = async (e) => {
    e.preventDefault();

    if (!adminTrackingMethod) {
      sonnerToast.error("Leave System Not Configured", {
        description: "Please contact your administrator to configure the leave system.",
      });
      return;
    }

    if (partialLeave && !validateTimeInputs()) {
      return;
    }

    // Required field validation
    if (!startDate || !endDate || !reason.trim() || !leaveType) {
      Logger.warn("Leave application validation failed - missing fields", {
        hasStartDate: !!startDate,
        hasEndDate: !!endDate,
        hasReason: !!reason.trim(),
        hasLeaveType: !!leaveType,
      });
      sonnerToast.error("Missing Information", {
        description: "Please fill all fields: dates, leave type, and reason.",
      });
      return;
    }

    // Date validation
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Normalize to start of day
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    // Check if start date is not before current date
    if (start < currentDate) {
      sonnerToast.error("Invalid Start Date", {
        description: "Start date cannot be before today.",
      });
      return;
    }

    // Check if end date is not before start date
    if (end < start) {
      sonnerToast.error("Invalid Date Range", {
        description: "End date cannot be before start date.",
      });
      return;
    }

    // Calculate days requested
    const daysRequested = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate monthly quota and available leaves
    const monthlyQuota = leaveQuota / 12;

    setMonthlyQuota(monthlyQuota);
    const totalAvailableLeaves = monthlyQuota + (carryForward ? carriedForwardLeaves : 0);

    // Validate leave quota
    if (daysRequested > totalAvailableLeaves) {
      sonnerToast.error("Leave Quota Exceeded", {
        description: `You have ${totalAvailableLeaves.toFixed(1)} days available this month.`,
      });
      return;
    }

    // Validate partial leave hours if applicable
    let adjustedDaysRequested = daysRequested;
    if (partialLeave && start.toDateString() === end.toDateString()) {
      const startTimeDate = new Date(`2000-01-01T${startTime}`);
      const endTimeDate = new Date(`2000-01-01T${endTime}`);
      const hoursRequested = (endTimeDate - startTimeDate) / (1000 * 60 * 60);
      adjustedDaysRequested = hoursRequested / 8; // Assuming 8-hour workday
      if (adjustedDaysRequested > totalAvailableLeaves) {
        sonnerToast.error("Leave Quota Exceeded", {
          description: `Requested hours exceed available leave quota.`,
        });
        return;
      }
    }

    setIsLoading(true);
    PerformanceMonitor.start("submitLeaveRequest");

    try {
      const newRequest = {
        name: employeeData.name,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        reason,
        leaveType,
        startTime,
        endTime,
        status: "Pending",
        partialLeave,
        appliedOn: format(new Date(), "yyyy-MM-dd"),
        employeeuid: employeeData.uid,
        adminuid: employeeData.adminuid,
        daysRequested: adjustedDaysRequested,
        monthlyLeaveCount: leavesTakenThisMonth,
      };

      Logger.debug("Creating leave request document", newRequest);

      const { id, ...newLeaveRequest } = newRequest;
      const newLeaveRequestRef = doc(collection(db, "leaves"));
      await setDoc(newLeaveRequestRef, newLeaveRequest);

      setLeaveRequests((prev) => [{ ...newRequest, id: newLeaveRequestRef.id }, ...prev]);

      sonnerToast.success("Leave Applied Successfully!", {
        description: `Your request for ${adjustedDaysRequested.toFixed(1)} days is pending approval.`,
      });

      setStartDate(undefined);
      setEndDate(undefined);
      setReason("");
      setLeaveType("");
      setIsApplyLeaveDialogOpen(false);

      PerformanceMonitor.end("submitLeaveRequest");
    } catch (error) {
      Logger.error(
        "Error submitting leave request",
        error,
        "handleApplyLeaveSubmit"
      );
      sonnerToast.error("Failed to submit leave request", {
        description: "Please try again later or contact support.",
      });
      PerformanceMonitor.end("submitLeaveRequest");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    Logger.debug("Rendering status badge", { status });

    if (status.trim() === "Approved")
      return (
        <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>
      );
    if (status.trim() === "Rejected")
      return <Badge variant="destructive">Rejected</Badge>;
    return (
      <Badge
        variant="outline"
        className="text-yellow-600 border-yellow-500 bg-yellow-50"
      >
        Pending
      </Badge>
    );
  };


  

  const renderMobileCards = () => {
    Logger.debug("Rendering mobile cards view", {
      requestCount: leaveRequests.length,
    });

    return (
      <div className="space-y-4">
        {leaveRequests.map((req, index) => (
          <Card key={req.id || index} className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-sm">
                    {format(new Date(req.appliedOn), "dd MMM yyyy")}
                  </span>
                </div>
                {getStatusBadge(req.status)}
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {format(new Date(req.startDate), "dd MMM")} -{" "}
                    {format(new Date(req.endDate), "dd MMM yyyy")}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <Badge variant="secondary" className="text-xs">
                    {req.leaveType}
                  </Badge>
                </div>

                <div className="flex items-start space-x-2">
                  <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                  <span className="text-sm text-gray-600 line-clamp-2">
                    {req.reason}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderDesktopTable = () => {
    Logger.debug("Rendering desktop table view", {
      requestCount: leaveRequests.length,
    });

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Applied</TableHead>
              <TableHead className="min-w-[100px]">Start</TableHead>
              <TableHead className="min-w-[100px]">End</TableHead>
              <TableHead className="min-w-[120px]">Type</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaveRequests.map((req, index) => (
              <TableRow key={req.id || index}>
                <TableCell>
                  {format(new Date(req.appliedOn), "dd/MM/yy")}
                </TableCell>
                <TableCell>
                  {format(new Date(req.startDate), "dd/MM/yy")}
                </TableCell>
                <TableCell>
                  {format(new Date(req.endDate), "dd/MM/yy")}
                </TableCell>
                <TableCell>{req.leaveType}</TableCell>
                <TableCell
                  className="max-w-[150px] sm:max-w-[200px] truncate"
                  title={req.reason}
                >
                  {req.reason}
                </TableCell>
                <TableCell>{getStatusBadge(req.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  Logger.debug("LeaveTab render", {
    leaveRequestCount: leaveRequests.length,
    isMobile,
    isLoading,
    hasEmployeeData: !!employeeData,
  });

  return (
    <div className="space-y-6">
      <div className="text-right">
        <Button
          onClick={() => {
            Logger.info("Apply for Leave dialog opened");
            setIsApplyLeaveDialogOpen(true);
          }}
        >
          <PenLine className="mr-2 h-4 w-4" /> Apply for Leave
        </Button>
      </div>

      <Dialog
        open={isApplyLeaveDialogOpen}
        onOpenChange={(open) => {
          Logger.info(`Apply for Leave dialog ${open ? "opened" : "closed"}`);
          setIsApplyLeaveDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>
              Fill in the details for your leave request.
            </DialogDescription>
            {leavesTakenThisMonth >= monthlyQuota && (
              <p className="text-sm text-red-500">
                You have already taken {leavesTakenThisMonth} days of leave this
                month.
              </p>
            )}
            {carryForward && carriedForwardLeaves > 0 && (
              <p className="text-sm text-green-500">
                You have {carriedForwardLeaves} days carried forward from last
                month.
              </p>
            )}
          </DialogHeader>
          <form onSubmit={handleApplyLeaveSubmit} className="space-y-4 py-2">
            {addTime && (
              <div className="flex items-center space-x-2 justify-end">
                <Label htmlFor="partialLeave">Partial Leave</Label>
                <Switch
                  id="partialLeave"
                  checked={partialLeave}
                  onCheckedChange={() => {
                    setPartialLeave(!partialLeave);
                    Logger.debug("Partial leave selected", {
                      partialLeave: !partialLeave,
                    });
                  }}
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="leaveStartDate">
                  Start Date (Leave Duration)
                </Label>
                <DatePicker
                  date={startDate}
                  onChange={(date) => {
                    setStartDate(date);
                    Logger.debug("Start date selected", { date });
                  }}
                  setDate={(date) => {
                    setStartDate(date);
                    Logger.debug("Start date selected", { date });
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="leaveEndDate">End Date (Leave Duration)</Label>
                <DatePicker
                  date={endDate}
                  onChange={(date) => {
                    setEndDate(date);
                    Logger.debug("End date selected", { date });
                  }}
                  setDate={(date) => {
                    setEndDate(date);
                    Logger.debug("End date selected", { date });
                  }}
                  className="w-full"
                />
              </div>
            </div>

            {addTime && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="leaveStartTime">Start Time</Label>
                    <Input
                      id="leaveStartTime"
                      name="leaveStartTime"
                      type="time"
                      value={
                        startTime
                          ? startTime
                          : new Date().toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                      }
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        Logger.debug("Start time selected", {
                          time: e.target.value,
                        });
                      }}
                      className="w-full"
                      disabled={!partialLeave}
                    />
                  </div>
                  <div>
                    <Label htmlFor="leaveEndTime">End Time</Label>
                    <Input
                      id="leaveEndTime"
                      name="leaveEndTime"
                      type="time"
                      value={
                        endTime
                          ? endTime
                          : new Date().toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                      }
                      onChange={(e) => {
                        setEndTime(e.target.value);
                        Logger.debug("End time selected", {
                          time: e.target.value,
                        });
                      }}
                      className="w-full"
                      disabled={!partialLeave}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="leaveType">Leave Type</Label>
              <Select
                value={leaveType}
                onValueChange={(value) => {
                  setLeaveType(value);
                  Logger.debug("Leave type selected", { leaveType: value });
                }}
              >
                <SelectTrigger id="leaveType">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sick">Sick Leave</SelectItem>
                  <SelectItem value="Casual">Casual Leave</SelectItem>
                  <SelectItem value="Vacation">
                    Vacation / Earned Leave
                  </SelectItem>
                  <SelectItem value="Unpaid">Unpaid Leave</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="leaveReason">Reason</Label>
              <Textarea
                id="leaveReason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  Logger.debug("Reason updated", {
                    reasonLength: e.target.value.length,
                  });
                }}
                placeholder="Briefly state the reason for your leave"
                required
              />
            </div>
            <DialogFooter className="sm:justify-start pt-2">
              <Button
                type="submit"
                disabled={isLoading || leavesTakenThisMonth >= monthlyQuota}
                className={`w-full sm:w-auto${
                  notClicked ? ` cursor-not-allowed` : ``
                }`}
              >
                {isLoading ? (
                  <PageLoader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Submit Request"
                )}
              </Button>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto mt-2 sm:mt-0"
                  onClick={() => Logger.info("Leave application cancelled")}
                >
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>My Leave History</CardTitle>
          <CardDescription>
            Track your past and pending leave applications.
            {isMobile && " (Showing card view for mobile)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaveRequests.length === 0 ? (
            <p className="text-muted-foreground">
              You have not applied for any leave yet.
            </p>
          ) : (
            <>{isMobile ? renderMobileCards() : renderDesktopTable()}</>
          )}
        </CardContent>
      </Card>
    </div>
  );
}