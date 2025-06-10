// components/AttendanceChangeRequestsTable.jsx
"use client"; // For event handlers like button clicks

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Optional: for status
import { Input } from "@/components/ui/input";
import { db } from "@/app/firebase/config";
import { collection, getDocs, query, updateDoc, doc, where } from "firebase/firestore";
import { toast } from "sonner";


// Sample data - in a real application, this would come from props or an API
const sampleRequests = [
  {
    id: "REQ001",
    adminName: "Dr. Evelyn Reed",
    adminEmail: "e.reed@example.com",
    requestDate: "2025-05-28",
    requestedMethod: "Schedule Meeting",
    status: "Pending", // Example status
  },
  {
    id: "REQ002",
    adminName: "Marcus Stone",
    adminEmail: "m.stone@example.com",
    requestDate: "2025-05-30",
    requestedMethod: "Schedule Meeting",
    status: "Pending",
  },
  {
    id: "REQ003",
    adminName: "Lena Hansen",
    adminEmail: "l.hansen@example.com",
    requestDate: "2025-05-25",
    requestedMethod: "Daily Attendance",
    status: "Approved", // Example of a different status
  },
];

export function RequestAdminsTable({ requests }) {
  const handleChangeMethod = async(requestId, requestedMethod) => {
    // This is where you would implement the logic for changing the attendance method.
    // For example, you might:
    // 1. Open a modal for confirmation.
    // 2. Make an API call to your backend to update the attendance method.
    // 3. Update the state locally or refetch data.

    try {
  
      updateDoc(doc(db, "admin_change_requests", requestId), {
        status: "Approved",
      });
      toast.success("Request Approved", {
        description: `The request to change the attendance method has been approved.`,
        position: "top-right",
      });
    } catch (error) {
      console.log(error);
      toast.error("Request Failed", {
        description: error.message || "There was an issue approving the request.",
      });
    }
    console.log(
      `Processing request to change method for ID: ${requestId} to "${requestedMethod}"`
    );
    alert(
      `Action triggered for request ${requestId}: Change to ${requestedMethod}. \nImplement actual logic here.`
    );
    // You might want to update the request's status or remove it from the list after processing.
  };

  if (!requests || requests.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-4">No pending requests to change attendance methods.</p>;
  }

  return (
    <div className="border rounded-lg shadow-sm overflow-x-auto">
      
      <Table className="min-w-[800px] md:min-w-full">
        <TableCaption className="text-sm">List of admin requests for attendance method changes.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px] md:w-[150px] text-xs md:text-sm">Admin Name</TableHead>
            <TableHead className="text-xs md:text-sm">Email</TableHead>
            <TableHead className="text-center text-xs md:text-sm">Request Date</TableHead>
            <TableHead className="text-xs md:text-sm">Requested Method</TableHead>
            <TableHead className="text-center text-xs md:text-sm">Status</TableHead>
            <TableHead className="text-right w-[140px] md:w-[180px] text-xs md:text-sm">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium text-xs md:text-sm py-2">{request.adminName}</TableCell>
              <TableCell className="text-xs md:text-sm py-2">
                <div className="truncate max-w-[120px] md:max-w-none">
                  {request.adminEmail}
                </div>
              </TableCell>
              <TableCell className="text-center text-xs md:text-sm py-2">
                {new Date(request.requestDate).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-xs md:text-sm py-2">{request.requestedMethod}</TableCell>
              <TableCell className="text-center py-2">
                <Badge 
                  variant={request.status === "Pending" ? "destructive" : "default"}
                  className="text-xs md:text-sm"
                >
                  {request.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right py-2">
                {request.status === "Pending" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs md:text-sm whitespace-nowrap"
                    onClick={() => handleChangeMethod(request.id, request.requestedMethod)}
                  >
                    Process Request
                  </Button>
                ) : (
                  <span className="text-xs md:text-sm text-gray-500">Processed</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}