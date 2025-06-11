"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard, Users, UserCog, Settings, BarChart3, FileText, LogOut, Menu, Bell, ClipboardList, ChevronDown, User, KeyRound, HelpCircle, Settings as SettingsIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "firebase/auth";
import { auth } from "@/app/firebase/config";
import { toast } from 'sonner';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { onAuthStateChanged } from "firebase/auth";


// Dummy data for testing
export const dashboardStats = {
  totalAdmins: 12,
  activeSessions: 5,
  pendingApprovals: 3,
  systemStatus: 'Operational'
};

export const adminUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Super Admin', lastActive: '2 mins ago' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Admin', lastActive: '1 hour ago' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Manager', lastActive: '3 hours ago' },
];

export const systemAlerts = [
  { id: 1, type: 'warning', message: 'New admin registration pending', time: '5 mins ago' },
  { id: 2, type: 'info', message: 'System backup completed', time: '2 hours ago' },
  { id: 3, type: 'error', message: 'Login attempt from new device', time: '1 day ago' },
];


export default function SuperAdminPanelLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [superAdminUsers, setSuperAdminUsers] = useState([]);
  
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(()=>{
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        return router.push("/superadmin/auth");
      }
      console.log(user)
      const fetchSuperAdminUsers = async () => {
        const superAdminUsersRef = collection(db, "superadmin");
        const q = query(superAdminUsersRef, where("email", "==", user.email));
        const querySnapshot = await getDocs(q);
        const adminUsers = querySnapshot.docs.map((doc) => doc.data());
        setSuperAdminUsers(adminUsers);
      };

      fetchSuperAdminUsers();
    });
    return () => unsubscribe();
  },[])

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


 
  // Format date and time
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Handle logout
  const handleLogout = async () => {
    // Add your logout logic here
    await signOut(auth);
   toast.success("Logged out successfully");
   return router.push('/superadmin/auth');
  };


  const navItems = [
    { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/superadmin/dashboard/adminmanagement", label: "Admin Management", icon: UserCog },
    { href: "/superadmin/dashboard/attendancerules", label: "Attendance Rules", icon: ClipboardList },
    // { href: "/superadmin/dashboard/activity-log", label: "Activity Logs", icon: FileText },
    // { href: "/superadmin/dashboard/system-settings", label: "System Settings", icon: Settings },
  ];

  const SidebarContent = () => (
    
    <nav className="flex flex-col gap-1 p-2 md:p-3">
      {navItems.map((item) => {
        const isActive = pathname === item.href || 
                       (pathname.startsWith(item.href) && item.href !== '/superadmin/dashboard');
        
        return (
          <Link 
            key={item.label} 
            href={item.href} 
            className="block w-full"
            aria-current={isActive ? 'page' : undefined}
          >
            <Button
              variant={isActive ? 'secondary' : 'ghost'}
              className={`w-full justify-start px-3 py-5 md:py-2.5 text-sm md:text-sm transition-colors
                ${isActive ? 'bg-accent/80 hover:bg-accent/90' : 'hover:bg-accent/50'}`}
            >
              <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Button>
          </Link>
        );
      })}
    </nav>
  );
  
  // Get current user data for the header
  const currentUser = adminUsers[0]; // Using first admin as current user for demo

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-background transition-all duration-200">
        <div className="flex h-16 items-center border-b px-4 lg:px-6">
          <Link href="/superadmin" className="flex items-center gap-2 font-semibold">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <span className="text-sm lg:text-base">Super Admin</span>
          </Link>
        </div>
        <SidebarContent />
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header & Sidebar Trigger */}
        <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between gap-3 border-b bg-background px-3 sm:px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-9 w-9 md:h-10 md:w-10"
                  aria-label="Toggle navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="left" 
                className="w-72 max-w-[85vw] p-0"
                overlayClassName="bg-black/20 backdrop-blur-sm"
              >
                <div className="flex h-14 items-center border-b px-4">
                  <Link href="/superadmin" className="flex items-center gap-2 font-semibold">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                    <span>Super Admin</span>
                  </Link>
                </div>
                <div className="h-[calc(100%-3.5rem)] overflow-y-auto">
                  <SidebarContent />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold md:hidden">
              {navItems.find(item => item.href === pathname)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Date and Time Display */}
            <div className="hidden md:flex flex-col items-end">
              <div className="text-sm font-medium">{formattedDate}</div>
              <div className="text-xs text-muted-foreground">{formattedTime}</div>
            </div>
            
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {systemAlerts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                  {systemAlerts.length > 9 ? '9+' : systemAlerts.length}
                </span>
              )}
            </Button>
            
            {/* Profile Dropdown */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src="/placeholder-avatar.jpg" alt={currentUser.name} />
                      <AvatarFallback className="text-sm font-medium">
                        {currentUser.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {currentUser.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/superadmin/dashboard')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/superadmin/dashboard/system-settings')}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span >Settings</span>
                  </DropdownMenuItem> */}
                
                  <DropdownMenuItem 
                    className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* User name and role - hidden on mobile */}
              <div className="hidden md:flex flex-col items-start">
                <p className="text-sm font-medium leading-tight">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground leading-tight">{currentUser.role}</p>
              </div>
              
              {/* Mobile logout button - only visible on small screens */}
              <Button 
                variant="outline" 
                size="sm" 
                className="md:hidden h-9 px-2"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 max-w-[2000px] mx-auto w-full">
          <div className="h-full w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
