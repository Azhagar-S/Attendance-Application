"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Loader, Settings } from "lucide-react";
import {
  LayoutGrid,
  Users2,
  LogOut,
  Menu,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  Calendar,
  Users,
  Clock3,
  PanelLeftClose,
  PanelLeft,
  Home,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { auth  } from "../firebase/config";
import { onAuthStateChanged , signOut } from "firebase/auth";
import { getDoc, doc, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

export default function AdminPanelLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [user, setUser] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [userData, setUserData] = useState({name:''});
  const [companyName, setCompanyName] = useState('');

  const [isDailtAttendance, setIsDailtAttendance] = useState(false);
  

  // check if user is admin

  useEffect(()=>{
    const unsubscribe = onAuthStateChanged(auth, async(currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        console.log(currentUser.phoneNumber)
      } else {
        setUser(null);
        router.push('/login');
      }
      setCheckingStatus(false);
    });

    
    

    return () => unsubscribe()
    
  }, [auth])

useEffect(()=>{
  if(user){
    const fetchUserData = async () => {
      try {
        // Extract phone number without country code (+91)
       
        const phoneNumber = user.phoneNumber.slice(3);
        const q = query(collection(db, "users"), where("phone", "==", phoneNumber));
        const querySnapshot = await getDocs(q);
       
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          
          const userData = { 
            ...userDoc.data() 
          };
          setUserData(userData);
          setCompanyName(userData.companyName);
          setIsDailtAttendance(userData.tracingMethod === "Daily Attendance");
        } else {
          console.log("No user data found for phone number:", user.phoneNumber);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }
},[user])
  




  // Update current time every second
  useEffect(() => {
    
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    

    return () => clearInterval(timer);
  }, []);

  // Format date as "Day, Month Date, Year"
  const formattedDate = currentDateTime.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Format time as "HH:MM:SS AM/PM"
  const formattedTime = currentDateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // Check if we're on mobile when component mounts and when window resizes
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // If we're on mobile, ensure sidebar is expanded when we switch back to desktop
      if (window.innerWidth >= 768) {
        setSidebarCollapsed(false);
      }
    };

    // Initial check
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkIfMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);



  const handleLogout = () => {
    // Logout logic here
    console.log("Logout clicked");
    signOut(auth);
    router.push("/login");
  };

  const navItems = [
    { href: "/admin", label: "Attendance Overview", icon: LayoutGrid },
    {
      href: "/admin/employeemanagement",
      label: "Employee Management",
      icon: Users2,
    },
    {
      href: "/admin/leavemanagement",
      label: "Leave Management",
      icon: CalendarCheck,
    },
    
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  if(isDailtAttendance){
    // Insert WFH Management at index 3
    navItems.splice(3, 0, {
      href: "/admin/wfh-management",
      label: "WFH Management",
      icon: Home,
    });
  }
  const SidebarContent = () => (
    <nav className="flex flex-col gap-2 p-4">
      {navItems.map((item) => (
        <Link key={item.label} href={item.href} passHref>
          <Button
            variant={pathname === item.href ? "secondary" : "ghost"}
            className={`w-full ${
              sidebarCollapsed ? "justify-center" : "justify-start"
            }`}
            title={sidebarCollapsed ? item.label : undefined}
          >
            <item.icon
              className={`${sidebarCollapsed ? "" : "mr-2"} h-4 w-4`}
            />
            {!sidebarCollapsed && item.label}
          </Button>
        </Link>
      ))}
    </nav>
  );



  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <aside
        className={`hidden md:flex h-screen ${
          sidebarCollapsed ? "w-16" : "w-64"
        } flex-col border-r bg-background fixed left-0 top-0 z-40 transition-all duration-300`}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-semibold overflow-hidden"
          >
            <Building className="h-6 w-6 text-sky-600 flex-shrink-0" />
            {!sidebarCollapsed && <span>{companyName}</span>}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      <div
        className={`flex flex-1 flex-col ${
          sidebarCollapsed ? "md:ml-16" : "md:ml-64"
        } transition-all duration-300`}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6 md:justify-end">
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button size="icon" variant="outline">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="md:hidden w-64 p-0">
              <div className="flex h-16 items-center border-b px-6">
                <Link
                  href="/admin"
                  className="flex items-center gap-2 font-semibold"
                >
                  <Building className="h-6 w-6 text-sky-600" />
                  <span>{companyName}</span>
                </Link>
              </div>
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <div className="text-sm font-medium">{formattedDate}</div>
              <div className="text-xs text-muted-foreground">
                {formattedTime}
              </div>
            </div>
            <div className="hidden sm:block h-6 w-px bg-border mx-1" />
            <div className="flex items-center gap-2">

              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                    Welcome, {userData.name}
                  </span>
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src="https://placehold.co/40x40/0ea5e9/FFFFFF?text=A"
                      alt="Admin"
                    />
                    <AvatarFallback>
                      {``}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                  
                </DropdownMenuContent>

                
              </DropdownMenu>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
