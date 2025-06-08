"use client";
import { useState, useEffect } from "react";

// UI Components from shadcn
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { collection, query, where, getDocs, doc } from "firebase/firestore";
import { auth, db } from "@/app/firebase/config";

import { DatePickerWithRange } from "@/components/ui/datepicker-with-range"; // Assuming you create/add this

// Icons from Lucide React
import {
  Search,
  CalendarIcon,
  UserCheck,
  UserX,
  Clock,
  LayoutGrid,
  Users2,
  LogOut,
  Menu,
  Building,
  CheckCircle,
  XCircle,
  Users,
  Clock3,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

// Utilities
import { addDays, format } from "date-fns";
import { cn } from "@/lib/utils";
import { onAuthStateChanged } from "firebase/auth";
import { setDoc } from "firebase/firestore";

// Mock Data - Replace with Firebase data
const mockAttendanceData = [
  {
    id: "emp001",
    name: "John Doe",
    date: "2025-05-30",
    checkInTime: "09:05 AM",
    status: "Present",
    department: "Engineering",
    location: "Office Geo",
  },
  {
    id: "emp002",
    name: "Jane Smith",
    date: "2025-05-30",
    checkInTime: "09:35 AM",
    status: "Late",
    department: "Sales",
    location: "Remote Geo",
  },
  {
    id: "emp003",
    name: "Mike Johnson",
    date: "2025-05-30",
    checkInTime: null,
    status: "Absent",
    department: "Marketing",
    location: null,
  },
  {
    id: "emp001",
    name: "John Doe",
    date: "2025-05-29",
    checkInTime: "08:58 AM",
    status: "Present",
    department: "Engineering",
    location: "Office Geo",
  },
  {
    id: "emp004",
    name: "Lisa Ray",
    date: "2025-05-30",
    checkInTime: "10:00 AM",
    status: "Present",
    department: "Engineering",
    location: "Office Geo",
  },
  {
    id: "emp005",
    name: "David Lee",
    date: "2025-05-29",
    checkInTime: null,
    status: "Absent",
    department: "Sales",
    location: null,
  },
];

// You'll need to create this component or adapt an existing Shadcn date range picker
// For now, a simplified version or single date picker can be used.
// Example: components/ui/datepicker-with-range.jsx
// This is a conceptual placeholder. Shadcn has examples for this.
function DatePickerWithRangeClient({ className, date, setDate }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full md:w-[280px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 max-w-[calc(100vw-2rem)] md:max-w-none"
          align="start"
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={window?.innerWidth < 768 ? 1 : 2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [dumAttendance, setDumAttendance] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState(dumAttendance);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'present', 'late', 'absent'
  const [scheduleMeetings, setScheduleMeetings] = useState(false);

  const [dateRange, setDateRange] = useState({
    // Default to today
    from: new Date(),
    to: new Date(),
  });
  const [totalEmployees, setTotalEmployees] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const phoneNumber = user.phoneNumber.slice(3);
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("phone", "==", phoneNumber));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error("User not found in database");
        }
        // tracing method
        const tracing_method = querySnapshot.docs[0].data();
        if (tracing_method.tracingMethod == "Schedule Meetings") {
          setScheduleMeetings(true);
        }

        // Get the user document reference
        const userDoc = querySnapshot.docs[0];
        const admin_uid = userDoc.id;
        const userRef = doc(db, "users", userDoc.data().uid);
        const tmp = query(usersRef, where("createdBy", "==", userRef));
        const userData = userDoc.data();
        const querySnapshot2 = await getDocs(tmp);
      }
    });
    return () => unsubscribe();
  }, []);

  // Effect for filtering
  useEffect(() => {
    let records = dumAttendance;
    console.log("records status", records);
    // Filter by date range
    if (dateRange?.from) {
      records = records.filter((record) => {
        const recordDate = new Date(record.date);
        // Normalize dates to avoid time zone issues if only comparing date part
        recordDate.setHours(0, 0, 0, 0);
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = dateRange.to ? new Date(dateRange.to) : fromDate;
        toDate.setHours(0, 0, 0, 0);

        return recordDate >= fromDate && recordDate <= toDate;
      });
    }

    // Filter by status
    if (statusFilter !== "all") {
      records = records.filter(
        (record) => record.status.toLowerCase() === statusFilter
      );
    }

    // Filter by search term (name only)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      records = records.filter(
        (record) =>
          record.name && record.name.toLowerCase().includes(searchLower)
      );
    }
    setFilteredRecords(records);
  }, [searchTerm, statusFilter, dateRange, dumAttendance]); // Re-run when these dependencies change

  const getStatusBadgeVariant = (status) => {
    switch (status.toLowerCase()) {
      case "present":
        return "success"; // You might need to define this variant in Badge
      case "late":
        return "warning"; // or use default with custom classes
      case "absent":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Dummy data for testing
  const todayAttendance = [
    {
      id: 1,
      name: "John Doe",
      status: "present",
      checkIn: "09:00 AM",
      checkOut: "06:00 PM",
    },
    {
      id: 2,
      name: "Jane Smith",
      status: "late",
      checkIn: "09:45 AM",
      checkOut: "06:30 PM",
    },
    {
      id: 3,
      name: "Bob Johnson",
      status: "absent",
      checkIn: "-",
      checkOut: "-",
    },
    {
      id: 4,
      name: "Alice Brown",
      status: "present",
      checkIn: "08:55 AM",
      checkOut: "05:45 PM",
    },
    {
      id: 5,
      name: "Charlie Davis",
      status: "on_leave",
      checkIn: "-",
      checkOut: "-",
    },
  ];

  const [present_count, setPresentCount] = useState(0);
  const [late_count, setLateCount] = useState(0);
  const [absent_count, setAbsentCount] = useState(0);
  const [onleave_count, setOnLeaveCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const fetchAttendance = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const phone = user.phoneNumber.slice(3);
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("phone", "==", phone));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const adminData = querySnapshot.docs[0].data();
            const adminUid = adminData.uid;
            console.log("adminUid", adminUid);

            //Recent Activity
            const recentActvity = query(
              collection(db, "attendance"),
              where("adminuid", "==", adminUid)
            );
            const querySnapshot3 = await getDocs(recentActvity);
            querySnapshot3.forEach((doc) => {
              const data = doc.data();
              const recentActivityData = {
                id: doc.id,
                ...data,
              };
              setRecentActivity((prev) => [...prev, recentActivityData]);
            });

            // Count employees under this admin
            const employeesQuery = query(
              collection(db, "users"),
              where("role", "==", "employee"),
              where("adminuid", "==", adminUid)
            );

            const querySnapshot2 = await getDocs(employeesQuery);
            console.log("querySnapshot", querySnapshot2.size);
            setTotalEmployees(querySnapshot2.size);
          }

          if (!querySnapshot.empty) {
            const queryData = querySnapshot.docs[0];
            const userDoc = queryData.data();

            const query_attendance = query(
              collection(db, "attendance"),
              where("adminUid", "==", userDoc.uid)
            );

            const attendanceSnapshot = await getDocs(query_attendance);
            const attendanceData = [];

            attendanceSnapshot.forEach((doc) => {
              const data = doc.data();

              attendanceData.push({
                name: data.name,
                status: data.status,
                checkIn: data.checkInTime,
                checkOut: data.checkOutTime || "-",
                address: data.address,
                date: data.date,
              });
              console.log("status", doc.data().status);
            });

            setDumAttendance(attendanceData);

            // Initialize counters
            let present = 0;
            let late = 0;
            let absent = 0;
            let onLeave = 0;

            const today = format(new Date(), "yyyy-MM-dd");

            // Count statuses for today
            attendanceData.forEach((record) => {
              if (record.date === today) {
                const status = Array.isArray(record.status)
                  ? record.status[0]
                  : record.status;
                const statusStr = String(status).toLowerCase();

                if (statusStr.includes("present")) {
                  present++;
                } else if (statusStr.includes("late")) {
                  late++;
                } else if (statusStr.includes("absent")) {
                  absent++;
                } else if (
                  statusStr.includes("leave") ||
                  statusStr.includes("on_leave")
                ) {
                  onLeave++;
                }
              }
            });

            // Update state once with all counts
            setPresentCount(present);
            setLateCount(late);
            setAbsentCount(absent);
            setOnLeaveCount(onLeave);

            console.log(
              "Attendance counts - Present:",
              present,
              "Late:",
              late,
              "Absent:",
              absent,
              "On Leave:",
              onLeave
            );
          }
        } catch (error) {
          console.error("Error fetching attendance data:", error);
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchAttendance();
      }
    });

    return () => unsubscribe();
  }, []);

  const stats = {
    totalEmployees: totalEmployees,
    presentToday: present_count, // These can be updated with real data later
    onLeave: onleave_count,
    lateToday: late_count,
    activeNow: 0,
  };

  const recentActivities = [
    { id: 1, type: "check_in", name: "John Doe", time: "2 minutes ago" },
    { id: 2, type: "check_out", name: "Jane Smith", time: "1 hour ago" },
    { id: 3, type: "leave_approved", name: "Bob Johnson", time: "3 hours ago" },
    { id: 4, type: "check_in", name: "Alice Brown", time: "4 hours ago" },
  ];

  // // Summary Stats
  // const presentCount = filteredRecords.filter(r => r.status === 'Present').length;
  // const lateCount = filteredRecords.filter(r => r.status === 'Late').length;
  // const absentCount = filteredRecords.filter(r => r.status === 'Absent').length;

  return (
    <div className="space-y-6 ">
      {/* <main className="flex-1 p-4 sm:p-6"> */}
      {/* <div className="space-y-6"> */}
      {/* Stats Overview */}
      {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalEmployees}</div>
                  <p className="text-xs text-muted-foreground">Total employees in your organization</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                  <UserCheck className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.presentToday} <span className="text-sm text-muted-foreground">/ {stats.totalEmployees}</span></div>
                    
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">On Leave</CardTitle>
                  <UserX className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.onLeave}</div>
                  
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Late Today</CardTitle>
                  <Clock3 className="h-4 w-4 text-rose-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.lateToday}</div>
                  
                </CardContent>
              </Card>
              
            </div> */}

      {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7"> */}
      {/* Today's Attendance */}
      {/* <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Today's Attendance</CardTitle>
                  <CardDescription>Check-in and check-out status of employees for today.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 font-medium">Employee</div>
                      <div className="w-24 text-center font-medium">Status</div>
                      <div className="w-24 text-center font-medium">Check In</div>
                      {!scheduleMeetings && (
                        <div className="w-24 text-center font-medium">Check Out</div>
                      )}
                    </div>
                    {filteredRecords.map((employee ,index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex-1 font-medium">{employee.name}</div>
                        <div className="w-24 text-center">
                          <Badge 
                            variant={Array.isArray(employee.status) 
                              ? (employee.status[0] === 'present' ? 'default' 
                                : employee.status[0] === 'late' ? 'warning' 
                                : employee.status[0] === 'absent' ? 'destructive' 
                                : 'secondary')
                              : (employee.status === 'present' ? 'default' 
                                : employee.status === 'late' ? 'warning' 
                                : employee.status === 'absent' ? 'destructive' 
                                : 'secondary')}
                            className="capitalize"
                          >
                            {Array.isArray(employee.status) 
                              ? employee.status[0].replace('_', ' ')
                              : employee.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="w-24 text-center text-sm text-muted-foreground">{employee.checkIn}</div>
                        {!scheduleMeetings && (
                          <div className="w-24 text-center text-sm text-muted-foreground">{employee.checkOut}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card> */}

      {/* Recent Activity */}
      {/* <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest activities in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50">
                          {activity.type === 'check_in' && <Clock3 className="h-4 w-4 text-sky-600" />}
                          {activity.type === 'check_out' && <LogOut className="h-4 w-4 text-sky-600" />}
                          {activity.type === 'leave_approved' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {activity.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {activity.type === 'check_in' && 'Checked in'}
                            {activity.type === 'check_out' && 'Checked out'}
                            {activity.type === 'leave_approved' && 'Leave request approved'}
                          </p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card> */}
      {/* </div>   */}
      {/* </div> */}

      {/* </main> */}

      <section className="mx-5 flex flex-col gap-4 mt-5">
        <div>
          <h1 className="text-2xl font-semibold">
            Employee Attendance Overview
          </h1>
          <p className="text-muted-foreground">
            View and filter attendance records.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Employees
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                Total employees in your organization
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Present Today/Range
              </CardTitle>
              <UserCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{present_count}</div>
              <p className="text-xs text-muted-foreground">
                Employees marked present
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Late Today/Range
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{late_count}</div>
              <p className="text-xs text-muted-foreground">
                Employees marked late
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Absent Today/Range
              </CardTitle>
              <UserX className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{absent_count}</div>
              <p className="text-xs text-muted-foreground">
                Employees marked absent
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4 items-stretch md:items-end">
            <div className="flex-1 w-full md:min-w-[200px]">
              <Label htmlFor="search-employee">Search Employee (Name/ID)</Label>
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-employee"
                  type="search"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full"
                />
              </div>
            </div>
            <div className="flex-1 w-full md:min-w-[150px]">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 w-full md:min-w-[280px] space-y-1.5">
              <Label>Select Date</Label>
              <Input
                type="date"
                value={
                  dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : ""
                }
                onChange={(e) => {
                  const selectedDate = e.target.value
                    ? new Date(e.target.value)
                    : new Date();
                  setDateRange({
                    from: selectedDate,
                    to: selectedDate,
                  });
                }}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records ({filteredRecords.length})</CardTitle>
            <CardDescription>
              Showing records for{" "}
              {dateRange?.from
                ? format(dateRange.from, "MMM dd, yyyy")
                : "selected date"}
              {dateRange?.to && dateRange.from !== dateRange.to
                ? ` to ${format(dateRange.to, "MMM dd, yyyy")}`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px] md:w-auto">Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Check-in
                    </TableHead>
                    <TableHead>Status</TableHead>

                    {!scheduleMeetings && (
                    <TableHead className="hidden md:table-cell">
                      Check-out
                    </TableHead>
                    )}

                    
                    <TableHead className="hidden lg:table-cell">
                      Location
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record, index) => (
                      <TableRow
                        key={`${record.name}-${record.date}-${
                          record.checkIn || "no-checkin"
                        }-${index}`}
                      >
                        <TableCell className="font-medium truncate max-w-[100px] sm:max-w-[120px]">
                          {record.name}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {record.date}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {record.checkIn || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(record.status)}
                            className={cn(
                              "text-xs whitespace-nowrap",
                              getStatusBadgeVariant(record.status) ===
                                "success" &&
                                "border-green-500 text-green-700 bg-green-100 dark:border-green-400 dark:text-green-300 dark:bg-green-900/50",
                              getStatusBadgeVariant(record.status) ===
                                "warning" &&
                                "border-yellow-500 text-yellow-700 bg-yellow-100 dark:border-yellow-400 dark:text-yellow-300 dark:bg-yellow-900/50",
                              getStatusBadgeVariant(record.status) ===
                                "destructive" &&
                                "border-red-500 text-red-700 bg-red-100 dark:border-red-400 dark:text-red-300 dark:bg-red-900/50"
                            )}
                          >
                            {record.status}
                          </Badge>
                        </TableCell>

                        {!scheduleMeetings && (
                          <TableCell className="hidden md:table-cell">
                            {record.checkOut}
                          </TableCell>
                        )}

                        
                        <TableCell className="hidden lg:table-cell text-xs">
                          {record.address}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan="7" className="h-24 text-center">
                        No attendance records found for the selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
