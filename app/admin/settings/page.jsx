"use client";
import { useEffect, useState as useStateSettings } from "react";
import { Button as ButtonSettings } from "@/components/ui/button";
import {
  Card as CardSettings,
  CardContent as CardContentSettings,
  CardHeader as CardHeaderSettings,
  CardTitle as CardTitleSettings,
  CardDescription as CardDescriptionSettings,
} from "@/components/ui/card";
import { Input as InputSettings } from "@/components/ui/input";
import { Label as LabelSettings } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { toast } from "sonner";
import {
  Save,
  Clock as ClockIcon,
  Calendar as CalendarIconSettings,
  Briefcase,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { auth } from "@/app/firebase/config";
import { db } from "@/app/firebase/config";
import { collection, query, where, getDocs , setDoc , doc , serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const initialDailySettings = {
  workingDays: {
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
  },
  defaultStartTime: "09:00",
  defaultEndTime: "17:00",
  workingHours: "8",
  earlyCheckInAllowed: "30",
  lateCheckOutAllowed: "30",
};

export default function AdminSettingsPage() {
  const [dailySettings, setDailySettings] = useStateSettings(initialDailySettings);
  const [meetingSettings, setMeetingSettings] = useState({
    meetingTitle: "",
    meetingTime: "",
    meetingDate: new Date().toISOString().split('T')[0],
    meetingDuration: "",
    earlyCheckInAllowed: "30",
    lateCheckOutAllowed: "30",
    attendees: []
  });

  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
  const [showAddDailyAttendanceModal, setShowAddDailyAttendanceModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [user, setUser] = useState(null);
  const [adminUid, setAdminUid] = useState("");
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [currentMethod, setCurrentMethod] = useState("");
  const [requests, setRequests] = useState([]);
  const [requestStatus, setRequestStatus] = useState("None"); // Initial status

  const [employees , setEmployees] = useState([]);

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.log("No authenticated user found.");
          return;
        }
        const phone = currentUser.phoneNumber.slice(3);
        const q = query(collection(db, "users"), where("phone", "==", phone));
        const querySnap = await getDocs(q);
        if (querySnap.empty) {
          console.log("No user data found for this phone number.");
          return;
        }
        const userData = querySnap.docs[0].data();
        const fetchedAdminUid = querySnap.docs[0].id;
        setAdminUid(fetchedAdminUid);
        setCurrentMethod(userData.tracingMethod);

        // Set initial tab visibility based on tracingMethod from user document
        setShowAddMeetingModal(userData.tracingMethod === "Schedule Meetings");
        setShowAddDailyAttendanceModal(userData.tracingMethod === "Daily Attendance");
        
        fetchMeetingsData(fetchedAdminUid);
        fetchEmployeeData(fetchedAdminUid);

        // Fetch requests for the admin
        const q2 = query(collection(db, "admin_change_requests"), where("adminuid", "==", fetchedAdminUid));
        const querySnap2 = await getDocs(q2);
        const fetchedRequests = querySnap2.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setRequests(fetchedRequests);

        let approvedDailyAttendance = userData.tracingMethod === "Daily Attendance";
        let approvedScheduleMeetings = userData.tracingMethod === "Schedule Meetings";
        let pendingRequestFound = false;

        fetchedRequests.forEach(req => {
          if (req.status === "Approved") {
            if (req.requestedMethod === "Daily Attendance") {
              approvedDailyAttendance = true;
            } else if (req.requestedMethod === "Schedule Meetings") {
              approvedScheduleMeetings = true;
            }
          } else if (req.status === "Pending") {
            pendingRequestFound = true;
          }
        });

        // Update tab visibility based on current method and approved requests
        setShowAddDailyAttendanceModal(approvedDailyAttendance);
        setShowAddMeetingModal(approvedScheduleMeetings);

        // Set the overall request status for button display
        setRequestStatus(pendingRequestFound ? "Pending" : (approvedDailyAttendance || approvedScheduleMeetings ? "Approved" : "None"));

      } catch (error) {
        console.error("Error fetching admin data:", error);
        toast.error("Error", {
          description: "Failed to fetch admin data.",
          position: "top-right"
        });
      }
    };

    const fetchMeetingsData = async (adminId) => {
      if (!adminId) {
        console.log("No admin UID available, skipping meetings fetch");
        return;
      }

      try {
        const q = query(
          collection(db, "Meetings"),
          where("adminUid", "==", adminId),
        );

        const querySnap = await getDocs(q);

        if (querySnap.empty) {
          console.log("No meetings found for this admin");
          setRecentMeetings([]);
          return;
        }

        const meetingsData = querySnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          meetingDate: doc.data().meetingDate?.toDate
            ? doc.data().meetingDate.toDate().toISOString().split('T')[0]
            : doc.data().meetingDate
        }));

        setRecentMeetings(meetingsData);
      } catch (error) {
        console.error("Error fetching meetings:", error);
        toast.error("Error", {
          description: "Failed to load meetings. Please try again.",
          position: "top-right"
        });
      }
    };

    const fetchEmployeeData = async (adminId) => {
      try {
        if (!adminId) {
            console.log("No admin UID available, skipping employee fetch");
            return;
        }

        const q = query(collection(db, "users"), where("adminuid", "==", adminId));
        const querySnap = await getDocs(q);
        if (querySnap) {
          const fetchedEmployees = [];
          querySnap.forEach(doc => {
            const employeeData = doc.data();
            const employee = {
              id: doc.id,
              name: employeeData.name,
              email: employeeData.email,
            };
            fetchedEmployees.push(employee);
          });
          setEmployees(fetchedEmployees);
        }
      } catch (error) {
        console.error("Error fetching employee data:", error);
        toast.error("Error", {
          description: "Failed to fetch employee data.",
          position: "top-right"
        });
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchAdminData();
      } else {
        setUser(null);
        setAdminUid("");
        setRecentMeetings([]);
        setEmployees([]);
        setCurrentMethod("");
        setRequests([]);
        setRequestStatus("None");
        setShowAddMeetingModal(false);
        setShowAddDailyAttendanceModal(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleEmployeeSelect = (employee) => {
    setMeetingSettings(prev => {
      const exists = prev.attendees.some(a => a.id === employee.id);
      if (!exists) {
        const updatedAttendees = [...(prev.attendees || []), {
          id: employee.id,
          name: employee.name,
          email: employee.email
        }];
        return {
          ...prev,
          attendees: updatedAttendees
        };
      }
      return prev;
    });
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleSelectAllMembers = () => {
    setMeetingSettings(prev => {
      const currentAttendeeIds = new Set(prev.attendees.map(a => a.id));
      const newAttendees = employees.filter(emp => !currentAttendeeIds.has(emp.id))
        .map(emp => ({
          id: emp.id,
          name: emp.name,
          email: emp.email
        }));

      return {
        ...prev,
        attendees: [...prev.attendees, ...newAttendees]
      };
    });
    setSearchTerm('');
    setShowDropdown(false);
  };

  const removeAttendee = (employeeId) => {
    setMeetingSettings(prev => ({
      ...prev,
      attendees: prev.attendees.filter(emp => emp.id !== employeeId)
    }));
  };

  const clearAllAttendees = () => {
    setMeetingSettings(prev => ({
      ...prev,
      attendees: []
    }));
  };

  const handleDailySettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("workingDays.")) {
      const day = name.split(".")[1];
      setDailySettings((prev) => ({
        ...prev,
        workingDays: { ...prev.workingDays, [day]: checked },
      }));
    } else {
      setDailySettings((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleMeetingSettingChange = (e) => {
    const { name, value, type } = e.target;
    setMeetingSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSaveDailySettings = async () => {
    try {
      const phone = user?.phoneNumber?.slice(3);
      if (!phone) {
        throw new Error("User phone number not available");
      }

      const q = query(collection(db, "users"), where("phone", "==", phone));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        throw new Error("User not found");
      }

      const adminDoc = querySnap.docs[0];
      const currentAdminUid = adminDoc.id;

      const dailyAttendanceRef = doc(collection(db, "Daily_attendance"));

      const dailyAttendanceData = {
        adminUid: currentAdminUid,
        workingDays: dailySettings.workingDays,
        defaultStartTime: dailySettings.defaultStartTime,
        defaultEndTime: dailySettings.defaultEndTime,
        workingHours: dailySettings.workingHours,
        earlyCheckInAllowed: dailySettings.earlyCheckInAllowed,
        lateCheckOutAllowed: dailySettings.lateCheckOutAllowed,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "active",
        settingsId: dailyAttendanceRef.id
      };

      await setDoc(dailyAttendanceRef, dailyAttendanceData);

      await setDoc(doc(db, "users", currentAdminUid), {
        tracingMethod: "Daily Attendance"
      }, { merge: true });

      toast.success("Settings Saved", {
        description: "Daily attendance settings have been updated successfully.",
        position: "top-right",
      });

    } catch (error) {
      console.error("Error saving daily settings:", error);
      toast.error("Error", {
        description: error.message || "Failed to save daily attendance settings",
        position: "top-right"
      });
    }
  };

  const handleSaveMeetingSettings = async () => {
    if (!meetingSettings.meetingTitle || !meetingSettings.meetingDate) {
      toast.error("Error", {
        description: "Please fill in all required fields",
        position: "top-right"
      });
      return;
    }

    try {
      const phone = user?.phoneNumber?.slice(3);
      if (!phone) {
        throw new Error("User phone number not available");
      }

      const q = query(collection(db, "users"), where("phone", "==", phone));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        throw new Error("User not found");
      }

      const adminDoc = querySnap.docs[0];
      const currentAdminUid = adminDoc.id;
      const meetingRef = doc(collection(db, "Meetings"));

      const meetingData = {
        meetingTitle: meetingSettings.meetingTitle,
        meetingDate: meetingSettings.meetingDate,
        meetingTime: meetingSettings.meetingTime,
        meetingDuration: meetingSettings.meetingDuration,
        earlyCheckInAllowed: meetingSettings.earlyCheckInAllowed,
        attendees: meetingSettings.attendees || [],
        adminUid: currentAdminUid,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        status: "upcoming",
        meetingId: meetingRef.id,
      };

      await setDoc(meetingRef, meetingData);

      setMeetingSettings({
        meetingTitle: "",
        meetingDate: new Date().toISOString().split('T')[0],
        meetingDuration: 1,
        earlyCheckInAllowed: "15",
        attendees: []
      });

      toast.success("Success", {
        description: "Meeting has been scheduled successfully!",
        position: "top-right"
      });

    } catch (error) {
      console.error("Error saving meeting:", error);
      toast.error("Error", {
        description: error.message || "Failed to save meeting",
        position: "top-right"
      });
    }
  };

  const weekDays = [
    { id: 'mon', label: "Monday" },
    { id: 'tue', label: "Tuesday" },
    { id: 'wed', label: "Wednesday" },
    { id: 'thu', label: "Thursday" },
    { id: 'fri', label: "Friday" },
    { id: 'sat', label: "Saturday" },
    { id: 'sun', label: "Sunday" },
  ];

  const handleAddFeature = async(feature) => {
    try {
      const phone = user?.phoneNumber?.slice(3);
      if (!phone) {
        toast.error("Error", { description: "User phone number not available." });
        return;
      }

      const q = query(collection(db, "users"), where("phone", "==", phone));
      const querySnap = await getDocs(q);
      if (querySnap.empty) {
        toast.error("Error", { description: "Admin user not found." });
        return;
      }

      const adminDoc = querySnap.docs[0];
      const adminData = adminDoc.data();
      const currentAdminId = adminDoc.id;

      let requestedMethod = "";
      if (feature === "daily") { // Requesting Daily Attendance
        requestedMethod = "Daily Attendance";
      } else if (feature === "meeting") { // Requesting Schedule Meetings
        requestedMethod = "Schedule Meetings";
      } else {
        return;
      }

      const today = new Date();
      const formattedDate = format(today, 'yyyy-MM-dd');

      // Check for existing pending requests for the same method
      const existingPendingRequest = requests.find(
        req => req.adminuid === currentAdminId && req.requestedMethod === requestedMethod && req.status === "Pending"
      );

      if (existingPendingRequest) {
        toast.info("Request Already Pending", {
          description: `A request to enable ${requestedMethod} is already pending approval.`,
          position: "top-right",
        });
        return;
      }

      const docRef = doc(collection(db, "admin_change_requests"));
      
      await setDoc(docRef, {
        adminuid: currentAdminId,
        adminName: adminData.name,
        adminEmail: adminData.email,
        requestedMethod: requestedMethod,
        status: "Pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        requestDate: formattedDate,
      });

      toast.success("Request Submitted", {
        description: `Your request to enable ${requestedMethod} has been sent for approval.`,
        position: "top-right",
      });

      // Optimistically update the request status to 'Pending' in local state
      setRequestStatus("Pending");
      setRequests(prev => [...prev, {
        id: docRef.id,
        adminuid: currentAdminId,
        adminName: adminData.name,
        adminEmail: adminData.email,
        requestedMethod: requestedMethod,
        status: "Pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        requestDate: formattedDate,
      }]);

    } catch (error) {
      console.error("Error submitting feature request:", error);
      toast.error("Request Failed", {
        description: error.message || "There was an issue submitting your request.",
        position: "top-right",
      });
    }
  };

  // Determine initial tab to be active
  const initialActiveTab = (() => {
    if (showAddMeetingModal && currentMethod === "Schedule Meetings") return "scheduleMeetings";
    if (showAddDailyAttendanceModal && currentMethod === "Daily Attendance") return "dailyAttendance";
    
    // If a method was approved via request, set that as the initial active tab
    if (showAddMeetingModal) return "scheduleMeetings"; 
    if (showAddDailyAttendanceModal) return "dailyAttendance";
    
    // Fallback if no specific method is currently active or approved via request
    return "dailyAttendance"; 
  })();

  const showRequestButton = (targetFeature) => {
    // If the target feature is already enabled, no need for a request button
    if (targetFeature === "daily" && showAddDailyAttendanceModal) return false;
    if (targetFeature === "meeting" && showAddMeetingModal) return false;

    // Check if there's an existing pending request for this specific feature
    const hasPendingRequestForFeature = requests.some(req => 
        req.requestedMethod === (targetFeature === "daily" ? "Daily Attendance" : "Schedule Meetings") && 
        req.status === "Pending"
    );

    return !hasPendingRequestForFeature;
  };


  if( showAddDailyAttendanceModal){
    console.log("aidsbouabdoubfouadofboabdobcaosudcjlashocuavocbou")
  }

  return (
    <div className="space-y-6 mt-10 mx-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Attendance Settings</h1>
          <p className="text-muted-foreground">
            Configure rules for different attendance tracing methods.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {showRequestButton("daily") && currentMethod === "Schedule Meetings" && (
            <Button onClick={() => handleAddFeature("daily")} disabled={requestStatus === "Pending"}>
              {requestStatus === "Pending" ? "Request Pending..." : "Request To Add Daily Attendance"}
            </Button>
          )}
          {showRequestButton("meeting") && currentMethod === "Daily Attendance" && (
            <Button onClick={() => handleAddFeature("meeting")} disabled={requestStatus === "Pending"}>
              {requestStatus === "Pending" ? "Request Pending..." : "Request To Add Schedule Meetings"}
            </Button>
          )}
        </div>
      </div>

      <Tabs
        defaultValue={initialActiveTab}
        className="w-full"
      >
        <TabsList
          className={`grid w-full ${
            (showAddMeetingModal && showAddDailyAttendanceModal) ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {showAddDailyAttendanceModal && (
            <TabsTrigger value="dailyAttendance">
              <CalendarIconSettings className="mr-2 h-4 w-4" /> Daily Attendance
              Settings
            </TabsTrigger>
          )}
          {showAddMeetingModal && (
            <TabsTrigger value="scheduleMeetings">
              <Briefcase className="mr-2 h-4 w-4" /> Schedule Meetings Settings
            </TabsTrigger>
          )}
        </TabsList>

        {/* Daily Attendance Settings Tab */}
        {showAddDailyAttendanceModal && (
          <TabsContent value="dailyAttendance">
            <CardSettings>
              <CardHeaderSettings>
                <CardTitleSettings>
                  Daily Attendance Configuration
                </CardTitleSettings>
                <CardDescriptionSettings>
                  Set the general rules for employees using daily attendance.
                </CardDescriptionSettings>
              </CardHeaderSettings>
              <CardContentSettings className="space-y-6 pt-6">
                <fieldset className="space-y-2">
                  <div className="flex justify-between items-center">
                    <LabelSettings className="text-base font-medium">
                      Working Days & Times
                    </LabelSettings>
                    <ButtonSettings
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allChecked = Object.values(dailySettings.workingDays).every(day => day);
                        const newWorkingDays = {};
                        weekDays.forEach(day => {
                          newWorkingDays[day.id] = !allChecked;
                        });
                        setDailySettings(prev => ({
                          ...prev,
                          workingDays: newWorkingDays
                        }));
                      }}
                    >
                      {Object.values(dailySettings.workingDays).every(day => day) ? 'Unselect All' : 'Select All'}
                    </ButtonSettings>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 border rounded-md">
                    {weekDays.map((day) => (
                      <div key={day.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`workingDays.${day.id}`}
                          name={`workingDays.${day.id}`}
                          checked={dailySettings.workingDays[day.id]}
                          onCheckedChange={(checked) =>
                            handleDailySettingChange({
                              target: {
                                name: `workingDays.${day.id}`,
                                checked,
                                type: "checkbox",
                              },
                            })
                          }
                        />
                        <LabelSettings
                          htmlFor={`workingDays.${day.id}`}
                          className="font-normal"
                        >
                          {day.label}
                        </LabelSettings>
                      </div>
                    ))}
                  </div>
                </fieldset>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <LabelSettings htmlFor="defaultStartTime">
                      Default Start Time
                    </LabelSettings>
                    <InputSettings
                      id="defaultStartTime"
                      name="defaultStartTime"
                      type="time"
                      value={dailySettings.defaultStartTime}
                      onChange={handleDailySettingChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelSettings htmlFor="defaultEndTime">
                      Default End Time
                    </LabelSettings>
                    <InputSettings
                      id="defaultEndTime"
                      name="defaultEndTime"
                      type="time"
                      value={dailySettings.defaultEndTime}
                      onChange={handleDailySettingChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <LabelSettings htmlFor="earlyCheckInAllowed">
                      Early Check-in Allowance (minutes)
                    </LabelSettings>
                    <InputSettings
                      id="earlyCheckInAllowed"
                      name="earlyCheckInAllowed"
                      type="number"
                      value={dailySettings.earlyCheckInAllowed}
                      onChange={handleDailySettingChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelSettings htmlFor="lateCheckOutAllowed">
                      Late Check-out Allowance (minutes)
                    </LabelSettings>
                    <InputSettings
                      id="lateCheckOutAllowed"
                      name="lateCheckOutAllowed"
                      type="number"
                      value={dailySettings.lateCheckOutAllowed}
                      onChange={handleDailySettingChange}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <ButtonSettings onClick={handleSaveDailySettings}>
                    <Save className="mr-2 h-4 w-4" /> Save Daily Settings
                  </ButtonSettings>
                </div>
              </CardContentSettings>
            </CardSettings>
          </TabsContent>
        )}

        {/* Schedule Meetings Settings Tab */}
        {showAddMeetingModal && (
          <TabsContent value="scheduleMeetings">
            <CardSettings>
              <CardHeaderSettings>
                <CardTitleSettings>
                  Schedule Meetings Configuration
                </CardTitleSettings>
                <CardDescriptionSettings>
                  Set rules and defaults for meeting-based attendance.
                </CardDescriptionSettings>
              </CardHeaderSettings>
              <CardContentSettings className="space-y-6 pt-6">
                <div className="space-y-2 flex gap-4 flex-col sm:flex-row">
                  <div className="w-full md:w-1/4 ">
                    <LabelSettings htmlFor="defaultMeetingTitle">
                      Default Meeting Title
                    </LabelSettings>
                    <InputSettings
                      id="defaultMeetingTitle"
                      name="meetingTitle"
                      placeholder="e.g., Project Sync-Up"
                      value={meetingSettings.meetingTitle}
                      onChange={handleMeetingSettingChange}
                    />
                  </div>
                  <div className="w-full md:w-1/4">
                    <LabelSettings htmlFor="meetingDate">
                      Meeting Date
                    </LabelSettings>
                    <InputSettings
                      id="meetingDate"
                      name="meetingDate"
                      type="date"
                      value={meetingSettings.meetingDate}
                      onChange={handleMeetingSettingChange}
                    />
                  </div>
                  <div className="w-full md:w-1/4">
                    <LabelSettings htmlFor="meetingTime">
                      Meeting Time
                    </LabelSettings>
                    <InputSettings
                      id="meetingTime"
                      name="meetingTime"
                      type="time"
                      value={meetingSettings.meetingTime}
                      onChange={handleMeetingSettingChange}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


                  <div className="space-y-2 w-full">
                    <LabelSettings htmlFor="earlyCheckInAllowed">
                      Early Check-in Allowance (minutes)
                    </LabelSettings>
                    <InputSettings
                      id="earlyCheckInAllowed"
                      name="earlyCheckInAllowed"
                      type="text"
                      value={meetingSettings.earlyCheckInAllowed}
                      onChange={handleMeetingSettingChange}
                    />
                  </div>
                  <div className="space-y-2 w-full">
                    <LabelSettings htmlFor="meetingDuration">
                      Default Meeting Duration (hours)
                    </LabelSettings>
                    <InputSettings
                      id="meetingDuration"
                      name="meetingDuration"
                      type="text"
                      step="0.5"
                      placeholder="e.g., 1 or 1.5"
                      value={meetingSettings.meetingDuration}
                      onChange={handleMeetingSettingChange}
                    />
                  </div>
                  <div className="space-y-2 w-full relative">
                    <div className="flex items-center justify-between ">
                      <LabelSettings>Select Members</LabelSettings>
                      {meetingSettings.attendees?.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={clearAllAttendees}
                          className="text-xs"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                    <div className="relative">
                      <InputSettings
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                      />
                      {showDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                          {/* All Members Option */}
                          <div
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center border-b border-gray-100 bg-blue-25"
                            onClick={handleSelectAllMembers}
                          >
                            <Users className="mr-3 h-4 w-4 text-blue-600" />
                            <div>
                              <div className="font-medium text-blue-700">
                                Select All Members
                              </div>
                              <div className="text-xs text-blue-500">
                                Add all {employees.length} employees to this meeting
                              </div>
                            </div>
                          </div>
                          
                          {/* Individual Employee Options */}
                          {filteredEmployees.length > 0 ? (
                            filteredEmployees.map((employee) => {
                              const isAlreadySelected = meetingSettings.attendees?.some(a => a.id === employee.id);
                              return (
                                <div
                                  key={employee.id}
                                  className={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center ${isAlreadySelected ? 'bg-green-50 text-green-700' : ''}`}
                                  onClick={() => handleEmployeeSelect(employee)}
                                >
                                  {employee.name}
                                </div>
                              );
                            })
                          ) : (
                            <div className="px-4 py-2 text-gray-500">No employees found</div>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Display selected members */}
                    {meetingSettings.attendees?.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        {meetingSettings.attendees.map((employee) => (
                          <div
                            key={employee.id}
                            className="flex items-center gap-2 bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full"
                          >
                            <span>{employee.name}</span>
                            <button
                              type="button"
                              onClick={() => removeAttendee(employee.id)}
                              className="text-blue-500 hover:text-blue-700 rounded-full hover:bg-blue-200 p-0.5"
                              aria-label={`Remove ${employee.name}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <ButtonSettings onClick={handleSaveMeetingSettings}>
                    <Save className="mr-2 h-4 w-4" /> Save Meeting Settings
                  </ButtonSettings>
                </div>

                <div className="pt-6">
                  <h3 className="text-lg font-medium mb-2">
                    Recent Meetings Details (View)
                  </h3>
                  <CardSettings className="border-dashed">
                    <CardContentSettings className="p-6 text-center">
                      <div className="mt-4 text-left text-xs space-y-1">
                        {recentMeetings.map((m) => (
                          <div
                            key={m.id}
                            className="p-2 border rounded bg-slate-50"
                          >
                            <strong>{m.meetingTitle}</strong> - {m.meetingDate} @ {m.meetingTime} (
                            {m.attendees.length} attendees)
                          </div>
                        ))}
                      </div>
                    </CardContentSettings>
                  </CardSettings>
                </div>
              </CardContentSettings>
            </CardSettings>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}