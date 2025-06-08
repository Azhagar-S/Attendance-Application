// app/admin/dashboard/page.jsx
import { ActivityLog } from "../components/activity";

// In a real app, you'd fetch this data from your backend
async function getSystemActivity() {
  // Simulating an API call
  const summary = {
    lastAdminLoginTimestamp: new Date().toISOString(), // Dynamic for current viewing
    activeAdminCount: 7, // Example count
  };

  // Using current date and time to make timestamps relevant
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);


  const logs = [
    {
      id: "log_real1",
      adminName: "Priya Sharma",
      adminEmail: "priya.s@example.com",
      action: "Initiated onboarding for 3 new employees.",
      timestamp: now.toISOString(),
      ipAddress: "103.22.201.25 (Chennai, IN)",
    },
    {
      id: "log_real2",
      adminName: "Admin User",
      adminEmail: "admin@example.com",
      action: "Changed password policy to 'High Strength'.",
      timestamp: oneHourAgo.toISOString(),
      ipAddress: "192.168.0.5 (Internal Office)",
    },
    {
      id: "log_real3",
      adminName: "System Monitor",
      adminEmail: "",
      action: "CPU usage exceeded 80% threshold on server 'web-prod-01'.",
      timestamp: twoHoursAgo.toISOString(),
      ipAddress: "N/A",
    },
    {
      id: "log_real4",
      adminName: "Rajesh Kumar",
      adminEmail: "raj.k@example.com",
      action: "Accessed financial reports for Q2 2025.",
      timestamp: yesterday.toISOString(),
      ipAddress: "202.177.134.12 (Mumbai, IN)",
    },
  ];
  return { summary, logs };
}

export default async function AdminDashboardPage() {
  const { summary, logs } = await getSystemActivity();

  return (
    <div className="container mx-auto p-4 md:p-8">
     

      {/* Other dashboard widgets could go here */}

      <div className="mt-8">
        <ActivityLog summaryData={summary} logs={logs} />
      </div>

      {/* Example of an empty state for the log */}
      {/* <div className="mt-8">
        <ActivityLog
          summaryData={{ lastAdminLoginTimestamp: null, activeAdminCount: 0 }}
          logs={[]}
          title="User Activity Log"
        />
      </div> */}
    </div>
  );
}