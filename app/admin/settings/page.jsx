"use client";
import { useEffect, useState as useStateSettings } from "react"; // Renamed useState
import { Button as ButtonSettings } from "@/components/ui/button"; // Renamed
import {
  Card as CardSettings,
  CardContent as CardContentSettings,
  CardHeader as CardHeaderSettings,
  CardTitle as CardTitleSettings,
  CardDescription as CardDescriptionSettings,
} from "@/components/ui/card"; // Renamed
import { Input as InputSettings } from "@/components/ui/input"; // Renamed
import { Label as LabelSettings } from "@/components/ui/label"; // Renamed
import { Checkbox } from "@/components/ui/checkbox"; // Shadcn Checkbox
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Shadcn Tabs
import { toast } from "sonner"; // Using Sonner for toast notifications
import {
  Save,
  Clock as ClockIcon,
  Calendar as CalendarIconSettings,
  Briefcase,
  Users, // Added for All Members icon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { auth } from "@/app/firebase/config";
import { db } from "@/app/firebase/config";
import { onSnapshot } from "firebase/firestore";
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
  workingHours: "8", // Calculated or fixed
  earlyCheckInAllowed: 30, // minutes
  lateCheckOutAllowed: 30, // minutes
};

export default function AdminSettingsPage() {
  const [dailySettings, setDailySettings] = useStateSettings(initialDailySettings);
  const [meetingSettings, setMeetingSettings] = useState({
    meetingTitle: "",
    meetingTime: "",
    meetingDate: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
    meetingDuration: "", // hours
    earlyCheckInAllowed: "", // minutes
    lateCheckInAllowed: "", // minutes
    attendees: []
  });

  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [user, setUser] = useState(null);
  const [Admin___Uid, setAdminuid] = useState("");
  const [recentMeetings, setRecentMeetings] = useState([]);

  // Mock employee data - replace with your actual employee data
  const [employees , setEmployees] = useState([]);

  // Filter employees based on search term
  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const user = auth.currentUser;
        const phone = user.phoneNumber.slice(3);
        const q = query(collection(db, "users"), where("phone", "==", phone));
        const querySnap = await getDocs(q);
        if (querySnap) {
          const userData = querySnap.docs[0].data();
          const adminuid = userData.uid;
        
          if (userData.tracingMethod == "Schedule Meetings") {
            setShowAddMeetingModal(true);
          }
          fetchMeetingsData(adminuid);
          fetchEmployeeData(adminuid);
        }
      } catch (error) {
        console.log(error);
      }
    };

    const fetchMeetingsData = async (adminuid) => {
      console.log("adminuid",adminuid)
      if (adminuid == "")  {
        console.log("No admin UID available, skipping meetings fetch");
        return;
      }

      try {
        const q = query(
          collection(db, "Meetings"),
          where("adminUid", "==", adminuid),
        );
        
        const querySnap = await getDocs(q);
        
        if (querySnap.empty) {
          console.log("No meetings found for this admin");
          setRecentMeetings([]);
          return;
        }

        const meetingsData = querySnap.docs.map(doc => ({
          id: doc.id, // Include document ID
          ...doc.data(),
          // Convert Firestore Timestamp to JS Date if needed
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

    const fetchEmployeeData = async (adminuid) => {
      try {
        const user = auth.currentUser;
        const phone = user.phoneNumber.slice(3);
        const q = query(collection(db, "users"), where("adminuid", "==", adminuid));
        const querySnap = await getDocs(q);
        if (querySnap) {
          querySnap.forEach(doc => {
            const employeeData = doc.data();
            const employee = {
              id: doc.id,
              name: employeeData.name,
              email: employeeData.email,
            };
            setEmployees(prev => [...prev, employee]);
          });
          
        }
      } catch (error) {
        console.log(error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        fetchAdminData();
      }
    });
    return () => unsubscribe();
  }, [auth ]);

  const handleEmployeeSelect = (employee) => {
    setMeetingSettings(prev => {
      // Check if attendee already exists
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

  // New function to handle "All Members" selection
  const handleSelectAllMembers = () => {
    setMeetingSettings(prev => {
      // Get all employees that aren't already selected
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
    
    // // Show success toast
    // toast.success("All Members Added", {
    //   description: `Added ${employees.length} members to the meeting.`,
    //   position: "top-right"
    // });
  };

  const removeAttendee = (employeeId) => {
    setMeetingSettings(prev => ({
      ...prev,
      attendees: prev.attendees.filter(emp => emp.id !== employeeId)
    }));
  };

  // New function to clear all attendees
  const clearAllAttendees = () => {
    setMeetingSettings(prev => ({
      ...prev,
      attendees: []
    }));
    // toast.success("Cleared", {
    //   description: "All attendees have been removed.",
    //   position: "top-right"
    // });
  };

  // Using Sonner toast directly
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

  const handleSaveDailySettings = () => {
    // TODO: Firebase logic to save dailySettings

    console.log("Saving Daily Attendance Settings:", dailySettings);
    toast.success("Settings Saved", {
      description: "Daily attendance settings have been updated.",
      position: "top-right",
    });
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
      const meetingRef = doc(collection(db, "Meetings"));
      
      const meetingData = {
        meetingTitle: meetingSettings.meetingTitle,
        meetingDate: meetingSettings.meetingDate,
        meetingTime: meetingSettings.meetingTime,
        meetingDuration: Number(meetingSettings.meetingDuration) || 1,
        earlyCheckInAllowed: Number(meetingSettings.earlyCheckInAllowed) || 15,
        attendees: meetingSettings.attendees || [],
        adminUid: adminDoc.id,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        status: "upcoming",
        meetingId: meetingRef.id,
      };
      console.log("Meeting Data:", meetingSettings);

      await setDoc(meetingRef, meetingData);

      // Reset form after successful save
      setMeetingSettings({
        meetingTitle: "",
        meetingDate: new Date().toISOString().split('T')[0],
        meetingDuration: 1,
        earlyCheckInAllowed: 15,
        lateCheckInAllowed: 15,
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

  return (
    <div className="space-y-6 mt-10 mx-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Attendance Settings</h1>
          <p className="text-muted-foreground">
            Configure rules for different attendance tracing methods.
          </p>
        </div>

        {showAddMeetingModal ? 
          <div>
            <Button onClick={() => setShowAddMeetingModal(false)}>
              Request To Add Daily Attendance
            </Button>
          </div>
        :
        <div>
          <Button onClick={() => setShowAddMeetingModal(true)}>
            Request To Add Schedule Meetings
          </Button>
        </div>
        }
      </div>

      <Tabs
        defaultValue={
          showAddMeetingModal ? "dailyAttendance" : "scheduleMeetings"
        }
        className="w-full"
      >
        <TabsList
          className={`grid w-full ${
            showAddMeetingModal ? "grid-cols-1" : "grid-cols-1"
          }`}
        >
          {!showAddMeetingModal && (
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
        {!showAddMeetingModal && (
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
                  <LabelSettings className="text-base font-medium">
                    Working Days & Times
                  </LabelSettings>
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
                    <div className="flex items-center justify-between">
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
                                  <div className="flex-1">
                                    <div className="font-medium flex items-center">
                                      {employee.name}
                                      {isAlreadySelected && (
                                        <span className="ml-2 text-xs bg-green-200 px-2 py-1 rounded">
                                          Added
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {employee.email}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : searchTerm ? (
                            <div className="px-4 py-2 text-gray-500">
                              No employees found matching "{searchTerm}"
                            </div>
                          ) : (
                            <div className="px-4 py-2 text-gray-500">
                              No employees available
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Selected attendees */}
                    {meetingSettings.attendees?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-sm font-medium text-gray-700 flex items-center">
                          Selected Attendees ({meetingSettings.attendees.length}):
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                          {meetingSettings.attendees.map((attendee) => (
                            <div
                              key={attendee.id}
                              className="flex items-center bg-gray-100 px-2 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                            >
                              <span className="truncate max-w-32">
                                {attendee.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeAttendee(attendee.id)}
                                className="ml-2 text-gray-500 hover:text-red-500 flex-shrink-0"
                                title={`Remove ${attendee.name}`}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <LabelSettings htmlFor="earlyCheckInAllowedMeetings">
                      Early Check-in Allowance (minutes)
                    </LabelSettings>
                    <InputSettings
                      id="earlyCheckInAllowedMeetings"
                      name="earlyCheckInAllowed"
                      type="text"
                      value={meetingSettings.earlyCheckInAllowed}
                      onChange={handleMeetingSettingChange}
                    />
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
                        {recentMeetings.map((m , index) => (
                          <div
                            key={m.id}
                            className="p-2 border rounded bg-slate-50"
                          >
                            <strong>{m.meetingTitle}</strong> - {m.meetingDate} @ {m.meetingDuration} (
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