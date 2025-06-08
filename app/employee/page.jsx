"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit2, LogOut, CalendarDays, Briefcase, MapPin, ClockIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast as sonnerToast } from 'sonner'; // Using sonner
import {DailyAttendance} from "./components/profileheader";
import Attendancehistory from "./components/attendancehistory";
import Leavetab from "./components/leavetab";
import Meetingattendance from "./components/meetingattendance";
import { onAuthStateChanged , signOut } from "firebase/auth";
import {auth} from "@/app/firebase/config";
import { db } from "@/app/firebase/config";
import { query, collection, where, getDocs, setDoc ,doc, updateDoc } from "firebase/firestore";




export default function MemberPage() {
    // Dummy profile data for testing
    const dummyProfile = {
        id: 'emp123',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+91 9876543210',
        profilePictureUrl: 'https://api.dicebear.com/6.x/avataaars/svg?seed=John',
        department: 'Engineering',
        designation: 'Senior Developer',
        joinDate: '2023-01-15',
        employeeId: 'EMP-2023-001',
        tracingMethod: 'Daily Attendance'
    };

    const [profile, setProfile] = useState(dummyProfile);
    const [currentDateTime, setCurrentDateTime] = useState(new Date());
    const [location, setLocation] = useState("Office Location");
    const [attendanceStatusMsg, setAttendanceStatusMsg] = useState("");
    const [user, setUser] = useState(null);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [isedited, setIsEdited] = useState(false);
    const router = useRouter();
  
    useEffect(()=>{
      const unsubscribe = onAuthStateChanged(auth, async(currentUser) => {
        if (currentUser) {
          setUser(currentUser);
    
          
        } else {
          setUser(null);
          router.push('/login');
        }
        setCheckingStatus(false);
      });
  
  
      return () => unsubscribe();
    }, [auth])



 

    useEffect(()=>{
      if (!user || !user.phoneNumber) {
        console.log("User or phone number not available yet");
        return;
      }
      
    
      const fetchProfile = async()=>{
        try {
          // Extract phone number without country code (+91)
          const phoneNumber = user.phoneNumber.slice(3);          
          const q = query(collection(db, "users"), where("phone", "==", phoneNumber));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = { 
              ...dummyProfile , 
              ...userDoc.data()
            };
            setProfile(userData);
          } else {
            console.log("No user data found for phone number:", phoneNumber);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      fetchProfile();
    },[user])
  


    



    const handleLogout = () => {
      signOut(auth);
      router.replace('/login');
    };
  
    const handleEditProfile = async() => {
      // router.push('/member/edit-profile'); // Navigate to edit profile page
      
          setIsEdited(true);
          const employeeId = profile.uid;
          setProfile({...profile , name: profile.name , email: profile.email})
          const update_name_email = {
            name: profile.name,
            email: profile.email,
          }
          await updateDoc(doc(db, "users", employeeId), update_name_email , {merge: true});
          await updateDoc(doc(db, "attendance", employeeId), {name:profile.name} , {merge: true});
          await updateDoc(doc(db, "leaves", employeeId), {name:profile.name} , {merge: true});
          setIsEdited(false);
    };
    
    const handleAttendanceMarked = (status) => {
      setAttendanceStatusMsg(`Status: ${status} at ${new Date().toLocaleTimeString()}`);
      setTimeout(() => setAttendanceStatusMsg(""), 5000); // Clear message after 5s
    };
  
    // if (!profile) {
    //   return (
    //     <div className="flex items-center justify-center min-h-screen">
    //       <PageLoader className="h-10 w-10 animate-spin text-purple-600" />
    //     </div>
    //   );
    // }
  
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        {/* Profile Header */}
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="relative w-full">
              {/* Menu Button - Positioned absolutely in top-right corner */}
              <div className="absolute top-0 right-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setIsEdited(true)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      <span>Edit Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout} 
                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Profile Content */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 w-full">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${profile?.name || 'User'}`} alt={profile?.name || 'User'} />
                  <AvatarFallback>{profile.name?.substring(0,2).toUpperCase() || 'ME'}</AvatarFallback>
                </Avatar>
                
                {!isedited ? (
                  <div className="text-center sm:text-left flex-grow flex flex-col gap-1">
                    <h1 className="text-2xl font-bold">{profile.name}</h1>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                    <p className="text-sm text-muted-foreground">{profile.phone}</p>
                  </div>
                ) : (
                  <div className="text-center sm:text-left flex flex-col gap-1 w-full sm:w-auto">
                    <Input 
                      value={profile.name} 
                      className="font-semibold" 
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })} 
                      placeholder="Full Name"
                    />
                    <Input 
                      value={profile.email} 
                      className="font-semibold" 
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })} 
                      placeholder="Email"
                      type="email"
                    />
                    <Input 
                      value={profile.phone} 
                      readOnly 
                      className="font-semibold bg-gray-100" 
                      placeholder="Phone"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsEdited(false)}
                        className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleEditProfile}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
  
        {/* Attendance Marking Section */}
        
  
        {/* Tabs for History */}
        <Tabs defaultValue="attendanceHistory" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="attendanceHistory"><CalendarDays className="mr-2 h-4 w-4"/>Attendance History</TabsTrigger>
            <TabsTrigger value="leaveHistory"><Briefcase className="mr-2 h-4 w-4"/>Leave Records</TabsTrigger>
          </TabsList>
          <TabsContent value="attendanceHistory" className="mt-4">
            <Attendancehistory employeeId={profile.uid} user={user}/>
          </TabsContent>
          <TabsContent value="leaveHistory" className="mt-4">
            <Leavetab employeeId={profile.uid} user={user}/>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  