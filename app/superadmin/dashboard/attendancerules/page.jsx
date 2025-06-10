'use client'
import { RequestAdminsTable } from "../components/request_admins";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/app/firebase/config";
import { collection, getDocs, query } from "firebase/firestore";

// In a real app, you'd fetch this data from your backend
async function getAdminChangeRequests() {
  // Simulating an API call
  return [
    {
      id: "REQ001",
      adminName: "Dr. Evelyn Reed",
      adminEmail: "e.reed@example.com",
      requestDate: "2025-05-28",
      requestedMethod: "Schedule Meeting",
      status: "Pending",
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
      status: "Approved",
    },
     {
      id: "REQ004",
      adminName: "Sam Carter",
      adminEmail: "s.carter@example.com",
      requestDate: "2025-05-31", // Today's date (example)
      requestedMethod: "Daily Attendance",
      status: "Pending",
    },
  ];
}

export default function AttendanceSettingsPage() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const fetchAdminChangeRequests = async () => {
      try {
        const q = query(collection(db, "admin_change_requests"));
        const querySnap = await getDocs(q);
        const requests = querySnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setRequests(requests);
      } catch (error) {
        console.error("Error fetching admin change requests:", error);
        // Optionally, show a toast notification on error
      }
    };
    fetchAdminChangeRequests();
  }, []);

  return (
    <div className="mx-auto p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl">
      <header className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
          Attendance Method Management
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
          Review and process requests from administrators to change attendance tracking methods.
        </p>
      </header>

      <div className="pb-4">
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
            type="search"
            placeholder="Search admins by name, email"
            
            className="pl-8 sm:w-full md:w-1/2 lg:w-1/3"
            />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <RequestAdminsTable requests={requests} />
      </div>

      {/* Optional: Uncomment and style if you want to show the policy overview
      <div className="mt-6 sm:mt-8 p-4 sm:p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-700 dark:text-gray-200">
          Current Attendance Policy Overview
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
          The active attendance method is currently set to <strong className="font-medium">[Current Global Method]</strong>.
          Any approved changes will update this method system-wide.
          Ensure all administrators are notified of changes.
        </p>
      </div>
      */}
    </div>
  );
}