// --- Super Admin Dashboard Page (app/superadmin/(panel)/page.jsx) ---
"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, UserCheck, UserX, Clock, BarChart, PieChart, LineChart as LineChartIcon } from 'lucide-react';
import { auth } from "@/app/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect , useState } from "react";
import { toast } from 'sonner'; 
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/app/firebase/config";


// Placeholder for actual chart components
// You would use a library like Recharts, Chart.js, or Nivo
const PlaceholderChart = ({ title }) => (
  <div className="w-full h-64 border rounded-lg flex items-center justify-center bg-slate-50">
    <p className="text-slate-500">{title} - Chart Placeholder</p>
  </div>
);

// Placeholder for stats components
const DashboardStats = () => {
  // Mock data - fetch this from your backend/Firebase
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminCount, setAdminCount] = useState(0);
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [activeEmployeesCount, setActiveEmployeesCount] = useState(0);
  const [stats, setStats] = useState([
    { title: "Total Admins", value: adminCount, icon: Users, color: "text-blue-500" },
    { title: "Total Active Employees", value: activeEmployeesCount, icon: UserCheck, color: "text-green-500" },
    
  ]);



  useEffect(()=>{
    const fetchAdminUsers = async () => {
      const adminUsersRef = collection(db, "users");
      const q = query(adminUsersRef, where("email", "==", user.email));
      const querySnapshot = await getDocs(q);
      const adminUsers = querySnapshot.docs.map((doc) => doc.data());
      setAdminUsers(adminUsers);

      adminUsers.forEach(user => {
        const totalAdmins = adminUsers.length;
        const totalActiveEmployees = adminUsers.filter(user => user.status === "active").length;
         setAdminCount(totalAdmins);
      });
    };
    fetchAdminUsers();

    const fetchActiveEmployees = async () => {
      const activeEmployeesRef = collection(db, "users");
      const q = query(activeEmployeesRef, where("status", "==", "active"));
      const querySnapshot = await getDocs(q);
      const activeEmployees = querySnapshot.docs.map((doc) => doc.data());
      setActiveEmployees(activeEmployees);

      activeEmployees.forEach(user => {
        const totalActiveEmployees = activeEmployees.length;
        setActiveEmployeesCount(totalActiveEmployees);
      });
    };
    fetchActiveEmployees();
  },[])


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const AttendanceCharts = () => {
  return (
    <div className="grid gap-6 mt-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="xl:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center"><LineChartIcon className="mr-2 h-5 w-5 text-purple-500"/>Attendance Trends</CardTitle>
          <CardDescription>Daily/Weekly/Monthly employee attendance.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlaceholderChart title="Line Chart: Attendance Over Time" />
        </CardContent>
      </Card>
      <Card className="xl:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5 text-orange-500"/>Department Stats</CardTitle>
          <CardDescription>Attendance comparison across departments.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlaceholderChart title="Bar Chart: Department Attendance" />
        </CardContent>
      </Card>
      <Card className="xl:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center"><PieChart className="mr-2 h-5 w-5 text-teal-500"/>Attendance Distribution</CardTitle>
          <CardDescription>Present, late, and absent percentages.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlaceholderChart title="Pie Chart: Attendance Distribution" />
        </CardContent>
      </Card>
    </div>
  );
};


export default function SuperAdminDashboardPage() {


  const router = useRouter();


  useEffect(()=>{
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        return router.push("/superadmin/auth");
      }
      console.log(user)
    });
    return () => unsubscribe();
  },[])

  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of the attendance system.</p>
      </div>
      <DashboardStats />
      <AttendanceCharts />
      {/* TODO: Add dedicated alert screens summary or links here if applicable */}
    </div>
  );
}