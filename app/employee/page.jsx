"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit2, LogOut, CalendarDays, Briefcase, MapPin, ClockIcon, Camera , UserCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast as sonnerToast } from 'sonner'; // Using sonner
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {DailyAttendance} from "./components/profileheader";
import Attendancehistory from "./components/attendancehistory";
import Leavetab from "./components/leavetab";
import Meetingattendance from "./components/meetingattendance";
import { onAuthStateChanged , signOut, EmailAuthProvider, linkWithCredential } from "firebase/auth";
import {auth} from "@/app/firebase/config";
import { db, storage } from "@/app/firebase/config";
import { query, collection, where, getDocs, setDoc ,doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";




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
    const fileInputRef = useRef(null);
    const [imageFile, setImageFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showVerifyDialog, setShowVerifyDialog] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
  
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
              ...userDoc.data(),
              uid: userDoc.id
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
  
    const handleImageUpload = async () => {
      if (!imageFile || !profile.uid) return;
  
      setIsUploading(true);
      const storageRef = ref(storage, `profile_pictures/${profile.uid}`);
      const uploadTask = uploadBytesResumable(storageRef, imageFile);
  
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload failed:", error);
          sonnerToast.error("Image upload failed. Please try again.");
          setIsUploading(false);
          setImageFile(null);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await updateDoc(doc(db, "users", profile.uid), {
            avatarUrl: downloadURL,
          });
          setProfile({ ...profile, avatarUrl: downloadURL });
          sonnerToast.success("Profile picture updated successfully.");
          setIsUploading(false);
          setImageFile(null);
        }
      );
    };

    useEffect(() => {
        if (imageFile) {
          handleImageUpload();
        }
    }, [imageFile]);
  
    const handleUpdatePassword = async () => {
        if (newPassword !== confirmPassword) {
          sonnerToast.error("Passwords do not match");
          return;
        }
        if (!newPassword || newPassword.length < 6) {
          sonnerToast.error("Password must be at least 6 characters long.");
          return;
        }
    
        try {
          const currentUser = auth.currentUser;
          if (!currentUser) {
            throw new Error("No authenticated user found.");
          }
    
          const credential = EmailAuthProvider.credential(profile.email, newPassword);
          await linkWithCredential(currentUser, credential);
    
          setNewPassword("");
          setConfirmPassword("");
          setShowVerifyDialog(false);
    
          sonnerToast.success("Account Verified!", {
            description: "You can now log in using your email and new password.",
          });
        } catch (error) {
          console.error("Error updating password:", error);
    
          let description = "Failed to update password. Please try again.";
          if (error.code === 'auth/requires-recent-login') {
            description = "This is a sensitive operation. Please log out and log back in before trying again.";
          } else if (error.code === 'auth/email-already-in-use' || error.code === 'auth/credential-already-in-use') {
            description = "This email is already linked to another account.";
          }
    
          sonnerToast.error("Verification Failed", { description });
        }
      };
  
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

                    {/* Edit Profile Button */}
                    
                    {/* <DropdownMenuItem onClick={() => setIsEdited(true)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      <span>Edit Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator /> */}

                    <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
                      <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <UserCheck className="mr-2 h-4 w-4" />
                          <span>Account Verification</span>
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Account Verification</DialogTitle>
                          <DialogDescription>
                            Set a password to enable login with your email address.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" value={profile.email} readOnly />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="min. 6 characters"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm new password"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>Cancel</Button>
                          <Button onClick={handleUpdatePassword}>Save Password</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
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
                <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile?.avatarUrl || `https://api.dicebear.com/6.x/initials/svg?seed=${profile?.name || 'User'}`} alt={profile?.name || 'User'} />
                      <AvatarFallback>{profile.name?.substring(0,2).toUpperCase() || 'ME'}</AvatarFallback>
                    </Avatar>
                    <Input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={(e) => setImageFile(e.target.files[0])}
                        className="hidden"
                        accept="image/*"
                    />
                    <Button 
                        size="icon" 
                        variant="outline" 
                        className="absolute bottom-0 right-0 rounded-full h-7 w-7 bg-white"
                        onClick={() => fileInputRef.current.click()}
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <div className="w-4 h-4 border-2 border-t-transparent border-gray-800 rounded-full animate-spin"></div>
                        ) : (
                            <Camera className="h-4 w-4"/>
                        )}
                    </Button>
                </div>
                
                {!isedited ? (
                  <div className="text-center sm:text-left flex-grow flex flex-col gap-1">
                    <h1 className="text-2xl font-bold">{profile.name}</h1>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                    <p className="text-sm text-muted-foreground">{profile.phone}</p>
                  </div>
                ) : (
                  <div className="text-center sm:text-left flex flex-col gap-1  sm:w-auto" style={{width: "70%"}}>
                    <Input 
                      value={profile.name} 
                      className="font-semibold " 
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
  