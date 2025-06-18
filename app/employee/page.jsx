"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Edit2,
  LogOut,
  CalendarDays,
  Briefcase,
  MapPin,
  ClockIcon,
  Camera,
  UserCheck,
  Home,
  FileText,
  Send,
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast as sonnerToast } from "sonner"; // Using sonner
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
import { Textarea } from "@/components/ui/textarea";
import { DailyAttendance } from "./components/profileheader";
import Attendancehistory from "./components/attendancehistory";
import Leavetab from "./components/leavetab";
import Meetingattendance from "./components/meetingattendance";
import {
  onAuthStateChanged,
  signOut,
  EmailAuthProvider,
  linkWithCredential,
} from "firebase/auth";
import { auth } from "@/app/firebase/config";
import { db, storage } from "@/app/firebase/config";
import {
  query,
  collection,
  where,
  getDocs,
  setDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Clock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/datepicker";
import WfhHistory from "./components/wfhhistory";

export default function MemberPage() {
  // Dummy profile data for testing
  const dummyProfile = {
    id: "emp123",
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+91 9876543210",
    profilePictureUrl: "https://api.dicebear.com/6.x/avataaars/svg?seed=John",
    department: "Engineering",
    designation: "Senior Developer",
    joinDate: "2023-01-15",
    employeeId: "EMP-2023-001",
    tracingMethod: "Daily Attendance",
  };

  // const [isPermanent, setIsPermanent] = useState(true);

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
  const [showWfhRequestDialog, setShowWfhRequestDialog] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [wfhDate, setWfhDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [wfhReason, setWfhReason] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);
  const [hours, setHours] = useState(false);
  const [formData, setFormData] = useState({
    requestType: "temporary",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    reason: "",
    workLocation: "",
    emergencyContact: "",
    emergencyPhone: "",
    equipmentNeeded: "",
    internetSpeed: "",
    workingHours: "regular",
    customHours: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isWFhEnabled, setIsWFhEnabled] = useState(false);

  // Auto-update end date for permanent requests
  useEffect(() => {
    if (formData.requestType === "permanent" && formData.startDate) {
      setFormData(prev => ({
        ...prev,
        endDate: formData.startDate
      }));
      setEndDate(startDate);
    }
  }, [formData.requestType, formData.startDate]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
        router.push("/login");
      }
      setCheckingStatus(false);
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (!user || !user.phoneNumber) {
      console.log("User or phone number not available yet");
      return;
    }

    const fetchProfile = async () => {
      try {
        // Extract phone number without country code (+91)
        const phoneNumber = user.phoneNumber.slice(3);
        const q = query(
          collection(db, "users"),
          where("phone", "==", phoneNumber)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = {
            ...dummyProfile,
            ...userDoc.data(),
            uid: userDoc.id,
          };
          setProfile(userData);
          fetchAdmin(userData.adminuid);
        } else {
          console.log("No user data found for phone number:", phoneNumber);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };


    const fetchAdmin = async (adminuid) => {
      const q = query(collection(db, "users"), where("uid", "==", adminuid));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const adminData = querySnapshot.docs[0].data();
        if(adminData.tracingMethod === "Schedule Meetings"){
          setIsWFhEnabled(true);
        }else{
          setIsWFhEnabled(false);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleLogout = () => {
    signOut(auth);
    router.replace("/login");
  };


  console.log(profile,"jdbfbaodbfbasipnfpabuf");

  const handleEditProfile = async () => {
    // router.push('/member/edit-profile'); // Navigate to edit profile page

    setIsEdited(true);
    const employeeId = profile.uid;
    setProfile({ ...profile, name: profile.name, email: profile.email });
    const update_name_email = {
      name: profile.name,
      email: profile.email,
    };
    await updateDoc(doc(db, "users", employeeId), update_name_email, {
      merge: true,
    });
    await updateDoc(
      doc(db, "attendance", employeeId),
      { name: profile.name },
      { merge: true }
    );
    await updateDoc(
      doc(db, "leaves", employeeId),
      { name: profile.name },
      { merge: true }
    );
    setIsEdited(false);
  };

  const handleAttendanceMarked = (status) => {
    setAttendanceStatusMsg(
      `Status: ${status} at ${new Date().toLocaleTimeString()}`
    );
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
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
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

      const credential = EmailAuthProvider.credential(
        profile.email,
        newPassword
      );
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
      if (error.code === "auth/requires-recent-login") {
        description =
          "This is a sensitive operation. Please log out and log back in before trying again.";
      } else if (
        error.code === "auth/email-already-in-use" ||
        error.code === "auth/credential-already-in-use"
      ) {
        description = "This email is already linked to another account.";
      }

      sonnerToast.error("Verification Failed", { description });
    }
  };

  // const handleWfhRequestSubmit = async () => {
  //   if (!wfhDate || !wfhReason) {
  //     sonnerToast.error("Incomplete Request", {
  //       description:
  //         "Please provide both a date and a reason for your request.",
  //     });
  //     return;
  //   }

  //   try {
  //     const wfhRequestRef = doc(collection(db, "wfh_requests"));

  //     await setDoc(wfhRequestRef, {
       
  //       employeeId: profile.uid,
  //       employeeName: profile.name,
  //       employeeEmail: profile.email,
  //       requestDate: wfhDate,
  //       reason: wfhReason,
  //       status: "Pending",
  //       createdAt: serverTimestamp(),
  //     });

  //     sonnerToast.success("Request Submitted", {
  //       description: `Your WFH request for ${wfhDate} has been submitted.`,
  //     });

  //     setShowWfhRequestDialog(false);
  //     setWfhDate(new Date().toISOString().split("T")[0]);
  //     setWfhReason("");
  //   } catch (error) {
  //     console.error("Error submitting WFH request:", error);
  //     sonnerToast.error("Submission Failed", {
  //       description:
  //         "There was an issue submitting your request. Please try again.",
  //     });
  //   }
  // };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSelectChange = (name, value) => {

    if(value === "permanent"){
      setIsPermanent(true);
    }else{
      setIsPermanent(false);
    }

    if(name ==="workingHours"){
      if(value === "flexible"){
        setHours(true);
      }else{
        setHours(false);
      }
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.startDate) newErrors.startDate = "Start date is required";
    
    // Only require end date for non-permanent requests
    if (formData.requestType !== "permanent" && !formData.endDate) {
      newErrors.endDate = "End date is required";
    }
    
    if (!formData.reason.trim()) newErrors.reason = "Reason is required";
    if (!formData.workLocation.trim())
      newErrors.workLocation = "Work location is required";
    if (!formData.emergencyContact.trim())
      newErrors.emergencyContact = "Emergency contact is required";
    if (!formData.emergencyPhone.trim())
      newErrors.emergencyPhone = "Emergency phone is required";

    // Date validation
    if (formData.startDate) {
      const start = new Date(formData.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
      
      // Check if start date is in the past
      if (start < today) {
        newErrors.startDate = "Start date cannot be in the past";
      }
    }

    // Only validate end date if both dates exist and it's not a permanent request
    if (formData.startDate && formData.endDate && formData.requestType !== "permanent") {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      
      if (start > end) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    console.log(newErrors);

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  //handle dates

  const handleDateChange = (obj) => {
    if (!obj.date) return;
    
    const formattedDate = obj.date.toISOString().split('T')[0];
    
    if(obj.duration === "start"){
      setStartDate(obj.date);
      setFormData(prev => ({
        ...prev,
        startDate: formattedDate
      }));
      
      // Clear start date error when user selects a date
      if (errors.startDate) {
        setErrors(prev => ({
          ...prev,
          startDate: ""
        }));
      }
    } else {
      setEndDate(obj.date);
      setFormData(prev => ({
        ...prev,
        endDate: formattedDate
      }));
      
      // Clear end date error when user selects a date
      if (errors.endDate) {
        setErrors(prev => ({
          ...prev,
          endDate: ""
        }));
      }
    }
  };

  const handleSubmit = async () => {
    console.log("Form data before validation:", formData);
    console.log("Start date:", startDate);
    console.log("End date:", endDate);
    console.log("Is permanent:", isPermanent);

    if (!validateForm()) {
        sonnerToast.error("Validation Failed", {
            description: "Please check the form for errors and try again."
        });
        return;
    };

    setIsSubmitting(true);

    try {
      const wfhRequestRef = doc(collection(db, "wfh_requests"));

      await setDoc(wfhRequestRef, {
        ...formData,
        adminuid: profile.adminuid,
        employeeId: profile.uid,
        employeeName: profile.name,
        employeeEmail: profile.email,
        status: "Pending",
        createdAt: serverTimestamp(),
      });


      sonnerToast.success("WFH Request Submitted Successfully!");
      setShowWfhRequestDialog(false);
      resetForm();
    } catch (error) {
      console.error("Error submitting request:", error);
      sonnerToast.error("Error submitting request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      requestType: "temporary",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      reason: "",
      workLocation: "",
      emergencyContact: "",
      emergencyPhone: "",
      equipmentNeeded: "",
      internetSpeed: "",
      workingHours: "regular",
      customHours: "",
    });
    setStartDate(new Date());
    setEndDate(new Date());
    setErrors({});
  };

  const handleClose = () => {
    setShowWfhRequestDialog(false);
    resetForm();
  };

  const wfh = "WFH Request";

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

                  <Dialog
                    open={showVerifyDialog}
                    onOpenChange={setShowVerifyDialog}
                  >
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
                          Set a password to enable login with your email
                          address.
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
                          <Label htmlFor="confirmPassword">
                            Confirm Password
                          </Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) =>
                              setConfirmPassword(e.target.value)
                            }
                            placeholder="Confirm new password"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowVerifyDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleUpdatePassword}>
                          Save Password
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* WFH Request */}

                 {!isWFhEnabled && (
                  <Dialog
                    open={showWfhRequestDialog}
                    onOpenChange={setShowWfhRequestDialog}
                  >
                    <DialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Home className="mr-2 h-4 w-4" />
                        <span>WFH Request</span>
                      </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Work From Home Request</DialogTitle>
                        <DialogDescription>
                          Submit a request to work from home for a specific day.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
                        {/* Request Type */}
                        <div className="space-y-2">
                          <Label htmlFor="requestType">Request Type</Label>
                          <Select
                            value={formData.requestType}
                            onValueChange={(value) =>
                              handleSelectChange("requestType", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="temporary">
                                Temporary (Specific dates)
                              </SelectItem>
                              <SelectItem value="permanent">
                                Permanent Work From Home
                              </SelectItem>
                              <SelectItem value="hybrid">
                                Hybrid (Part-time WFH)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Date Range */}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <DatePicker
                              date={startDate}
                              value={startDate}
                              setDate={(date) => handleDateChange({duration:"start" , date})}
                              className={`w-full ${errors.startDate ? "border-red-500" : ""}`}
                            />
                            {errors.startDate && (
                              <p className="text-sm text-red-500">
                                {errors.startDate}
                              </p>
                            )}
                          </div>

                          {!isPermanent && (
                            
                            <div className="space-y-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <DatePicker
                              date={endDate}
                              value={endDate}
                              setDate={(date) => handleDateChange({duration:"end" , date})}
                              className={`w-full ${errors.endDate ? "border-red-500" : ""}`}
                            />
                            {errors.endDate && (
                              <p className="text-sm text-red-500">
                                {errors.endDate}
                              </p>
                            )}
                          </div>
                          )}
                        </div>


                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Working Hours
                          </Label>
                          <Select
                            value={formData.workingHours}
                            onValueChange={(value) =>
                              handleSelectChange("workingHours", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="regular">
                                Regular Office Hours
                              </SelectItem>
                              <SelectItem value="flexible">
                                Flexible Hours
                              </SelectItem>
                             
                            </SelectContent>
                          </Select>

                         
                        </div>

                        {hours && (
                          <div className="space-y-2">
                            <Label htmlFor="customHours">Custom Hours</Label>
                            <Input
                              id="customHours"
                              name="customHours"
                              value={formData.customHours}
                              onChange={handleInputChange}
                              placeholder="Enter custom hours"
                            />
                          </div>
                        )}
                  </div>
                       

                        {/* Reason */}
                        <div className="space-y-2">
                          <Label
                            htmlFor="reason"
                            className="flex items-center gap-1"
                          >
                            <FileText className="w-4 h-4" />
                            Reason for WFH Request *
                          </Label>
                          <Textarea
                            id="reason"
                            name="reason"
                            value={formData.reason}
                            onChange={handleInputChange}
                            placeholder="Please provide a detailed reason for your work from home request..."
                            className={`min-h-[80px] ${
                              errors.reason ? "border-red-500" : ""
                            }`}
                          />
                          {errors.reason && (
                            <p className="text-sm text-red-500">
                              {errors.reason}
                            </p>
                          )}
                        </div>

                        {/* Work Location */}
                        <div className="space-y-2">
                          <Label
                            htmlFor="workLocation"
                            className="flex items-center gap-1"
                          >
                            <MapPin className="w-4 h-4" />
                            Work Location/Address *
                          </Label>
                          <Input
                            id="workLocation"
                            name="workLocation"
                            value={formData.workLocation}
                            onChange={handleInputChange}
                            placeholder="Home address or remote work location"
                            className={
                              errors.workLocation ? "border-red-500" : ""
                            }
                          />
                          {errors.workLocation && (
                            <p className="text-sm text-red-500">
                              {errors.workLocation}
                            </p>
                          )}
                        </div>

                        {/* Emergency Contact */}
                        <Card>
                          <CardContent className="pt-4">
                            <div className="space-y-4">
                              <h4 className="font-medium text-sm text-gray-700">
                                Emergency Contact Information
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="emergencyContact">
                                    Contact Name *
                                  </Label>
                                  <Input
                                    id="emergencyContact"
                                    name="emergencyContact"
                                    value={formData.emergencyContact}
                                    onChange={handleInputChange}
                                    placeholder="Contact person name"
                                    className={
                                      errors.emergencyContact
                                        ? "border-red-500"
                                        : ""
                                    }
                                  />
                                  {errors.emergencyContact && (
                                    <p className="text-sm text-red-500">
                                      {errors.emergencyContact}
                                    </p>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="emergencyPhone">
                                    Contact Phone *
                                  </Label>
                                  <Input
                                    id="emergencyPhone"
                                    type="tel"
                                    name="emergencyPhone"
                                    value={formData.emergencyPhone}
                                    onChange={handleInputChange}
                                    placeholder="Phone number"
                                    className={
                                      errors.emergencyPhone
                                        ? "border-red-500"
                                        : ""
                                    }
                                  />
                                  {errors.emergencyPhone && (
                                    <p className="text-sm text-red-500">
                                      {errors.emergencyPhone}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Equipment & Internet */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="equipmentNeeded">
                              Equipment Needed
                            </Label>
                            <Select
                              value={formData.equipmentNeeded}
                              onValueChange={(value) =>
                                handleSelectChange("equipmentNeeded", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Equipment" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="laptop">Laptop</SelectItem>
                                <SelectItem value="monitor">Monitor</SelectItem>
                                <SelectItem value="keyboard">Keyboard</SelectItem>
                                <SelectItem value="mouse">Mouse</SelectItem>
                                <SelectItem value="none">None</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="internetSpeed">
                              Internet Speed (Mbps)
                            </Label>
                            <Input
                              id="internetSpeed"
                              name="internetSpeed"
                              value={formData.internetSpeed}
                              onChange={handleInputChange}
                              placeholder="e.g., 50 Mbps"
                            />
                          </div>
                        </div>
                       

                        {/* Additional Notes */}
                        {/* <div className="space-y-2">
                         <Label htmlFor="additionalNotes">
                           Additional Notes
                         </Label>
                         <Textarea
                           id="additionalNotes"
                           name="additionalNotes"
                           value={formData.additionalNotes}
                           onChange={handleInputChange}
                           placeholder="Any additional information..."
                           className="min-h-[60px]"
                         />
                       </div> */}
                      </div>
                      <DialogFooter className="pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleClose}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Submit Request
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                 )}
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
                  <AvatarImage
                    src={
                      profile?.avatarUrl ||
                      `https://api.dicebear.com/6.x/initials/svg?seed=${
                        profile?.name || "User"
                      }`
                    }
                    alt={profile?.name || "User"}
                  />
                  <AvatarFallback>
                    {profile.name?.substring(0, 2).toUpperCase() || "ME"}
                  </AvatarFallback>
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
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {!isedited ? (
                <div className="text-center sm:text-left flex-grow flex flex-col gap-1">
                  <h1 className="text-2xl font-bold">{profile.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {profile.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {profile.phone}
                  </p>
                </div>
              ) : (
                <div
                  className="text-center sm:text-left flex flex-col gap-1  sm:w-auto"
                  style={{ width: "70%" }}
                >
                  <Input
                    value={profile.name}
                    className="font-semibold "
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                    placeholder="Full Name"
                  />
                  <Input
                    value={profile.email}
                    className="font-semibold"
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
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
        <TabsList className={`grid w-full grid-cols-3 h-20 md:h-10 border  sm:grid-cols-3  gap-2 ${!isWFhEnabled ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          <TabsTrigger value="attendanceHistory" className="flex items-center justify-center flex-col sm:flex-row">
            <CalendarDays className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Attendance History</span>
            <span className="sm:hidden">Attendance</span>
          </TabsTrigger>
          <TabsTrigger value="leaveHistory" className="flex items-center justify-center flex-col sm:flex-row">
            <Briefcase className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Leave Records</span>
            <span className="sm:hidden">Leaves</span>
          </TabsTrigger>
          {!isWFhEnabled && (
            <TabsTrigger value="wfhHistory" className="flex items-center justify-center flex-col sm:flex-row">
              <Home className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">WFH History</span>
              <span className="sm:hidden">WFH</span>
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="attendanceHistory" className="mt-4">
          <Attendancehistory employeeId={profile.uid} user={user} />
        </TabsContent>
        <TabsContent value="leaveHistory" className="mt-4">
          <Leavetab employeeId={profile.uid} user={user} />
        </TabsContent>
        {!isWFhEnabled && (
          <TabsContent value="wfhHistory" className="mt-4">
            <WfhHistory employeeId={profile.uid} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
