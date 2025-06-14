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
import { Loader2 as PageLoader, MapPin } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { auth } from "@/app/firebase/config";
import { db } from "@/app/firebase/config";
import { collection, query, where, getDocs , setDoc , doc , serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, EmailAuthProvider, linkWithCredential } from "firebase/auth";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";


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
  attendees: [],
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
  
  const [leaveQuota, setLeaveQuota] = useState("");
  const [carryForward, setCarryForward] = useState(false);

  // Location Settings
  const [geoLocation, setGeoLocation] = useState(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);

  const [locationSettings, setLocationSettings] = useStateSettings({
    latitude: "",
    longitude: "",
    radius: 50,
  });
  const [isLocationVisible, setIsLocationVisible] = useState(false);

  const [employees , setEmployees] = useState([]);
  const [departments, setDepartments] = useState({});

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [maximumDaysCarryForward, setMaximumDaysCarryForward] = useState("");
  // Leave Configuration
  const handleLeaveQuotaChange = (e) => {
    if(e.target.value === ""){
      setLeaveQuota("0");
    }else{
      setLeaveQuota(e.target.value);
    }
  }

  const handleCarryForwardChange = (e) => {

    setCarryForward(!carryForward);
  }
  
  useEffect(() => {
    if (locationSettings.latitude && locationSettings.longitude) {
      setIsLocationVisible(true);
    } else {
      setIsLocationVisible(false);
    }
  }, [locationSettings.latitude, locationSettings.longitude]);

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );


  // Location Settings
  const handleLocationChange = (location) => {
    setIsLocationLoading(false);

    console.log(location,"location is here")
    setGeoLocation(location);
  };

  const MapLocationTracker = ({ onLocationChange, currentLocation, isLoading }) => {
    const [locationError, setLocationError] = useState('');
    const [isWatching, setIsWatching] = useState(false);
    const [watchId, setWatchId] = useState(null);
    const [isGettingAddress, setIsGettingAddress] = useState(false);
  
    const processLocationWithAddress = async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      setIsGettingAddress(true);
      
      try {
        const addressInfo = await getAddressFromCoordinates(latitude, longitude);
        
        const locationData = {
          latitude,
          longitude,
          accuracy,
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          timestamp: new Date().toLocaleTimeString(),
          addressInfo: addressInfo,
          area: addressInfo.area,
          city: addressInfo.city,
          state: addressInfo.state,
          country: addressInfo.country,
          fullAddress: addressInfo.fullAddress,
          formattedAddress: addressInfo.formatted
        };

        setLocationSettings({
          latitude: latitude,
          longitude: longitude,
          radius: 50,
        });
        
        setLocationError('');
        onLocationChange(locationData);
      } catch (error) {
        console.error('Error processing location:', error);
        // Fallback to coordinates only
        onLocationChange({
          latitude,
          longitude,
          accuracy,
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          timestamp: new Date().toLocaleTimeString(),
          area: 'Unknown Area',
          city: 'Unknown City',
          state: 'Unknown State',
          country: 'Unknown Country',
          fullAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        });
      } finally {
        setIsGettingAddress(false);
      }
    };
  
    const startLocationTracking = () => {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by this browser');
        return;
      }
  
      setIsWatching(true);
      
      const id = navigator.geolocation.watchPosition(
        processLocationWithAddress,
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocationError('Location access denied by user');
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationError('Location information is unavailable');
              break;
            case error.TIMEOUT:
              setLocationError('Location request timed out');
              break;
            default:
              setLocationError('An unknown error occurred');
              break;
          }
          setIsWatching(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000
        }
      );
      
      setWatchId(id);
    };
  
    const stopLocationTracking = () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      setIsWatching(false);
    };
  
    const getCurrentLocation = () => {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by this browser');
        return;
      }
  
      navigator.geolocation.getCurrentPosition(
        processLocationWithAddress,
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocationError('Location access denied by user');
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationError('Location information is unavailable');
              break;
            case error.TIMEOUT:
              setLocationError('Location request timed out');
              break;
            default:
              setLocationError('An unknown error occurred');
              break;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      );
    };


    console.log(geoLocation,"currentLocation is here")
  
    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Real-time Location with Address
        </Label>
        
        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={getCurrentLocation}
            disabled={isLoading || isWatching || isGettingAddress}
          >
            {(isLoading || isGettingAddress) ? (
              <PageLoader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="mr-2 h-4 w-4" />
            )}
            {isGettingAddress ? 'Getting Address...' : 'Get Location'}
          </Button>
          
          <Button
            type="button"
            variant={isWatching ? "destructive" : "default"}
            size="sm"
            onClick={isWatching ? stopLocationTracking : startLocationTracking}
            disabled={isLoading || isGettingAddress}
          >
            {isWatching ? "Stop Tracking" : "Live Location"}
          </Button>
        </div>
  
        {/* Map Container */}
        {currentLocation && (
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden max-w-2xl mx-auto h-1/2">
            <div className="bg-gray-100 p-2 text-xs text-gray-600 flex justify-between items-center">
              <span>Live Location Map</span>
              {(isWatching || isGettingAddress) && (
                <span className="flex items-center gap-1 text-green-600">
                  <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></div>
                  {isGettingAddress ? 'Getting Address...' : 'Tracking'}
                </span>
              )}
            </div>
            
            {/* Interactive Map Iframe */}
            <iframe
              key={`${currentLocation.latitude}-${currentLocation.longitude}`}
              src={`https://maps.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              width="100%"
              height="400px"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Current Location Map"
            ></iframe>
            
            {/* Enhanced Location Details */}
            <div className="p-3 bg-white border-t">
              <div className="space-y-2 text-sm">
                {currentLocation.formattedAddress && (
                  <div className="bg-blue-50 p-2 rounded border">
                    <div className="font-medium text-blue-800 mb-1">📍 Address:</div>
                    <div className="text-blue-700 text-xs">{currentLocation.formattedAddress}</div>
                  </div>
                )}
                
                {/* <div className="grid grid-cols-2 gap-2">
                  {currentLocation.area && (
                    <div>
                      <span className="text-gray-600 font-medium">Area:</span>
                      <div className="text-green-600 text-xs">{currentLocation.area}</div>
                    </div>
                  )}
                  {currentLocation.city && (
                    <div>
                      <span className="text-gray-600 font-medium">City:</span>
                      <div className="text-green-600 text-xs">{currentLocation.city}</div>
                    </div>
                  )}
                  {currentLocation.state && (
                    <div>
                      <span className="text-gray-600 font-medium">State:</span>
                      <div className="text-green-600 text-xs">{currentLocation.state}</div>
                    </div>
                  )}
                  {currentLocation.country && (
                    <div>
                      <span className="text-gray-600 font-medium">Country:</span>
                      <div className="text-green-600 text-xs">{currentLocation.country}</div>
                    </div>
                  )}
                </div> */}
                
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Coordinates:</span>
                    <span className="font-mono text-xs">{currentLocation.address}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Accuracy:</span>
                    <span className="text-green-600">±{Math.round(currentLocation.accuracy || 0)}m</span>
                  </div>
                  {/* <div className="flex justify-between items-center">
                    <span className="text-gray-600">Last Update:</span>
                    <span className="text-blue-600">{currentLocation.timestamp}</span>
                  </div> */}
                </div>
              </div>
            </div>
          </div>
        )}
  
        {/* Status Messages */}
        {/* {!currentLocation && !locationError && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="text-blue-800">
              📍 Click "Get Location" or "Live Track" to capture your current position and address
            </p>
          </div>
        )} */}
        
        {locationError && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
            <p className="text-red-800">❌ {locationError}</p>
          </div>
        )}
      </div>
    );
  };

  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'MeetingAttendanceApp/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      
      if (data && data.address) {
        const address = data.address;
        return {
          fullAddress: data.display_name,
          area: address.neighbourhood || address.suburb || address.hamlet || address.village || address.town || '',
          city: address.city || address.town || address.municipality || address.county || '',
          state: address.state || address.region || '',
          country: address.country || '',
          postcode: address.postcode || '',
          road: address.road || address.street || '',
          houseNumber: address.house_number || '',
          formatted: `${address.road || ''} ${address.house_number || ''}, ${address.neighbourhood || address.suburb || ''}, ${address.city || address.town || ''}, ${address.state || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '')
        };
      }
      
      return {
        fullAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        area: '',
        city: '',
        state: '',
        country: '',
        postcode: '',
        road: '',
        houseNumber: '',
        formatted: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      };
    } catch (error) {
      console.error('Error getting address:', error);
      
      // Fallback: Try Google Maps reverse geocoding (if you have API key)
      // You can replace this with your preferred geocoding service
      return {
        fullAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        area: 'Unknown Area',
        city: 'Unknown City',
        state: 'Unknown State',
        country: 'Unknown Country',
        postcode: '',
        road: '',
        houseNumber: '',
        formatted: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      };
    }
  };
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.log("No authenticated user found.");
          return;
        }

        console.log(currentUser,"currentUser is here")
        const phone = currentUser.phoneNumber.slice(3);
        const q = query(collection(db, "users"), where("phone", "==", phone));
        const querySnap = await getDocs(q);
        if (querySnap.empty) {
          console.log("No user data found for this phone number.");
          return;
        }
        const userData = querySnap.docs[0].data();
        const fetchedAdminUid = querySnap.docs[0].id;
        setEmail(userData.email);
        setAdminUid(fetchedAdminUid);
        setCurrentMethod(userData.tracingMethod);

        if (userData.officeLocation) {
          setLocationSettings(userData.officeLocation);
        }

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

        let approvedDailyAttendance = false;
        let approvedScheduleMeetings = false;
   

        if(userData.tracingMethod === "Daily Attendance"){
          approvedDailyAttendance = true;
        }else if(userData.tracingMethod === "Schedule Meetings"){
          approvedScheduleMeetings = true;
        }
        
        let pendingRequestFound = false;



        // fetchedRequests.forEach(req => {
        //   if (req.status === "Approved") {
        //     if (req.requestedMethod === "Daily Attendance") {
        //       approvedDailyAttendance = true;
        //     } else if (req.requestedMethod === "Schedule Meetings") {
        //       approvedScheduleMeetings = true;
        //     }
        //   } else if (req.status === "Pending") {
        //     pendingRequestFound = true;
        //     approvedDailyAttendance = false;
        //   }
        // });

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
          const fetchedDepartments = {};
          querySnap.forEach(doc => {
            const employeeData = doc.data();
            const department = employeeData.department || 'Unassigned';
            const employee = {
              id: doc.id,
              name: employeeData.name,
              email: employeeData.email,
              department,
            };
            fetchedEmployees.push(employee);
            if (!fetchedDepartments[department]) {
              fetchedDepartments[department] = [];
            }
            fetchedDepartments[department].push(employee);
          });
          setEmployees(fetchedEmployees);
          setDepartments(fetchedDepartments);
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


  console.log(showAddDailyAttendanceModal , "showAddDailyAttendanceModal")

  const handleEmployeeSelect = (employee, type) => {
    const settingsUpdater = type === 'daily' ? setDailySettings : setMeetingSettings;
    settingsUpdater(prev => {
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

  const handleSelectAllMembers = (type) => {
    const settingsUpdater = type === 'daily' ? setDailySettings : setMeetingSettings;
    settingsUpdater(prev => {
      const currentAttendeeIds = new Set((prev.attendees || []).map(a => a.id));
      const newAttendees = employees.filter(emp => !currentAttendeeIds.has(emp.id))
        .map(emp => ({
          id: emp.id,
          name: emp.name,
          email: emp.email
        }));

      return {
        ...prev,
        attendees: [...(prev.attendees || []), ...newAttendees]
      };
    });
    setSearchTerm('');
    setShowDropdown(false);
  };

  const removeAttendee = (employeeId, type) => {
    const settingsUpdater = type === 'daily' ? setDailySettings : setMeetingSettings;
    settingsUpdater(prev => ({
      ...prev,
      attendees: prev.attendees.filter(emp => emp.id !== employeeId)
    }));
  };

  const clearAllAttendees = (type) => {
    const settingsUpdater = type === 'daily' ? setDailySettings : setMeetingSettings;
    settingsUpdater(prev => ({
      ...prev,
      attendees: []
    }));
  };

  const handleDepartmentSelect = (departmentName, type) => {
    const settingsUpdater = type === 'daily' ? setDailySettings : setMeetingSettings;
    const members = departments[departmentName];
    if (!members) return;

    settingsUpdater(prev => {
        const currentAttendeeIds = new Set((prev.attendees || []).map(a => a.id));
        const newAttendees = members
            .filter(emp => !currentAttendeeIds.has(emp.id))
            .map(emp => ({ id: emp.id, name: emp.name, email: emp.email }));

        return {
            ...prev,
            attendees: [...(prev.attendees || []), ...newAttendees]
        };
    });
    setShowDropdown(false);
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

      if(leaveQuota === ""  || dailySettings.attendees?.length === 0  ){
        toast.error("Error", {
          description: "Please fill in all required fields",
          position: "top-right"
        });
        return;
      }

      if(carryForward)
      {
        if(maximumDaysCarryForward === "")
        {
          toast.error("Error", {
            description: "Please fill in all required fields",
            position: "top-right"
          });
        }
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
        attendees: dailySettings.attendees || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        leaveQuota: leaveQuota,
        carryForward: carryForward,
        maximumDaysCarryForward: maximumDaysCarryForward,
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

  const handleLocationSettingChange = (e) => {
    const { name, value } = e.target;
    setLocationSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationSettings((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
          setIsLocationVisible(true);
          toast.success("Location Fetched", {
            description: "Your current location has been set.",
            position: "top-right",
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast.error("Error Fetching Location", {
            description: `Could not get location: ${error.message}. Please enter manually.`,
            position: "top-right",
          });
        }
      );
    } else {
      toast.error("Geolocation Not Supported", {
        description: "Your browser does not support geolocation.",
        position: "top-right",
      });
    }
  };

  const handleSaveLocationSettings = async () => {
    if (
      !locationSettings.latitude ||
      !locationSettings.longitude ||
      !locationSettings.radius
    ) {
      toast.error("Missing Information", {
        description: "Please provide latitude, longitude, and radius.",
        position: "top-right",
      });
      return;
    }

    try {
      if (!adminUid) {
        throw new Error("Admin user not found.");
      }

      await setDoc(
        doc(db, "users", adminUid),
        {
          officeLocation: {
            latitude: parseFloat(locationSettings.latitude),
            longitude: parseFloat(locationSettings.longitude),
            radius: parseInt(locationSettings.radius, 10),
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast.success("Location Settings Saved", {
        description: "Office location and radius have been updated.",
        position: "top-right",
      });
    } catch (error) {
      console.error("Error saving location settings:", error);
      toast.error("Save Failed", {
        description:
          error.message || "Failed to save location settings.",
        position: "top-right",
      });
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match", {
        description: "Please ensure both passwords are the same.",
        position: "top-right",
      });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password is too weak", {
        description: "Password must be at least 6 characters long.",
        position: "top-right",
      });
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("No authenticated user found.");
      }

      const credential = EmailAuthProvider.credential(email, newPassword);
      await linkWithCredential(currentUser, credential);

      setNewPassword("");
      setConfirmPassword("");

      toast.success("Password Updated", {
        description: "You can now log in using your email and new password.",
        position: "top-right",
      });
    } catch (error) {
      console.error("Error updating password:", error);

      let description = "Failed to update password. Please try again.";
      if (error.code === 'auth/requires-recent-login') {
        description =
          "This is a sensitive operation. Please log out and log back in before updating your password.";
      } else if (error.code === 'auth/email-already-in-use' || error.code === 'auth/credential-already-in-use') {
        description = 
          "This email is already linked to another account. Please use a different email.";
      }

      toast.error("Update Failed", {
        description,
        position: "top-right",
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

  const initialActiveTab = () => {
    return showAddDailyAttendanceModal ? "dailyAttendance" : "scheduleMeetings";
  };

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
        value={showAddDailyAttendanceModal ? "dailyAttendance" : "scheduleMeetings"}
        onValueChange={(value) => {
          if (value === "dailyAttendance") {
            setShowAddDailyAttendanceModal(true);
          } else {
            setShowAddDailyAttendanceModal(false);
          }
        }}
        className="w-full"
      >
        <TabsList
          className={`grid w-full ${
            showAddDailyAttendanceModal && showAddMeetingModal
              ? "grid-cols-2"
              : "grid-cols-1"
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

                <div className="space-y-2 w-full relative">
                    <div className="flex items-center justify-between ">
                      <LabelSettings>Select Departments or Members</LabelSettings>
                      {dailySettings.attendees?.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => clearAllAttendees('daily')}
                          className="text-xs"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                    <div className="relative">
                      <InputSettings
                        placeholder="Search departments or employees..."
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
                            onClick={() => handleSelectAllMembers('daily')}
                          >
                            <Users className="mr-3 h-4 w-4 text-blue-600" />
                            <div>
                              <div className="font-medium text-blue-700">
                                Select All Members
                              </div>
                              <div className="text-xs text-blue-500">
                                Add all {employees.length} employees
                              </div>
                            </div>
                          </div>
                          
                          {/* Departments with Members */}
                          {Object.keys(departments)
                            .filter(deptName => 
                                deptName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                departments[deptName].some(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()))
                            )
                            .map(deptName => (
                                <div key={deptName} className="border-b">
                                    <div className="px-4 py-2 bg-gray-50 text-sm font-semibold text-gray-600 flex justify-between items-center">
                                        <span>{deptName}</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-auto px-2 py-1 text-xs"
                                            onClick={() => handleDepartmentSelect(deptName, 'daily')}
                                        >
                                            Add all
                                        </Button>
                                    </div>
                                    {departments[deptName]
                                        .filter(employee => !searchTerm || employee.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map(employee => {
                                        const isAlreadySelected = dailySettings.attendees?.some(a => a.id === employee.id);
                                        return (
                                            <div
                                            key={employee.id}
                                            className={`pl-8 pr-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center ${isAlreadySelected ? 'bg-green-50 text-green-700' : ''}`}
                                            onClick={() => handleEmployeeSelect(employee, 'daily')}
                                            >
                                            {employee.name}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                      )}
                    </div>
                    {/* Display selected members */}
                    {dailySettings.attendees?.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        {dailySettings.attendees.map((employee) => (
                          <div
                            key={employee.id}
                            className="flex items-center gap-2 bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full"
                          >
                            <span>{employee.name}</span>
                            <button
                              type="button"
                              onClick={() => removeAttendee(employee.id, 'daily')}
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

                <div className="grid grid-cols-1 gap-6">
          <div className="space-y-3">
            <LabelSettings 
              htmlFor="leaveQuota" 
              className="text-sm font-medium text-black"
            >
              Leave Quota (Annual Leave)
            </LabelSettings>
            <InputSettings
              id="leaveQuota"
              name="leaveQuota"
              value={leaveQuota}
              onChange={handleLeaveQuotaChange}
              type="text"
              placeholder="Enter leave quota (e.g., 12)"
              className="w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
            />
            <p className="text-xs text-gray-500">
              Specify the total number of leave days available.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <LabelSettings 
                  htmlFor="carryForward" 
                  className="text-sm font-medium text-gray-700"
                >
                  Carry Forward
                </LabelSettings>
                <p className="text-xs text-gray-500 mt-1">
                  Allow unused leave days to carry forward to the next month.
                </p>
              </div>
              <Switch
                id="carryForward"
                name="carryForward"
                checked={carryForward}
                onCheckedChange={handleCarryForwardChange}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full",
                  carryForward ? "bg-indigo-600" : "bg-gray-200"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition",
                    carryForward ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </Switch>

              
            </div>
            {carryForward && (
                <div className="flex flex-col  gap-2">
                <LabelSettings htmlFor="maximum_days_carry_forward">Maximum Days Carry Forward</LabelSettings>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum number of days that can be carried forward.
                </p>
                <InputSettings
                  id="maximum_days_carry_forward"
                  name="maximum_days_carry_forward"
                  type="text"
                  value={maximumDaysCarryForward}
                  placeholder="Enter maximum days carry forward (e.g., 5)"
                  onChange={(e) => {
                    if(e.target.value === ""){
                      setMaximumDaysCarryForward("0");
                    }else{
                      setMaximumDaysCarryForward(e.target.value);
                    }
                  }}
                />
                
              </div>
              )}
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
                          onClick={() => clearAllAttendees('meeting')}
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
                            onClick={() => handleSelectAllMembers('meeting')}
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
                                  onClick={() => handleEmployeeSelect(employee, 'meeting')}
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
                              onClick={() => removeAttendee(employee.id, 'meeting')}
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

      {/* Location Settings */}
      <CardSettings className="mt-6">
        <CardHeaderSettings>
          <CardTitleSettings>Location-Based Attendance</CardTitleSettings>
          <CardDescriptionSettings>
            Set the company's official location for geo-fenced check-ins.
          </CardDescriptionSettings>
        </CardHeaderSettings>
        <CardContentSettings className="space-y-6 pt-6">
          <div className="space-y-2">
            <LabelSettings className="text-base font-medium">
              Office Geolocation
            </LabelSettings>
            <div className="p-4 border rounded-md space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <LabelSettings htmlFor="latitude">Latitude</LabelSettings>
                  <InputSettings
                    id="latitude"
                    name="latitude"
                    value={locationSettings.latitude}
                    onChange={handleLocationSettingChange}
                    placeholder="e.g., 28.6139"
                  />
                </div>
                <div className="space-y-2">
                  <LabelSettings htmlFor="longitude">Longitude</LabelSettings>
                  <InputSettings
                    id="longitude"
                    name="longitude"
                    value={locationSettings.longitude}
                    onChange={handleLocationSettingChange}
                    placeholder="e.g., 77.2090"
                  />
                </div>
              </div>

           
              <MapLocationTracker 
              currentLocation={geoLocation}
              onLocationChange={handleLocationChange}
              isLoading={isLocationLoading}
            />
         

              
            </div>
          </div>

          <div className="space-y-2">
            <LabelSettings htmlFor="radius">
              Check-in Radius (in meters)
            </LabelSettings>
            <InputSettings
              id="radius"
              name="radius"
              type="number"
              value={locationSettings.radius}
              onChange={handleLocationSettingChange}
              placeholder="e.g., 50"
            />
            <p className="text-xs text-muted-foreground">
              This is the maximum distance from the office location within
              which an employee can check in.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <ButtonSettings onClick={handleSaveLocationSettings}>
              <Save className="mr-2 h-4 w-4" /> Save Location Settings
            </ButtonSettings>
          </div>
        </CardContentSettings>
      </CardSettings>


      {/* Password Settings */}
      <div>
          <h1 className="text-2xl font-semibold">Account Settings</h1>
          <p className="text-muted-foreground">
            Set your password to enable login via email.
          </p>
        </div>


      <CardSettings className="mt-6">
        <CardHeaderSettings>
          <CardTitleSettings>Password Settings</CardTitleSettings>
          <CardDescriptionSettings>
            Set or update your password to enable login via email.
          </CardDescriptionSettings>
        </CardHeaderSettings>
        <CardContentSettings className="space-y-6 pt-6">

          <div className="flex flex-col gap-4">
                <LabelSettings htmlFor="email">Email</LabelSettings>
                <InputSettings
                  id="email"
                  name="email"
                  type="email"
                  readOnly
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
            </div>
          <div className="space-y-2">
            <LabelSettings htmlFor="newPassword">New Password</LabelSettings>
            <InputSettings
              id="newPassword"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min. 6 characters)"
            />
          </div>
          <div className="space-y-2">
            <LabelSettings htmlFor="confirmPassword">
              Confirm Password
            </LabelSettings>
            <InputSettings
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <div className="flex justify-end pt-4">
            <ButtonSettings onClick={handleUpdatePassword}>
              <Save className="mr-2 h-4 w-4" /> Save Password
            </ButtonSettings>
          </div>
        </CardContentSettings>
      </CardSettings>

      

      
    </div>
  );
}