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
import { query, collection, where, getDocs, setDoc, doc } from "firebase/firestore";

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

    console.log(
      `%c[${timestamp}] ${levelName} [${context}]: ${message}`,
      styles[levelName],
      data || ''
    );

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
  const [startDate, setStartDate] = useState(undefined);
  const [endDate, setEndDate] = useState(undefined);
  const [leaveType, setLeaveType] = useState('');
  const [reason, setReason] = useState('');
  const [employeeData, setEmployeeData] = useState('');
  const [isMobile, setIsMobile] = useState(false);

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
      if (!user?.phoneNumber) {
        Logger.warn('No user phone number provided', { user });
        return;
      }
      
      PerformanceMonitor.start('fetchEmployeeData');
      Logger.info('Starting employee data fetch', { phoneNumber: user.phoneNumber });
      
      try {
        // Fetch employee data first
        const phone = user.phoneNumber.slice(3);
        Logger.debug('Processed phone number', { originalPhone: user.phoneNumber, processedPhone: phone });
        
        const usersQuery = query(collection(db, "users"), where("phone", "==", phone));
        const userSnapshot = await getDocs(usersQuery);
        
        if (userSnapshot.empty) {
          Logger.warn("No user data found in database", { phone });
          return;
        }
        
        const userData = userSnapshot.docs[0].data();
        if (!isMounted) {
          Logger.debug('Component unmounted, skipping state update');
          return;
        }
        
        setEmployeeData(userData);
        Logger.info("Employee data fetched successfully", { 
          uid: userData.uid, 
          name: userData.name,
          adminuid: userData.adminuid 
        });
        
        // Then fetch leave requests using the employee UID
        if (userData.uid) {
          await fetchLeaveRequests(userData.uid);
        }
        
        PerformanceMonitor.end('fetchEmployeeData');
      } catch (error) {
        Logger.error("Error in fetchEmployeeData", error, 'fetchEmployeeData');
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
  
    fetchEmployeeData();
  
    return () => {
      isMounted = false;
      Logger.debug('Cleanup: fetchEmployeeData effect unmounted');
    };
  }, [user]);

  const handleApplyLeaveSubmit = async(e) => {
    e.preventDefault();
    
    Logger.info('Leave application submission started', {
      startDate,
      endDate,
      leaveType,
      reasonLength: reason.length,
      employeeUid: employeeData.uid
    });

    // Validation
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

    if (new Date(startDate) > new Date(endDate)) {
      Logger.warn("Leave application validation failed - invalid date range", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      sonnerToast.error("Invalid Dates", { 
        description: "Start date cannot be after end date." 
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
        status: 'Pending',
        appliedOn: format(new Date(), "yyyy-MM-dd"),
        employeeuid: employeeData.uid,
        adminuid: employeeData.adminuid,
      };
      
      Logger.debug('Creating leave request document', newRequest);
      
      const {id, ...newLeaveRequest} = newRequest;
      const newLeaveRequestRef = doc(collection(db, "leaves"));
      await setDoc(newLeaveRequestRef, newLeaveRequest);
      
      // Add the new request to local state
      const requestWithId = { ...newRequest, id: newLeaveRequestRef.id };
      setLeaveRequests(prev => [requestWithId, ...prev]);
      
      Logger.info("Leave request submitted successfully", {
        requestId: newLeaveRequestRef.id,
        leaveType,
        dateRange: `${newRequest.startDate} to ${newRequest.endDate}`
      });
      
      sonnerToast.success("Leave Applied Successfully!", { 
        description: "Your request is pending approval." 
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
          </DialogHeader>
          <form onSubmit={handleApplyLeaveSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="leaveStartDate">Start Date (Leave Duration)</Label>
                <DatePicker 
                  date={startDate} 
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
                  setDate={(date) => {
                    setEndDate(date);
                    Logger.debug('End date selected', { date });
                  }} 
                  className="w-full" 
                />
              </div>
            </div>
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
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
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