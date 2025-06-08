// app/superadmin/settings/profile/page.jsx
import { SuperAdminProfileSettings } from "../components/settings"; 
import { Toaster } from "@/components/ui/sonner"; 



async function getSuperAdminData() {
  // Simulate API call
  return {
    fullName: "Super Jane Doe",
    username: "superjane",
    email: "super.jane@example.com",
    phoneNumber: "+919876543210",
    avatarUrl: "", // Let it use fallback
    theme: "dark",
    language: "en",
    notifications: {
      systemAlertsEmail: true,
      newUserSignupPush: true,
      weeklySummaryEmail: false,
    },
  };
}

export default async function SuperAdminProfilePage() {
  const adminData = await getSuperAdminData(); // Fetch data server-side if possible

  return (
    <div className="container mx-auto p-4 md:p-8">
      <SuperAdminProfileSettings adminData={adminData} />
      <Toaster richColors position="top-right" /> {/* Toaster for notifications */}
    </div>
  );
}