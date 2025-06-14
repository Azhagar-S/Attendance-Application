'use client';
import { useEffect, useState } from 'react';
import { toast as sonnerToast } from 'sonner';
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/datepicker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 as PageLoader } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PenLine, Calendar, Clock, FileText, User } from 'lucide-react';
import { db } from "@/app/firebase/config";
import { query, collection, where, getDocs, setDoc, doc, getDoc } from "firebase/firestore";

// Enhanced Logging System
class Logger {
  static LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
  };

  static currentLevel = Logger.LOG_LEVELS.INFO;

  static log(level, message, data = null, context = 'LeaveTab') {
    if (level > Logger.currentLevel) return;

    const timestamp = new Date().toISOString();
    const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    const levelName = levelNames[level];
    
    const logEntry = {
      timestamp,
      level: levelName,
      context,
      message,
      data,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Console logging with styling
    const styles = {
      ERROR: 'color: #ff4444; font-weight: bold;',
      WARN: 'color: #ffaa00; font-weight: bold;',
      INFO: 'color: #4444ff;',
      DEBUG: 'color: #888888;'
    };



    // Store in sessionStorage for debugging
    try {
      const logs = JSON.parse(sessionStorage.getItem('app_logs') || '[]');
      logs.push(logEntry);
      // Keep only last 100 logs
      if (logs.length > 100) logs.shift();
      sessionStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (e) {
      console.warn('Failed to store log in sessionStorage:', e);
    }

    // Send critical errors to external service (placeholder)
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
    // Placeholder for external error reporting service
    // In production, you would send this to services like Sentry, LogRocket, etc.
    console.log('🚨 Critical error reported:', logEntry);
  }

  static getLogs() {
    try {
      return JSON.parse(sessionStorage.getItem('app_logs') || '[]');
    } catch (e) {
      return [];
    }
  }

  static clearLogs() {
    sessionStorage.removeItem('app_logs');
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
      Logger.info(`Performance: ${label} completed in ${duration.toFixed(2)}ms`);
      PerformanceMonitor.timers.delete(label);
      return duration;
    }
    Logger.warn(`Performance timer '${label}' not found`);
    return null;
  }
}

export default function LeaveTab({ user }) {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [isApplyLeaveDialogOpen, setIsApplyLeaveDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().setDate(new Date().getDate() + 1)));
  const [leaveType, setLeaveType] = useState('');
  const [reason, setReason] = useState('');
  const [employeeData, setEmployeeData] = useState('');
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


  console.log("start time" , startTime);
  console.log("end time" , endTime);

  // Check for mobile view
  useEffect(() => {
    Logger.info('LeaveTab component mounted', { userId: user?.phoneNumber });
    
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      Logger.debug('Screen size check', { width: window.innerWidth, isMobile: mobile });
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      Logger.info('LeaveTab component unmounted');
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const fetchEmployeeData = async () => {
      if (!user) {
        Logger.warn('No user provided for employee data fetch');
        return;
      }
      
      PerformanceMonitor.start('fetchEmployeeData');
      Logger.info('Starting employee data fetch', { userId: user.phoneNumber });
      
      try {
        const phone = user.phoneNumber.slice(3);
        const q = query(collection(db, "users"), where("phone", "==", phone));
        const querySnapshot = await getDocs(q);
        
        if (!isMounted) {
          Logger.debug('Component unmounted, skipping employee data update');
          return;
        }
        
        if (querySnapshot.empty) {
          Logger.warn('No employee data found', { phone });
          return;
        }
        
        const employeeData = querySnapshot.docs[0].data();
        setEmployeeData(employeeData);
        
        // Fetch admin's tracking method from users collection
        if (employeeData.adminuid) {
          const adminQuery = query(collection(db, "users"), where("uid", "==", employeeData.adminuid));
          const adminSnapshot = await getDocs(adminQuery);
          
          if (!adminSnapshot.empty) {
            const adminData = adminSnapshot.docs[0].data();
            setAdminTrackingMethod(adminData.trackingMethod || 'monthly');
            Logger.info('Admin tracking method fetched', { 
              adminId: employeeData.adminuid,
              trackingMethod: adminData.trackingMethod 
            });
          }
        }

        // Fetch leave requests
        await fetchLeaveRequests(employeeData.uid);
        
        // Fetch leave quota
        await fetchLeaveQuota(employeeData.adminuid);
        
        Logger.info("Employee data fetched successfully", { 
          employeeId: employeeData.uid,
          adminId: employeeData.adminuid
        });
        
        PerformanceMonitor.end('fetchEmployeeData');
      } catch (error) {
        Logger.error("Error fetching employee data", error, 'fetchEmployeeData');
        sonnerToast.error("Failed to load employee data", { 
          description: "Please refresh the page or contact support." 
        });
        PerformanceMonitor.end('fetchEmployeeData');
      }
    };
  
    const fetchLeaveRequests = async (employeeUid) => {
      if (!employeeUid) {
        Logger.warn('No employee UID provided for leave requests fetch');
        return;
      }
      
      PerformanceMonitor.start('fetchLeaveRequests');
      Logger.info('Starting leave requests fetch', { employeeUid });
      
      try {
        const leavesQuery = query(
          collection(db, "leaves"),
          where("employeeuid", "==", employeeUid)
        );
        const querySnapshot = await getDocs(leavesQuery);
        
        if (!isMounted) {
          Logger.debug('Component unmounted, skipping leave requests update');
          return;
        }
        
        let count = 0;
        const requests = [];
        querySnapshot.forEach((doc) => {
          

          requests.push({
            id: doc.id,
            ...doc.data()
          });
       
          
        });

        // Sort by applied date (newest first)
        requests.sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn));
        
        setLeaveRequests(requests);

        console.log("requests" , requests);
        // Calculate leaves taken this month
        setLeavesTakenThisMonth(calculateLeavesTakenThisMonth(requests));
       

        // Calculate carried forward leaves
        setCarriedForwardLeaves(calculateCarriedForwardLeaves(requests));
        
        Logger.info("Leave requests fetched successfully", { 
          count: requests.length,
          requests: requests.map(r => ({ id: r.id, status: r.status, appliedOn: r.appliedOn }))
        });
        
        PerformanceMonitor.end('fetchLeaveRequests');
      } catch (error) {
        Logger.error("Error fetching leave requests", error, 'fetchLeaveRequests');
        sonnerToast.error("Failed to load leave history", { 
          description: "Please refresh the page or contact support." 
        });
        PerformanceMonitor.end('fetchLeaveRequests');
      }
    };

    const fetchLeaveQuota = async (adminuid) => {
      console.log("adminuid", adminuid);
      try {
        const leaveQuotaRef = query(collection(db, "Daily_attendance"), where("adminUid", "==", adminuid));
        const querySnapshot = await getDocs(leaveQuotaRef);
        
        if (querySnapshot.empty) {
          console.log("No leave quota data found for adminuid:", adminuid);
          return;
        }

        const leaveQuotaData = querySnapshot.docs[0].data();
        console.log("Leave quota data:", leaveQuotaData);
        
        if (leaveQuotaData) {
          setLeaveQuota(leaveQuotaData.leaveQuota || 0);
          setCarryForward(leaveQuotaData.carryForward || false);
          setMaximumDaysCarryForward(leaveQuotaData.maximumDaysCarryForward || 0);
        }
      } catch (error) {
        console.error("Error fetching leave quota:", error);
        sonnerToast.error("Failed to load leave quota", {
          description: "Please refresh the page or contact support."
        });
      }
    }
  
    fetchEmployeeData();
    
  
    return () => {
      isMounted = false;
      Logger.debug('Cleanup: fetchEmployeeData effect unmounted');
    };
  }, [user]);

  // Add useEffect to check for same date
  useEffect(() => {
    if (startDate && endDate) {
      const isSameDay = startDate.toDateString() === endDate.toDateString();
      setAddTime(isSameDay);
      Logger.debug('Date comparison', { 
        startDate: startDate.toDateString(), 
        endDate: endDate.toDateString(),
        isSameDay 
      });
    }
  }, [startDate, endDate]);

console.log("leave quota" , leaveQuota);




  // Add function to calculate leaves taken in current month
  const calculateLeavesTakenThisMonth = (requests) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    return requests.reduce((total, request) => {

      console.log("total value" , total);
      const requestDate = new Date(request.startDate);
   
      if (requestDate.getMonth() === currentMonth && 
          requestDate.getFullYear() === currentYear && 
          (request.status === 'Approved' || request.status === 'Pending')) {
        // Calculate number of days between start and end date
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
   

        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) ;
        return total + days ;
      }
      return total;
    }, 0);
  };

  // Add function to calculate carried forward leaves
  const calculateCarriedForwardLeaves = (requests) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Get last month's date
    const lastMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthYear = lastMonth.getFullYear();
    const lastMonthMonth = lastMonth.getMonth();

    // Calculate unused leaves from last month
    const lastMonthLeaves = requests.filter(request => {
      const requestDate = new Date(request.startDate);
      return requestDate.getMonth() === lastMonthMonth && 
             requestDate.getFullYear() === lastMonthYear && 
             request.status === 'Approved';
    });

    const lastMonthDaysTaken = lastMonthLeaves.reduce((total, request) => {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return total + days;
    }, 0);

    // Calculate unused leaves
    const unusedLeaves = Math.max(0, leaveQuota - lastMonthDaysTaken);
    
    // Apply maximum carry forward limit
    return Math.min(unusedLeaves, maximumDaysCarryForward || 0);
  };

  console.log("leavesTakenThisMonth" , leavesTakenThisMonth);

  const handleApplyLeaveSubmit = async(e) => {
    e.preventDefault();

    // Check if admin tracking method is enabled
    if (!adminTrackingMethod) {
      sonnerToast.error("Leave System Not Configured", {
        description: "Please contact your administrator to configure the leave system."
      });
      return;
    }

    // Calculate number of days requested
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysRequested = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Check if employee has any available leaves
    const totalAvailableLeaves = leaveQuota + (carryForward ? carriedForwardLeaves : 0);
    
    if (totalAvailableLeaves <= 0) {
      sonnerToast.error("No Leaves Available", {
        description: "You don't have any leaves available for this month."
      });
      return;
    }

    // Check if the requested dates are in the current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const startMonth = start.getMonth();
    const startYear = start.getFullYear();
    const endMonth = end.getMonth();
    const endYear = end.getFullYear();

    if (startMonth !== currentMonth || startYear !== currentYear || 
        endMonth !== currentMonth || endYear !== currentYear) {
      sonnerToast.error("Invalid Date Range", {
        description: "Leave can only be applied for the current month."
      });
      return;
    }

    // Check monthly leave count based on admin tracking method
    if (adminTrackingMethod === 'monthly' && leavesTakenThisMonth >= 1) {
      sonnerToast.error("Monthly Leave Limit Reached", {
        description: "You have already taken your monthly leave. Please contact your manager for additional leaves."
      });
      return;
    }

    // Check if the requested days exceed the monthly quota
    if (daysRequested > leaveQuota) {
      sonnerToast.error("Leave Quota Exceeded", {
        description: `You can only take ${leaveQuota} days of leave per month.`
      });
      return;
    }

    // Check if the requested days exceed the carry forward limit
    if (carryForward && daysRequested > maximumDaysCarryForward) {
      sonnerToast.error("Carry Forward Limit Exceeded", {
        description: `You can only carry forward up to ${maximumDaysCarryForward} days.`
      });
      return;
    }

    // Rest of your existing validation
    if (!startDate || !endDate || !reason.trim() || !leaveType) {
      Logger.warn("Leave application validation failed - missing fields", {
        hasStartDate: !!startDate,
        hasEndDate: !!endDate,
        hasReason: !!reason.trim(),
        hasLeaveType: !!leaveType
      });
      sonnerToast.error("Missing Information", { 
        description: "Please fill all fields: dates, leave type, and reason." 
      });
      return;
    }

    const currentDateString = new Date().toLocaleDateString().split('T')[0];
    const startDateString = startDate.toLocaleDateString().split('T')[0];
    
    if (startDateString < currentDateString) {
      sonnerToast.error("Invalid Dates", { 
        description: "Start date cannot be before current date." 
      });
      return;
    }

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if(startTime < currentTime || endTime < currentTime){
      sonnerToast.error("Invalid Time", {
        description: "Start time cannot be before current time."
      });
      return;
    }

    if(startTime > endTime){
      sonnerToast.error("Invalid Time", {
        description: "Start time cannot be after end time."
      });
      return;
    }

    setIsLoading(true);
    PerformanceMonitor.start('submitLeaveRequest');
    
    try {
      const newRequest = {
        name: employeeData.name,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        reason,
        leaveType,
        startTime,
        endTime,
        status: 'Pending',
        appliedOn: format(new Date(), "yyyy-MM-dd"),
        employeeuid: employeeData.uid,
        adminuid: employeeData.adminuid,
        daysRequested: daysRequested,
        monthlyLeaveCount: leavesTakenThisMonth 
      };
      
      Logger.debug('Creating leave request document', newRequest);
      
      const {id, ...newLeaveRequest} = newRequest;
      const newLeaveRequestRef = doc(collection(db, "leaves"));
      await setDoc(newLeaveRequestRef, newLeaveRequest);
      
      // Add the new request to local state
      const requestWithId = { ...newRequest, id: newLeaveRequestRef.id };
      setLeaveRequests(prev => [requestWithId, ...prev]);
      
     
      
      sonnerToast.success("Leave Applied Successfully!", { 
        description: `Your request for ${daysRequested} days is pending approval.` 
      });
      
      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setReason('');
      setLeaveType('');
      setIsApplyLeaveDialogOpen(false);
      
      PerformanceMonitor.end('submitLeaveRequest');
    } catch (error) {
      Logger.error("Error submitting leave request", error, 'handleApplyLeaveSubmit');
      sonnerToast.error("Failed to submit leave request", { 
        description: "Please try again later or contact support." 
      });
      PerformanceMonitor.end('submitLeaveRequest');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getStatusBadge = (status) => {
    Logger.debug('Rendering status badge', { status });
    
    if (status.trim() === 'Approved') return <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>;
    if (status.trim() === 'Rejected') return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="outline" className="text-yellow-600 border-yellow-500 bg-yellow-50">Pending</Badge>;
  };

  const renderMobileCards = () => {
    Logger.debug('Rendering mobile cards view', { requestCount: leaveRequests.length });
    
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
                    {format(new Date(req.startDate), "dd MMM")} - {format(new Date(req.endDate), "dd MMM yyyy")}
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
    Logger.debug('Rendering desktop table view', { requestCount: leaveRequests.length });
    
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
                <TableCell>{format(new Date(req.appliedOn), "dd/MM/yy")}</TableCell>
                <TableCell>{format(new Date(req.startDate), "dd/MM/yy")}</TableCell>
                <TableCell>{format(new Date(req.endDate), "dd/MM/yy")}</TableCell>
                <TableCell>{req.leaveType}</TableCell>
                <TableCell className="max-w-[150px] sm:max-w-[200px] truncate" title={req.reason}>
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

  Logger.debug('LeaveTab render', { 
    leaveRequestCount: leaveRequests.length, 
    isMobile, 
    isLoading,
    hasEmployeeData: !!employeeData
  });

  return (
    <div className="space-y-6">
      <div className="text-right">
        <Button 
          onClick={() => {
            Logger.info('Apply for Leave dialog opened');
            setIsApplyLeaveDialogOpen(true);
          }}
        >
          <PenLine className="mr-2 h-4 w-4" /> Apply for Leave
        </Button>
      </div>

      {/* Apply Leave Dialog */}
      <Dialog 
        open={isApplyLeaveDialogOpen} 
        onOpenChange={(open) => {
          Logger.info(`Apply for Leave dialog ${open ? 'opened' : 'closed'}`);
          setIsApplyLeaveDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>Fill in the details for your leave request.</DialogDescription>
            {leavesTakenThisMonth >= 1 && (
              <p className="text-sm text-red-500">You have already taken {leavesTakenThisMonth} days of leave this month.</p>
            )}
            {carryForward && carriedForwardLeaves > 0 && (
              <p className="text-sm text-green-500">You have {carriedForwardLeaves} days carried forward from last month.</p>
            )}
          </DialogHeader>
          <form onSubmit={handleApplyLeaveSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="leaveStartDate">Start Date (Leave Duration)</Label>
                <DatePicker 
                  date={startDate} 
                  onChange={(date) => {
                    setStartDate(date);
                    Logger.debug('Start date selected', { date });
                  }}
                  setDate={(date) => {
                    setStartDate(date);
                    Logger.debug('Start date selected', { date });
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
                    Logger.debug('End date selected', { date });
                  }}
                  setDate={(date) => {
                    setEndDate(date);
                    Logger.debug('End date selected', { date });
                  }} 
                  className="w-full" 
                />
              </div>
            </div>

            {addTime && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="leaveStartTime">Start Time</Label>
                  <Input
                    id="leaveStartTime"
                    name="leaveStartTime"
                    type="time"
                    value={startTime?startTime:new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      Logger.debug('Start time selected', { time: e.target.value });
                    }}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="leaveEndTime">End Time</Label>
                  <Input
                    id="leaveEndTime"
                    name="leaveEndTime"
                    type="time"
                    value={endTime?endTime:new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      Logger.debug('End time selected', { time: e.target.value });
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="leaveType">Leave Type</Label>
              <Select 
                value={leaveType} 
                onValueChange={(value) => {
                  setLeaveType(value);
                  Logger.debug('Leave type selected', { leaveType: value });
                }}
              >
                <SelectTrigger id="leaveType">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sick">Sick Leave</SelectItem>
                  <SelectItem value="Casual">Casual Leave</SelectItem>
                  <SelectItem value="Vacation">Vacation / Earned Leave</SelectItem>
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
                  Logger.debug('Reason updated', { reasonLength: e.target.value.length });
                }} 
                placeholder="Briefly state the reason for your leave" 
                required 
              />
            </div>
            <DialogFooter className="sm:justify-start pt-2">

              <Button type="submit" disabled={isLoading} 
              
              className={`w-full sm:w-auto${notClicked ? ` cursor-not-allowed`: ``}`}>
                {isLoading ? <PageLoader className="mr-2 h-4 w-4 animate-spin" /> : "Submit Request"}
              </Button>
              <DialogClose asChild>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full sm:w-auto mt-2 sm:mt-0"
                  onClick={() => Logger.info('Leave application cancelled')}
                >
                  Cancel
                </Button>


                
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* <Card>
        <CardHeader>
          <CardTitle>Leave Quota Information</CardTitle>
          <CardDescription>
            Your leave allocation and usage details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">Tracking Method</h3>
                <p className="text-sm text-gray-500">How your leaves are tracked</p>
              </div>
              <div className="text-lg font-semibold text-blue-600 capitalize">
                {adminTrackingMethod || 'Not Configured'}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">Monthly Leave Quota</h3>
                <p className="text-sm text-gray-500">Total leaves allowed per month</p>
              </div>
              <div className="text-2xl font-bold text-blue-600">{leaveQuota}</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">Leaves Taken This Month</h3>
                <p className="text-sm text-gray-500">Your current month's leave usage</p>
              </div>
              <div className="text-2xl font-bold text-red-600">{leavesTakenThisMonth}</div>
            </div>

            {carryForward && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium">Carried Forward Leaves</h3>
                  <p className="text-sm text-gray-500">Unused leaves from previous month</p>
                </div>
                <div className="text-2xl font-bold text-green-600">{carriedForwardLeaves}</div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">Available Leaves</h3>
                <p className="text-sm text-gray-500">Total leaves you can take</p>
              </div>
              <div className="text-2xl font-bold text-indigo-600">
                {leaveQuota - leavesTakenThisMonth + (carryForward ? carriedForwardLeaves : 0)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card> */}

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
            <p className="text-muted-foreground">You have not applied for any leave yet.</p>
          ) : (
            <>
              {isMobile ? renderMobileCards() : renderDesktopTable()}
            </>
          )}
        </CardContent>
      </Card>

    </div>
  );
};