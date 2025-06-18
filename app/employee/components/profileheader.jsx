"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast as sonnerToast } from "sonner";
import {
  MoreVertical,
  Edit2,
  LogOut,
  CalendarDays,
  Briefcase,
  MapPin,
  ClockIcon,
  Loader2 as PageLoader,
  Edit,
  Check,
  PenLine,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/datepicker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, addDays, parse, differenceInMinutes } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

import DashboardWidget from "@/app/employee/components/dashboardwidget";
import { auth } from "@/app/firebase/config";
import { db } from "@/app/firebase/config";

import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  setDoc,
  serverTimestamp,
  limit,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import clsx from "clsx";

import { Label } from "@/components/ui/label";
import { Signature } from "lucide-react";

// DailyAttendance component (Check-in/Check-out)
export function DailyAttendance({
  onMarkSuccess,
  employeeId,
  currentLocation,
  user,
}) {
  const [isYetSet, setIsYetSet] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [attendanceId, setAttendanceId] = useState(null);
  const [attendanceType, setAttendanceType] = useState(""); // "check-in" or "check-out"
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [geoLocation, setGeoLocation] = useState(null);
  const [signature, setSignature] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isGettingAddress, setIsGettingAddress] = useState(false);
  const [attendanceSettings, setAttendanceSettings] = useState({
    workingHours: "09:00",
    earlyCheckInAllowed: 30,
    lateCheckInAllowed: 30,
    defaultStartTime: "09:00",
    checkInStartTime: "08:30",
    checkInEndTime: "10:00",
    checkOutStartTime: "17:00",
    checkOutEndTime: "18:30",
  });

  const [sampleData, setSampleData] = useState(null);
  const [checkinggg, setCheckinggg] = useState(null);
  const [checkAndStatus, setCheckAndStatus] = useState({
    checkInTime: null,
    checkOutTime: null,
    status: null,
  });

  const [locationSettings, setLocationSettings] = useState({
    latitude: null,
    longitude: null,
    radius: null,
  });

  const [wfhRequests, setWfhRequests] = useState([]);
  const [isWfhApproved, setIsWfhApproved] = useState(false);

  // Fetch attendance settings
  useEffect(() => {
    const fetchAttendanceSettings = async () => {
      if (!user?.phoneNumber) return;

      try {
        const phoneNumber = user.phoneNumber.slice(3);
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("phone", "==", phoneNumber));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) return;

        const userData = userSnapshot.docs[0].data();
        const adminUid = userData.adminuid;

        const q = query(collection(db, "users"), where("uid", "==", adminUid));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return;

        const adminData = snapshot.docs[0].data();

        const officeLocation = adminData.officeLocation;

        if (adminData.officeLocation) {
          setLocationSettings({
            latitude: officeLocation.latitude,
            longitude: officeLocation.longitude,
            radius: officeLocation.radius || 50,
          });
        }

        // Fetch daily attendance settings
        const dailySettingsRef = collection(db, "Daily_attendance");
        const dailySettingsQuery = query(
          dailySettingsRef,
          where("adminUid", "==", adminUid)
        );
        const dailySettingsSnapshot = await getDocs(dailySettingsQuery);

        if (dailySettingsSnapshot.empty) {
          setIsYetSet(true);
        }

        if (!dailySettingsSnapshot.empty) {
          const settings = dailySettingsSnapshot.docs[0].data();

          const currentDate = new Date();
          const currentDay = currentDate
            .toLocaleDateString("en-US", { weekday: "short" })
            .toLowerCase();
          const workingDay = settings.workingDays;

          console.log("workingDay", workingDay);

          const isTodayWorkingDay = workingDay[currentDay];
          console.log("isTodayWorkingDay", isTodayWorkingDay);

          if (!isTodayWorkingDay) {
            setIsYetSet(true);
          }

          setAttendanceSettings({
            workingHours: settings.workingHours || "09:00",
            earlyCheckInAllowed: settings.earlyCheckInAllowed || 30,
            lateCheckInAllowed: settings.lateCheckInAllowed || 30,
            defaultStartTime: settings.defaultStartTime || "09:00",
            checkInStartTime: settings.checkInStartTime || "08:30",
            checkInEndTime: settings.checkInEndTime || "10:00",
            checkOutStartTime: settings.checkOutStartTime || "17:00",
            checkOutEndTime: settings.checkOutEndTime || "18:30",
          });
        }
      } catch (error) {
        console.error("Error fetching attendance settings:", error);
      }
    };

    fetchAttendanceSettings();
  }, [user]);

  // Fetch attendance status on component mount
  useEffect(() => {
    const fetchTodayAttendance = async () => {
      if (!user?.phoneNumber) return;

      try {
        setIsLoadingAttendance(true);
        const phoneNumber = user.phoneNumber.slice(3);
        const dateToday = format(new Date(), "yyyy-MM-dd");

        // First get the user's employee ID
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("phone", "==", phoneNumber));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) return;

        const userData = userSnapshot.docs[0].data();
        const employeeId = userData.uid;

        console.log("Employee ID:", employeeId);

        // Now get today's attendance record
        const attendanceRef = collection(db, "attendance");
        const attendanceQuery = query(
          attendanceRef,
          where("employeeId", "==", employeeId),
          where("date", "==", dateToday),
          limit(1)
        );
        console.log("Attendance Query:", attendanceQuery);
        const attendanceSnapshot = await getDocs(attendanceQuery);

        if (!attendanceSnapshot.empty) {
          const attendanceData = attendanceSnapshot.docs[0].data();
          setAttendanceId(attendanceSnapshot.docs[0].id);
        }
        fetchCheckAndStatus(employeeId);
        checkWfhRequests(employeeId);
      } catch (error) {
        console.error("Error fetching attendance:", error);
      } finally {
        setIsLoadingAttendance(false);
      }
    };

    const fetchCheckAndStatus = async (employeeId) => {
      console.log("fetchCheckAndStatus started");

      console.log("employeeId", employeeId);

      try {
        const date_type = format(new Date(), "yyyy-MM-dd");
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("employeeId", "==", employeeId),
          where("date", "==", date_type)
        );

        const attendanceSnapshot = await getDocs(attendanceQuery);

        if (attendanceSnapshot.empty) {
          console.log("No attendance record found for today");
          return;
        }

        // Get the most recent attendance record
        const attendanceDoc = attendanceSnapshot.docs[0];
        const attendanceData = attendanceDoc.data();

        console.log("attendanceData", attendanceData);
        setCheckAndStatus({
          checkInTime: attendanceData.checkInTime,
          checkOutTime: attendanceData.checkOutTime,
          status: attendanceData.status,
        });

        if (attendanceData.checkInTime) {
          setIsCheckedIn(true);
          setStatus(attendanceData.status);
          if (attendanceData.checkOutTime) {
            setIsCheckedOut(true);
          }
        }

        // Check WFH requests after fetching attendance
       
      
        console.log("checkAndStatus", checkAndStatus);
      } catch (error) {
        console.error("Error fetching check and status:", error);
      }
    };

    const checkWfhRequests = async (employeeId) => {

      
      try {
        console.log("Checking WFH requests for employee:", employeeId);
        
        // Query WFH requests for this employee with approved status
        const wfhQuery = query(
          collection(db, "wfh_requests"),
          where("employeeId", "==", employeeId),
          where("status", "==", "approved")
        );
        
        const wfhSnapshot = await getDocs(wfhQuery);
        console.log("WFH requests found:", wfhSnapshot.docs.length);
        
        if (!wfhSnapshot.empty) {
          // Get all approved WFH requests
          const wfhRequestsData = wfhSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        
          console.log("wfhRequestsData new", wfhRequestsData);
          if(wfhRequestsData.length > 0){
            const approved = wfhRequestsData[0].status === "approved";
            setIsWfhApproved(true);
          }else{
            setIsWfhApproved(false);
          }
        }
      } catch (error) {
        console.error("Error checking WFH requests:", error);
        setIsWfhApproved(false);
        setWfhRequests([]);
      }
    };

    fetchTodayAttendance();

  }, [user]);

  console.log("isWfhApproved", isWfhApproved);

  // detect if user is in online or not
  // const isOnline = async () => {
  //   const user = auth.currentUser;
  //   const phone = user.phoneNumber.slice(3);
  //   const userQuery = query(collection(db, "users"), where("phone", "==", phone));
  //   const userSnapshot = await getDocs(userQuery);
  //   const userData = userSnapshot.docs[0].data();
  //   const adminUid = userData.adminuid;

  // }

  // Address Geocoding Service
  const getAddressFromCoordinates = async (latitude, longitude) => {
    const Maps_API_KEY = "AIzaSyCzXT9syu2xxdPCx5VLRWKmUvi4iuWZg4U"; // YOUR API KEY HERE

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${Maps_API_KEY}`
      );

      if (!response.ok) {
        throw new Error("Google Geocoding service unavailable.");
      }

      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const result = data.results[0]; // Get the most relevant result
        const addressComponents = result.address_components;

        // Helper to find a specific component type
        const findComponent = (types) => {
          const component = addressComponents.find((comp) =>
            types.some((type) => comp.types.includes(type))
          );
          return component ? component.long_name : "";
        };

        const fullAddress = result.formatted_address;
        const postcode = findComponent(["postal_code"]);
        const country = findComponent(["country"]);
        const state = findComponent(["administrative_area_level_1"]); // e.g., "California"
        const city = findComponent([
          "locality",
          "administrative_area_level_3",
          "administrative_area_level_2",
        ]); // e.g., "New York City", "County"
        const area = findComponent(["sublocality", "sublocality_level_1"]); // e.g., "Brooklyn" or a neighborhood
        const road = findComponent(["route"]); // Street name
        const houseNumber = findComponent(["street_number"]);

        // Construct a more structured formatted address for consistency, if needed
        const formatted = [road, houseNumber].filter(Boolean).join(" ").trim();
        const areaCityState = [area, city, state]
          .filter(Boolean)
          .join(", ")
          .trim();
        const finalFormatted = [formatted, areaCityState, postcode, country]
          .filter(Boolean)
          .join(", ")
          .trim()
          .replace(/,\s*,/g, ", ") // Remove double commas
          .replace(/^\s*,/, ""); // Remove leading comma if any

        return {
          fullAddress: fullAddress,
          area: area,
          city: city,
          state: state,
          country: country,
          postcode: postcode,
          road: road,
          houseNumber: houseNumber,
          formatted: finalFormatted, // A more robust formatted string
        };
      } else if (data.status === "ZERO_RESULTS") {
        // No results found for the given coordinates
        console.warn(
          "No address found for these coordinates using Google API."
        );
        return {
          fullAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          area: "No Area Found",
          city: "No City Found",
          state: "No State Found",
          country: "No Country Found",
          postcode: "",
          road: "",
          houseNumber: "",
          formatted: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        };
      } else {
        // Other API errors (e.g., OVER_QUERY_LIMIT, INVALID_REQUEST, etc.)
        throw new Error(
          `Google Geocoding API Error: ${data.status} - ${
            data.error_message || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error getting address from Google Maps API:", error);
      // Fallback to coordinates if API call fails
      return {
        fullAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        area: "Service Error",
        city: "Service Error",
        state: "Service Error",
        country: "Service Error",
        postcode: "",
        road: "",
        houseNumber: "",
        formatted: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      };
    }
  };

  // Alternative Google Maps Geocoding (if you have API key)
  const getAddressFromGoogleMaps = async (latitude, longitude, apiKey) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      );

      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        const result = data.results[0];
        const addressComponents = result.address_components;

        const getComponent = (types) => {
          const component = addressComponents.find((comp) =>
            types.some((type) => comp.types.includes(type))
          );
          return component ? component.long_name : "";
        };

        return {
          fullAddress: result.formatted_address,
          area: getComponent([
            "neighborhood",
            "sublocality",
            "sublocality_level_1",
          ]),
          city: getComponent(["locality", "administrative_area_level_2"]),
          state: getComponent(["administrative_area_level_1"]),
          country: getComponent(["country"]),
          postcode: getComponent(["postal_code"]),
          road: getComponent(["route"]),
          houseNumber: getComponent(["street_number"]),
          formatted: result.formatted_address,
        };
      }

      throw new Error("No results found");
    } catch (error) {
      console.error("Google Maps geocoding error:", error);
      throw error;
    }
  };

  // Update button states based on check-in/check-out status
  useEffect(() => {
    if (isCheckedIn && !isCheckedOut) {
      // User has checked in but not out
      setAttendanceType("check-out");
    } else if (!isCheckedIn) {
      // User hasn't checked in today
      setAttendanceType("check-in");
    } else {
      // User has completed check-in and check-out for today
      setAttendanceType("");
    }
  }, [isCheckedIn, isCheckedOut]);

  // Disable buttons while loading
  const isButtonDisabled = isLoading || isLoadingAttendance;

  const openCheckInDialog = () => {
    setAttendanceType("check-in");
    setIsDialogOpen(true);
  };

  const openCheckOutDialog = () => {
    setAttendanceType("check-out");
    setIsDialogOpen(true);
  };

  // Haversine formula to calculate distance between two points in meters
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    console.log("distance", R * c);
    return R * c; // Distance in meters
  };

  // isLateCheckIn: True if check-in is after the official start time + grace period.
  const isLateCheckIn = (time) => {
    if (!attendanceSettings.defaultStartTime) return false;

    const defaultTime = attendanceSettings.defaultStartTime;
    const convertDefaultTime = parse(defaultTime, "HH:mm", new Date());
    const actualCheckIn = parse(time, "HH:mm", new Date());

    const diff = differenceInMinutes(actualCheckIn, convertDefaultTime);

    // a positive diff means check-in is after default time, hence late
    console.log("diff", diff);
    return diff > (attendanceSettings.lateCheckInAllowed || 0);
  };

  // isEarlyCheckIn: True if check-in is before the official start time - grace period.
  const isEarlyCheckIn = (time) => {
    if (!attendanceSettings.defaultStartTime) return false;

    const defaultStartTime = parse(
      attendanceSettings.defaultStartTime,
      "HH:mm",
      new Date()
    );
    const actualCheckIn = parse(time, "HH:mm", new Date());
    const diff = differenceInMinutes(defaultStartTime, actualCheckIn);

    return diff > 0 && diff > attendanceSettings.earlyCheckInAllowed;
  };

  console.log("checkinggg", checkinggg);
  const isAbsent = (time) => {
    const checkInEndTime = parse(
      attendanceSettings.checkInEndTime,
      "HH:mm",
      new Date()
    );
    const currentTime = parse(time, "HH:mm", new Date());
    return currentTime > checkInEndTime;
  };

  const handleCheckIn = async () => {
    // Validate signature
    if (!signature) {
      sonnerToast.error("Signature Required", {
        description:
          "Please provide your digital signature before marking attendance.",
      });
      return;
    }

    if (!isWfhApproved && !geoLocation) {
      sonnerToast.error("WFH Approved", {
        description: "You are not allowed to check-in from office.",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (!user || !user.phoneNumber) {
        throw new Error("User not authenticated or phone number not available");
      }

      // const phoneNumber = user.phoneNumber.slice(3);
      // const dateToday = format(new Date(), "yyyy-MM-dd");
      // const now = new Date();
      // const nowTime = format(now, "hh:mm a");

      // const defaultStartTime = parse(
      //   attendanceSettings.defaultStartTime,
      //   "HH:mm",
      //   new Date()
      // );
      // const diffInMinutes = differenceInMinutes(now, defaultStartTime);

      // let statusToSave = "present";
      // if (isAbsent(nowTime)) {
      //   statusToSave = "absent";
      // } else if (diffInMinutes > (attendanceSettings.lateCheckInAllowed || 0)) {
      //   statusToSave = "late";
      // } else if (diffInMinutes < -(attendanceSettings.earlyCheckInAllowed || 0)) {
      //   statusToSave = "early";
      // }

      // const isLate = statusToSave === "late";
      // const isEarly = statusToSave === "early";

      try {
        const distance = calculateDistance(
          locationSettings.latitude,
          locationSettings.longitude,
          geoLocation.latitude,
          geoLocation.longitude
        );
        console.log("distance office", locationSettings.radius);
        if (distance > locationSettings.radius) {
          sonnerToast.error("Check-in Failed", {
            description: "You are not in the office location.",
          });
          return;
        }
      } catch (error) {
        sonnerToast.error("Check-in Failed", {
          description:
            error.message || "Failed to process check-in. Please try again.",
        });
        return;
      }

      const phoneNumber = user.phoneNumber.slice(3);
      const dateToday = format(new Date(), "yyyy-MM-dd");

      const nowTime = format(new Date(), "HH:mm");
      const isLate = isLateCheckIn(nowTime);

      const isAbsent_ = isAbsent(nowTime);

      // Query the users collection to find the user document
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phone", "==", phoneNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("User not found.");
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      const Statuss = isLate ? "late" : "present";
      const absentStatus = isAbsent_ && "absent";

      // Create new attendance document in 'attendance' collection
      const attendanceRecord = {
        employeeId: userData.uid,
        adminUid: userData.adminuid,
        date: dateToday,
        checkInTime: nowTime,
        checkOutTime: null,
        status: Statuss || absentStatus,
        location: currentLocation || "Office Geo",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lateCheckIn: isLate,
        signature: signature,
        address:
          geoLocation?.formattedAddress ||
          geoLocation?.address ||
          currentLocation ||
          "Office Geo",
        area: geoLocation?.area || "Unknown Area",
        city: geoLocation?.city || "Unknown City",
        state: geoLocation?.state || "Unknown State",
        country: geoLocation?.country || "Unknown Country",
        fullAddress: geoLocation?.fullAddress || currentLocation,
        addressInfo: geoLocation?.addressInfo || null,
        timestamp: Timestamp.now(),
      };

      await addDoc(collection(db, "attendance"), attendanceRecord);

      setIsCheckedIn(true);
      setStatus(Statuss);
      onMarkSuccess("Checked In");
      // const statusMessage = isEarly ? "Early" : isLate ? "Late" : "On time";
      const statusMessage = Statuss === "late" ? "Late" : "On time";
      sonnerToast.success(`Checked In Successfully! (${statusMessage})`, {
        description: `Time: ${nowTime}, Location: ${
          currentLocation || "Office Geo"
        }`,
      });
    } catch (error) {
      console.error("Error during check-in:", error);
      sonnerToast.error("Check-in Failed", {
        description:
          error.message || "Failed to process check-in. Please try again.",
      });
    } finally {
      setIsLoading(false);
      closeDialogAfterDelay();
    }
  };

  const closeDialogAfterDelay = () => {
    setTimeout(() => {
      setIsLoading(false);
      setIsDialogOpen(false);
    }, 1000);
  };

  const handleCheckOut = async () => {
    setIsLoading(true);

    try {
      if (!user || !user.phoneNumber) {
        throw new Error("User not authenticated or phone number not available");
      }

      const nowTime = format(new Date(), "HH:mm");
      const phoneNumber = user.phoneNumber.slice(3);
      const dateToday = format(new Date(), "yyyy-MM-dd");

      // Query the users collection to find the user document
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phone", "==", phoneNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("User not found in database");
      }

      // Get the user document reference and data
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // Find the most recent attendance record for today that doesn't have a check-out time
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("employeeId", "==", userData.uid),
        where("date", "==", dateToday)
      );

      const attendanceSnapshot = await getDocs(attendanceQuery);

      if (attendanceSnapshot.empty) {
        throw new Error("No active check-in found for today");
      }

      // Get the first matching attendance record (should be the most recent check-in)
      const attendanceDoc = attendanceSnapshot.docs[0];
      const attendanceRef = doc(db, "attendance", attendanceDoc.id);

      // Update the attendance record with check-out time
      await updateDoc(attendanceRef, {
        checkOutTime: nowTime,
        updatedAt: serverTimestamp(),
        timestamp: Timestamp.now(),
        purpose: "Checked out",
      });

      setIsCheckedOut(true);
      onMarkSuccess("Checked Out");
      sonnerToast.success("Checked Out Successfully!", {
        description: `Time: ${nowTime}, Location: ${
          currentLocation || "Office Geo"
        }`,
      });
    } catch (error) {
      console.error("Error during check-out:", error);
      sonnerToast.error("Check-out Failed", {
        description:
          error.message || "Failed to process check-out. Please try again.",
      });
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
    }
  };

  const SignatureCanvas = ({
    onSignatureChange,
    signature,
    disabled = false,
  }) => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [canvasRef, setCanvasRef] = useState(null);
    const [ctx, setCtx] = useState(null);

    useEffect(() => {
      if (canvasRef) {
        const context = canvasRef.getContext("2d");
        context.strokeStyle = "#000";
        context.lineWidth = 2;
        context.lineCap = "round";
        setCtx(context);
      }
    }, [canvasRef]);

    // Effect to draw the signature from data URL when the component re-renders
    useEffect(() => {
      if (ctx && signature) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = signature;
      } else if (ctx) {
        // If signature is cleared, ensure canvas is blank
        ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
      }
    }, [signature, ctx]); // Re-run when signature or canvas context changes

    const startDrawing = (e) => {
      if (disabled) return;
      setIsDrawing(true);
      const rect = canvasRef.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e) => {
      if (!isDrawing || disabled) return;
      const rect = canvasRef.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      if (!isDrawing || disabled) return;
      setIsDrawing(false);
      const dataURL = canvasRef.toDataURL();
      onSignatureChange(dataURL);
    };

    const clearSignature = () => {
      if (disabled) return;
      ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
      onSignatureChange("");
    };

    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Signature className="h-4 w-4" />
          Digital Signature
        </Label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-2">
          <canvas
            ref={setCanvasRef}
            width={280}
            height={120}
            className="w-full h-[120px] bg-white rounded cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{ touchAction: "none" }}
          />
        </div>
        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            disabled={disabled}
          >
            Clear Signature
          </Button>
          <span className="text-xs text-muted-foreground">
            {signature ? "✓ Signature captured" : "Please sign above"}
          </span>
        </div>
      </div>
    );
  };

  const MapLocationTracker = ({
    onLocationChange,
    currentLocation,
    isLoading,
  }) => {
    const [locationError, setLocationError] = useState("");
    const [isWatching, setIsWatching] = useState(false);
    const [watchId, setWatchId] = useState(null);

    const processLocationWithAddress = async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      setIsGettingAddress(true);

      try {
        const addressInfo = await getAddressFromCoordinates(
          latitude,
          longitude
        );

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
          formattedAddress: addressInfo.formatted,
        };

        setLocationError("");
        onLocationChange(locationData);
      } catch (error) {
        console.error("Error processing location:", error);
        // Fallback to coordinates only
        onLocationChange({
          latitude,
          longitude,
          accuracy,
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          timestamp: new Date().toLocaleTimeString(),
          area: "Unknown Area",
          city: "Unknown City",
          state: "Unknown State",
          country: "Unknown Country",
          fullAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        });
      } finally {
        setIsGettingAddress(false);
      }
    };

    const startLocationTracking = () => {
      if (!navigator.geolocation) {
        setLocationError("Geolocation is not supported by this browser");
        return;
      }

      setIsWatching(true);

      const id = navigator.geolocation.watchPosition(
        processLocationWithAddress,
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocationError("Location access denied by user");
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationError("Location information is unavailable");
              break;
            case error.TIMEOUT:
              setLocationError("Location request timed out");
              break;
            default:
              setLocationError("An unknown error occurred");
              break;
          }
          setIsWatching(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
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
        setLocationError("Geolocation is not supported by this browser");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        processLocationWithAddress,
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocationError("Location access denied by user");
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationError("Location information is unavailable");
              break;
            case error.TIMEOUT:
              setLocationError("Location request timed out");
              break;
            default:
              setLocationError("An unknown error occurred");
              break;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        }
      );
    };

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
            {isLoading || isGettingAddress ? (
              <PageLoader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="mr-2 h-4 w-4" />
            )}
            {isGettingAddress ? "Getting Address..." : "Get Location"}
          </Button>

          <Button
            type="button"
            variant={isWatching ? "destructive" : "default"}
            size="sm"
            onClick={isWatching ? stopLocationTracking : startLocationTracking}
            disabled={isLoading || isGettingAddress}
          >
            {isWatching ? "Stop Tracking" : "Live Track"}
          </Button>
        </div>

        {/* Map Container */}
        {currentLocation && (
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-2 text-xs text-gray-600 flex justify-between items-center">
              <span>Live Location Map</span>
              {(isWatching || isGettingAddress) && (
                <span className="flex items-center gap-1 text-green-600">
                  <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></div>
                  {isGettingAddress ? "Getting Address..." : "Tracking"}
                </span>
              )}
            </div>

            {/* Interactive Map Iframe */}
            <iframe
              src={`https://maps.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              width="100%"
              height="200"
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
                    <div className="font-medium text-blue-800 mb-1">
                      📍 Address:
                    </div>
                    <div className="text-blue-700 text-xs">
                      {currentLocation.formattedAddress}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {currentLocation.area && (
                    <div>
                      <span className="text-gray-600 font-medium">Area:</span>
                      <div className="text-green-600 text-xs">
                        {currentLocation.area}
                      </div>
                    </div>
                  )}
                  {currentLocation.city && (
                    <div>
                      <span className="text-gray-600 font-medium">City:</span>
                      <div className="text-green-600 text-xs">
                        {currentLocation.city}
                      </div>
                    </div>
                  )}
                  {currentLocation.state && (
                    <div>
                      <span className="text-gray-600 font-medium">State:</span>
                      <div className="text-green-600 text-xs">
                        {currentLocation.state}
                      </div>
                    </div>
                  )}
                  {currentLocation.country && (
                    <div>
                      <span className="text-gray-600 font-medium">
                        Country:
                      </span>
                      <div className="text-green-600 text-xs">
                        {currentLocation.country}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Coordinates:</span>
                    <span className="font-mono text-xs">
                      {currentLocation.address}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Accuracy:</span>
                    <span className="text-green-600">
                      ±{Math.round(currentLocation.accuracy || 0)}m
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Last Update:</span>
                    <span className="text-blue-600">
                      {currentLocation.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {!currentLocation && !locationError && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="text-blue-800">
              📍 Click "Get Location" or "Live Track" to capture your current
              position and address
            </p>
          </div>
        )}

        {locationError && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
            <p className="text-red-800">❌ {locationError}</p>
          </div>
        )}
      </div>
    );
  };

  const handleLocationChange = (location) => {
    setIsLocationLoading(false);
    setGeoLocation(location);
  };

  return (
    <div className="space-y-3 self-center">
      {!isYetSet && (
        <div>
          <p className="text-sm text-muted-foreground font-semibold">
            Log your daily start and end times.
          </p>
          {!isCheckedIn && (
            <Button
              onClick={openCheckInDialog}
              disabled={isLoading || isCheckedOut}
              className="w-full sm:w-auto bg-green-500 hover:bg-green-600"
            >
              {isLoading ? (
                <PageLoader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Check-in"
              )}
            </Button>
          )}
          {isCheckedIn && !isCheckedOut && (
            <Button
              onClick={openCheckOutDialog}
              disabled={isLoading}
              className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600"
            >
              {isLoading ? (
                <PageLoader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Check-out"
              )}
            </Button>
          )}
          {isCheckedIn && isCheckedOut && (
            <Button disabled className="w-full sm:w-auto bg-slate-400">
              Attendance Marked for Today
            </Button>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {attendanceType === "check-in" ? "Check In" : "Check Out"}
            </DialogTitle>
            <DialogDescription>
              Please provide your signature and location to confirm your
              attendance for this meeting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2 px-5">
            <div>
              <div className="flex gap-4">
                <Label className="text-sm font-semibold">Current Time</Label>
                <p className="text-sm font-semibold">
                  {format(currentTime, "hh:mm a")}
                </p>
              </div>
              <div className="flex gap-4">
                <Label className="text-sm font-semibold">Current Date</Label>
                <p className="text-sm font-semibold">
                  {format(currentTime, "yyyy-MM-dd")}
                </p>
              </div>
            </div>

            {/* Signature Canvas */}
            <SignatureCanvas
              signature={signature}
              onSignatureChange={setSignature}
              disabled={isLoading}
            />

            {/* Enhanced Map Location Tracker */}

            {!isWfhApproved && (
              <MapLocationTracker
                currentLocation={geoLocation}
                onLocationChange={handleLocationChange}
                isLoading={isLocationLoading}
              />
            )}
          </div>

          <DialogFooter className="sm:justify-start">
            <Button
              onClick={
                attendanceType === "check-in" ? handleCheckIn : handleCheckOut
              }
              disabled={isLoading || !signature || !geoLocation}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isLoading ? (
                <PageLoader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Confirm & Mark"
              )}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isCheckedIn && !isCheckedOut && (
        <p className="text-xs text-green-600">You are currently checked in.</p>
      )}
    </div>
  );
}
