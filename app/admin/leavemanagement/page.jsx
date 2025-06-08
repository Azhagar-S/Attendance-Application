"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button"; // Already in layout
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Already used above
import { Badge } from "@/components/ui/badge"; // Already used above
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"; // Already used above
import { toast } from "sonner"; // Using Sonner for toast notifications
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Already used above
import { CheckCircle, XCircle, Hourglass, Filter } from "lucide-react"; // Icons for actions and status
import { format } from "date-fns"; // For date formatting
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { where } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { query, collection, getDocs , doc } from "firebase/firestore";
import { auth } from "@/app/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { updateDoc } from "firebase/firestore";


// Mock Data for Leave Requests - Replace with Firebase data
const mockLeaveRequests = [
  {
    id: "leave001",
    employeeId: "emp001",
    employeeName: "John Doe",
    startDate: "2025-06-10",
    endDate: "2025-06-12",
    reason: "Family event",
    status: "Pending",
    appliedDate: "2025-05-28",
  },
  {
    id: "leave002",
    employeeId: "emp002",
    employeeName: "Jane Smith",
    startDate: "2025-06-15",
    endDate: "2025-06-16",
    reason: "Personal appointment",
    status: "Approved",
    appliedDate: "2025-05-25",
  },
  {
    id: "leave003",
    employeeId: "emp004",
    employeeName: "Lisa Ray",
    startDate: "2025-07-01",
    endDate: "2025-07-05",
    reason: "Vacation",
    status: "Pending",
    appliedDate: "2025-05-30",
  },
  {
    id: "leave004",
    employeeId: "emp001",
    employeeName: "John Doe",
    startDate: "2025-08-01",
    endDate: "2025-08-02",
    reason: "Sick leave",
    status: "Rejected",
    appliedDate: "2025-05-20",
  },
];

export default function LeaveManagementPage() {
  const [user, setUser] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [filteredLeaveRequests, setFilteredLeaveRequests] =
    useState([]);

    
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'pending', 'approved', 'rejected'
  // Using Sonner toast directly



  useEffect(() => {

    const fetchLeaveRequests = async () => {
      try {
        const user = auth.currentUser;
        if(!user){
          return;
        }
        
        const phone = user.phoneNumber.slice(3);
        const q = query(collection(db, "users") ,where("phone","==",phone));
        const querySnapshot = await getDocs(q);
        const userData = querySnapshot.docs[0];
        const adminuid = userData.id;
       

        const q2 = query(collection(db, "leaves") ,where("adminuid","==",adminuid));
        const querySnapshot2 = await getDocs(q2);

        
        if(!querySnapshot2.empty){
          const leaveRequests = querySnapshot2.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        
         console.log("leaveRequests",leaveRequests)
          setLeaveRequests(leaveRequests);
          setFilteredLeaveRequests(leaveRequests);
          console.log("Fetched leave requests:", leaveRequests);
        }
      } catch (error) {
        console.error("Error fetching leave requests:", error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
          fetchLeaveRequests();
      }
  });
  
  return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    let requests = leaveRequests;
    if (statusFilter !== "all") {
      requests = requests.filter(
        (req) => req.status.toLowerCase() === statusFilter
      );
    }
    setFilteredLeaveRequests(requests);
  }, [statusFilter, leaveRequests]);

  const handleUpdateRequestStatus = async(requestId, newStatus , employeeName) => {
    // TODO: Firebase logic to update leave request status in Firestore
    try {
      const docRef = doc(db, "leaves", requestId);
      await updateDoc(docRef, { status: newStatus }); 
      
    } catch (error) {
      console.error("Error updating leave request status:", error);
    }



    setLeaveRequests((prevRequests) =>
      prevRequests.map((req) =>
        req.id === requestId ? { ...req, status: newStatus } : req
      )
    );
    if (newStatus === "approved") {
      toast.success("Leave Request Approved", {
        description: `Request of ${employeeName} has been approved.`,
        position: "top-right",
      });
    } else if (newStatus === "rejected") {
      toast.error("Leave Request Rejected", {
        description: `Request of ${employeeName} has been rejected.`,
        position: "top-right",
      });
    } else {
      toast.info("Leave Status Updated", {
        description: `Request of ${employeeName} status has been updated.`,
        position: "top-right",
      });
    }
  };

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="border-yellow-500 text-yellow-700 bg-yellow-100 text-xs whitespace-nowrap"
          >
            <Hourglass className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="default"
            className="bg-green-500 hover:bg-green-600 text-xs whitespace-nowrap"
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="text-xs whitespace-nowrap">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 mt-10 mx-10">
      <div>
        <h1 className="text-2xl font-semibold">Leave Request Management</h1>
        <p className="text-muted-foreground">
          Review and process employee leave applications.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span>Leave Applications ({filteredLeaveRequests.length})</span>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="leave-status-filter">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden sm:table-cell w-[100px]">
                    Request ID
                  </TableHead>
                  <TableHead className="w-[120px]">Employee</TableHead>
                  <TableHead className="w-[150px]">Dates</TableHead>
                  <TableHead className="hidden md:table-cell">Reason</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeaveRequests.length > 0 ? (
                  filteredLeaveRequests.map((req, index) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-xs hidden sm:table-cell">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div
                          className="font-medium truncate max-w-[120px]"
                          title={req.name}
                        >
                          {req.name}
                        </div>
                        
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs sm:text-sm">
                        {format(new Date(req.startDate), "MMM dd, yyyy")} -{" "}
                        {format(new Date(req.endDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell
                        className="hidden md:table-cell max-w-xs truncate"
                        title={req.reason}
                      >
                        {req.reason}
                      </TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-right">
                        {req.status === "Pending" && (
                          <div className="flex  xs:flex-row gap-1 justify-end w-full">

                            {/* Approve Button */}
                            <Tooltip>
                              <TooltipTrigger onClick={()=>handleUpdateRequestStatus(req.id,"Approved" , req.name)}>
                                
                                  <CheckCircle className="mr-1 h-5 w-5  border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700" />
                            
                              </TooltipTrigger>
                              <TooltipContent className="bg-white text-black">
                                <p>Approve</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Reject Button */}
                            <Tooltip>
                              <TooltipTrigger onClick={()=>handleUpdateRequestStatus(req.id,"Rejected " , req.name)}>
                                
                                  <XCircle className="mr-1 h-5 w-5 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700" />
                              
                              </TooltipTrigger>
                              <TooltipContent className="bg-white text-black">
                                <p>Reject</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                        {req.status !== "Pending" && (
                          <span className="text-xs text-muted-foreground italic pe-2">
                            Processed
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan="6" className="h-24 text-center">
                      No leave requests found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
