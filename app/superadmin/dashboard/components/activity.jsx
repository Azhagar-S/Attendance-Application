
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; // Optional


// Helper function to format dates (could be more sophisticated with a library like date-fns)
const formatTimestamp = (isoString) => {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

// Sample Data - In a real application, this would come from props (fetched from an API)
const sampleSummaryData = {
  lastAdminLoginTimestamp: "2025-05-31T09:15:00Z", // Using current date for relevance
  activeAdminCount: 5,
};

const sampleActivityLogs = [
  {
    id: "log001",
    adminName: "Dr. Evelyn Reed",
    adminEmail: "e.reed@example.com",
    action: "Approved attendance method change request REQ001.",
    timestamp: "2025-05-31T10:30:15Z",
    ipAddress: "103.22.201.15 (Chennai, IN)", // Example IP with geo context
  },
  {
    id: "log002",
    adminName: "Marcus Stone",
    adminEmail: "m.stone@example.com",
    action: "Updated system setting: 'Session Timeout' to 30 minutes.",
    timestamp: "2025-05-31T08:45:50Z",
    ipAddress: "192.168.1.102 (Internal)",
  },
  {
    id: "log003",
    adminName: "Lena Hansen",
    adminEmail: "l.hansen@example.com",
    action: "Generated 'Monthly User Activity' report.",
    timestamp: "2025-05-30T17:20:00Z",
    ipAddress: "203.0.113.45 (Remote)",
  },
  {
    id: "log004",
    adminName: "Dr. Evelyn Reed",
    adminEmail: "e.reed@example.com",
    action: "Logged in.",
    timestamp: "2025-05-31T09:15:00Z", // Matches lastAdminLoginTimestamp for consistency
    ipAddress: "103.22.201.15 (Chennai, IN)",
  },
  {
    id: "log005",
    adminName: "System", // System generated logs
    adminEmail: "",
    action: "Scheduled backup process completed successfully.",
    timestamp: "2025-05-30T03:00:00Z",
    ipAddress: "N/A",
  },
];

export function ActivityLog({
  summaryData = sampleSummaryData,
  logs = sampleActivityLogs,
  title = "Admin Activity Log",
}) {
  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Recent administrative actions and system events.
        </CardDescription>

        <div className="pt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Last Admin Login:{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {formatTimestamp(summaryData.lastAdminLoginTimestamp)}
            </span>
          </p>
          <p>
            Active Admins:{" "}
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {summaryData.activeAdminCount}
            </span>
          </p>
        </div>
        
      </CardHeader>
      <CardContent>
      
        
        {logs && logs.length > 0 ? (
          <Table>
            <TableCaption>A list of recent admin activities.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[200px] hidden md:table-cell">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {log.adminName}
                    {log.adminEmail && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {log.adminEmail}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                  <TableCell className="hidden md:table-cell">{log.ipAddress || "N/A"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">
            No activity logs found.
          </p>
        )}
      </CardContent>
      {logs && logs.length > 0 && (
        <CardFooter>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Displaying latest {logs.length} activities.
          </p>
        </CardFooter>
      )}
    </Card>
  );
}