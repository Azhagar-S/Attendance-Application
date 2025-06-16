'use client'
import { useState , useEffect } from 'react';
import { toast as sonnerToast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Loader2 as PageLoader, MapPin, Signature } from 'lucide-react';
import { format, formatDate } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check } from 'lucide-react';
import DashboardWidget from './dashboardwidget';
import { auth } from '@/app/firebase/config';
import { collection, query, where, getDocs, doc, orderBy , serverTimestamp , setDoc, Timestamp, limit  } from "firebase/firestore";
import { db } from '@/app/firebase/config';
import { parse , differenceInMinutes } from 'date-fns';

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
      const formatted = [road, houseNumber]
        .filter(Boolean)
        .join(" ")
        .trim();
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
      console.warn("No address found for these coordinates using Google API.");
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
      throw new Error(`Google Geocoding API Error: ${data.status} - ${data.error_message || "Unknown error"}`);
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
    
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const addressComponents = result.address_components;
      
      const getComponent = (types) => {
        const component = addressComponents.find(comp => 
          types.some(type => comp.types.includes(type))
        );
        return component ? component.long_name : '';
      };
      
      return {
        fullAddress: result.formatted_address,
        area: getComponent(['neighborhood', 'sublocality', 'sublocality_level_1']),
        city: getComponent(['locality', 'administrative_area_level_2']),
        state: getComponent(['administrative_area_level_1']),
        country: getComponent(['country']),
        postcode: getComponent(['postal_code']),
        road: getComponent(['route']),
        houseNumber: getComponent(['street_number']),
        formatted: result.formatted_address
      };
    }
    
    throw new Error('No results found');
  } catch (error) {
    console.error('Google Maps geocoding error:', error);
    throw error;
  }
};

// Signature Canvas Component
const SignatureCanvas = ({ onSignatureChange, signature, disabled = false }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasRef, setCanvasRef] = useState(null);
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    if (canvasRef) {
      const context = canvasRef.getContext('2d');
      context.strokeStyle = '#000';
      context.lineWidth = 2;
      context.lineCap = 'round';
      setCtx(context);
    }
  }, [canvasRef]);

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
    onSignatureChange('');
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
          style={{ touchAction: 'none' }}
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
          {signature ? '✓ Signature captured' : 'Please sign above'}
        </span>
      </div>
    </div>
  );
};

// Enhanced Real-time Map Location Component
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
                {isGettingAddress ? 'Getting Address...' : 'Tracking'}
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
                  <div className="font-medium text-blue-800 mb-1">📍 Address:</div>
                  <div className="text-blue-700 text-xs">{currentLocation.formattedAddress}</div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2">
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
              </div>
              
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Coordinates:</span>
                  <span className="font-mono text-xs">{currentLocation.address}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Accuracy:</span>
                  <span className="text-green-600">±{Math.round(currentLocation.accuracy || 0)}m</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Last Update:</span>
                  <span className="text-blue-600">{currentLocation.timestamp}</span>
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
            📍 Click "Get Location" or "Live Track" to capture your current position and address
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

export default function Meetingattendance({ onMarkSuccess, currentLocation }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isMarkAttendanceDialogOpen, setIsMarkAttendanceDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [signature, setSignature] = useState('');
  const [geoLocation, setGeoLocation] = useState(null);
  const [attendanceId, setAttendanceId] = useState(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [user, setUser] = useState(null);

  const [locationSettings, setLocationSettings] = useState({
    latitude: null,
    longitude: null,
    radius: null,
  });

  const [realAbsent, setRealAbsent] = useState(false);

  const [currentTime , setCurrentTime] = useState(new Date());
  

  useEffect(()=>{
    setTimeout(()=>{
      setCurrentTime(new Date());
    },1000)
  },[currentTime])

  const [currentDateTime, setCurrentDateTime] = useState({
    date: new Date(),
    time: new Date().toLocaleTimeString()
  });

  const [checkInTime, setCheckInTime] = useState(null);
  const [status__, setStatus__] = useState(null);

  const [tempData , setTempData] = useState(null);

  const [checkAndStatus, setCheckAndStatus] = useState([{
    checkInTime: "",
    status: ""  
  }]);

  // Mock upcoming meetings for today
  const [todaysMeetings, setTodaysMeetings] = useState([]);

  useEffect(()=>{
    const fetchMeetings = async () => {
      try {
        const isUser = auth.currentUser;
        if (!isUser) {
          console.error('No user is logged in');
          return;
        }
        setUser(isUser);
        console.log('User phone:', isUser.phoneNumber);
        const phone = isUser.phoneNumber.slice(3);
    
        // Fetch adminId and employeeId
        const userQuery = query(
          collection(db, 'users'),
          where('phone', '==', phone)
        );
        const userSnapshot = await getDocs(userQuery);
    
        if (userSnapshot.empty) {
          console.error('No user found for phone:', phone);
          setTodaysMeetings([]);
          return;
        }
    
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();
        const admin_uid = userData.adminuid;
        const employeeId = userData.uid;
    
        console.log('employeeId in meetingattendance:', employeeId);
        console.log('admin_uid in meetingattendance:', admin_uid);
    
        const date_type = format(new Date(), 'yyyy-MM-dd');
        // Query meetings for adminUid and date
        const q = query(
          collection(db, 'Meetings'),
          where('adminUid', '==', admin_uid),
          where('meetingDate', '==', date_type)
        );
        const querySnapshot = await getDocs(q);
    
        // Filter meetings where employeeId is in attendees
        const meetings = querySnapshot.docs
          .map((doc) => {
            const data = doc.data();
            const matchingAttendees = (data.attendees || []).filter(
              (attendee) => attendee.id === employeeId
            );
            if (matchingAttendees.length > 0) {
              return {
                id: doc.id,
                ...data,
                attended: matchingAttendees[0].attendanceStatus === 'attended', // Use status from attendee object
              };
            }
            return null;
          })
          .filter((meeting) => meeting !== null); // Remove non-matching meetings
    
        console.log('Meetings:', meetings);
        setTodaysMeetings(meetings);
    
        // Call fetchCheckAndStatus (assuming it handles additional attendance logic)
        fetchCheckAndStatus(employeeId);
        fetchLocationSettings(admin_uid);
      } catch (error) {
        console.error('Error fetching meetings:', error);
        setTodaysMeetings([]); // Clear meetings on error
      }
    };
    fetchMeetings();

    const fetchCheckAndStatus = async (employeeId) => {
      try {
        const date_type = format(new Date(), "yyyy-MM-dd");
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("employeeId", "==", employeeId),
          where("date", "==", date_type),
        );

        if(attendanceQuery.empty){
          setRealAbsent(true);
        }
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceRecords = [];
        attendanceSnapshot.forEach((doc) => {
          const data = doc.data();
          attendanceRecords.push({
            meetingId: data.meetingId || "", // Ensure meetingId is stored in attendance
            checkInTime: data.meetingTime,
            status: data.status
          });
        });
        setCheckAndStatus(attendanceRecords); // Store array of attendance records
      } catch (error) {
        console.error("Error fetching check and status:", error);
      }
    };


    const fetchLocationSettings = async (admin_uid) => {
      const q = query(collection(db, "users"), where("uid", "==", admin_uid));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;
      const adminData = snapshot.docs[0].data();
      console.log("adminData", adminData);
      const officeLocation = adminData.officeLocation;
      setLocationSettings({
        latitude: officeLocation.latitude,
        longitude: officeLocation.longitude,
        radius: officeLocation.radius || 50,
      });
    }
    
  },[])

  const isLateCheckIn = (time) => {
       const meeting = todaysMeetings.find(m => m.id === selectedMeeting.id);
       const earlyCheckInAllowed = meeting.earlyCheckInAllowed;
       const lateCheckInAllowed = meeting.lateCheckInAllowed;
       const meetingTime = meeting.meetingTime;

       const convertMeetingTime = parse(meetingTime, "HH:mm", new Date());
       const actualCheckIn = parse(time, "HH:mm", new Date());
       const diff = differenceInMinutes(actualCheckIn, convertMeetingTime);
       console.log("diff", diff)
       return diff > (earlyCheckInAllowed || 0);


      // const shiftStart = parse("09:00", "HH:mm", new Date());
      // const actualCheckIn = parse(time, "hh:mm a", new Date());
  
      // const diff = differenceInMinutes(actualCheckIn, shiftStart);
      // return diff > 30;
    };



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
  
      console.log("distance", R * c)
      return R * c; // Distance in meters
    };




  const handleCheckIn = async () => {
    setIsLoading(true);


    
  
    try { 
      const phoneNumber = user.phoneNumber.slice(3);
      const dateToday = format(new Date(), "yyyy-MM-dd");
      const nowTime = format(new Date(), "hh:mm");

      const isLate = isLateCheckIn(nowTime);

      console.log("isLate--->",isLate);

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

      

      // Create new attendance document in 'attendance' collection
      const newAttendanceRef = doc(collection(db, "attendance"));
      const Statuss = isLate ? "late" : "present";
      
      // Enhanced location data with address information
      const locationString = geoLocation ? `${geoLocation.latitude}, ${geoLocation.longitude}` : currentLocation || "Office Geo";
      
      const newEntry = {
        uid: newAttendanceRef.id,
        employeeId: userData.uid,
        adminUid: userData.adminuid,
        meetingId: selectedMeeting?.id || "", // Add meetingId to attendance record
        date: dateToday,
        checkInTime: nowTime,
        name: userData.name,
        status: Statuss,
        location: locationString,
        signature: signature,
        address: geoLocation?.formattedAddress || geoLocation?.address || currentLocation || "Office Geo",
        area: geoLocation?.area || "Unknown Area",
        city: geoLocation?.city || "Unknown City",
        state: geoLocation?.state || "Unknown State",
        country: geoLocation?.country || "Unknown Country",
        fullAddress: geoLocation?.fullAddress || locationString,
        addressInfo: geoLocation?.addressInfo || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        timestamp: Timestamp.now(),
        purpose: "Meeting Attendance"
      };

      // Save the new attendance record
      await setDoc(newAttendanceRef, newEntry);
      
      // Store the attendance ID in state for check-out
      setAttendanceId(newAttendanceRef.id);

      setIsCheckedIn(true);
      onMarkSuccess("Meeting Attendance Marked");
      sonnerToast.success("Meeting Attendance Marked Successfully!", {
        description: `Time: ${nowTime}, Location: ${geoLocation?.area || 'Office'}, ${geoLocation?.city || 'Unknown City'}`,
      });
    } catch (error) {
      console.error("Error during check-in:", error);
      sonnerToast.error("Attendance Marking Failed", {
        description: error.message || "Failed to mark attendance. Please try again.",
      });
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
    }
  };

  const openMarkAttendanceDialog = (meeting) => {
    setSelectedMeeting(meeting);
    setSignature('');
    setGeoLocation(null);
    setIsMarkAttendanceDialogOpen(true);
  };

  const handleConfirmMeetingAttendance = async () => {
    if (!selectedMeeting) return;
    
    // Validate signature
    if (!signature) {
      sonnerToast.error("Signature Required", {
        description: "Please provide your digital signature before marking attendance.",
      });
      return;
    }

    // Validate location
    if (!geoLocation) {
      sonnerToast.error("Location Required", {
        description: "Please capture your current location before marking attendance.",
      });
      return;
    }

    

    setIsLoading(true);

    try {

      const distance = calculateDistance(locationSettings.latitude, locationSettings.longitude, geoLocation.latitude, geoLocation.longitude);

      if (distance > locationSettings.radius) {


       sonnerToast.error("Check-in Failed", {
         description:
           "You are not in the office location.",
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

   
    await handleCheckIn();
    
    try {
      const date_type = format(new Date(), "yyyy-MM-dd");
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("employeeId", "==", user?.uid),
        where("date", "==", date_type),
        where("meetingId", "==", selectedMeeting.id)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      let checkInTime = "";
      attendanceSnapshot.forEach((doc) => {
        const attendanceData = doc.data();
        checkInTime = attendanceData.checkInTime;
      });
      
      setTodaysMeetings(prev => prev.map(m => 
        m.id === selectedMeeting.id ? { ...m, attended: true, checkInTime } : m
      ));
      setCheckAndStatus(prev => [
        ...prev,
        { meetingId: selectedMeeting.id, checkInTime, status: isLateCheckIn(checkInTime) ? "late" : "present" }
      ]);
      
      sonnerToast.success("Meeting Attendance Marked!", { 
        description: `For: ${selectedMeeting.meetingTitle} at ${checkInTime} - ${geoLocation?.area}, ${geoLocation?.city}` 
      });
      onMarkSuccess(`Marked for: ${selectedMeeting.meetingTitle}`);
      setIsLoading(false);
      setIsMarkAttendanceDialogOpen(false);
    } catch (error) {
      console.error("Error updating meeting with check-in time:", error);
      setIsLoading(false);
      setIsMarkAttendanceDialogOpen(false);
    }
  };

  const handleLocationChange = (location) => {
    setIsLocationLoading(false);
    setGeoLocation(location);
  };

  const activeMeetings = todaysMeetings.filter(m => !m.attended);

  if (activeMeetings.length === 0 && todaysMeetings.length > 0) {
    return <p className="text-sm text-green-600">All scheduled meetings for today attended!</p>;
  }
  
  if (todaysMeetings.length === 0) {
    return <p className="text-sm text-muted-foreground">No meetings scheduled for you today.</p>;
  }


  if(checkInTime){
       console.log("today meetings last one",checkInTime);
   }

  return (
    <div className="space-y-4 self-center">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground font-semibold">Select a meeting to mark your attendance.</p>
        {activeMeetings.map((meeting, index) => {
      const attendance = checkAndStatus.find(record => record.meetingId === meeting.id);
  return (
    <Card key={meeting.id} className="p-3">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-semibold">{meeting.meetingTitle}</p>
          <p className="text-xs text-muted-foreground">Date: {format(new Date(meeting.meetingDate), "MMM dd, yyyy")} - Time: {meeting.meetingTime}</p>
        </div>
        {attendance?.checkInTime ? (
          <Button size="sm" variant="outline" className="hover:pointer-events-none">
            <Check className="mr-2 h-4 w-4" /> 
            {`Marked ${attendance.checkInTime}`}
          </Button>
        ) : (
          <Button onClick={() => openMarkAttendanceDialog(meeting)} size="sm" variant="outline">
            <Check className="mr-2 h-4 w-4" /> 
            {`Mark Attendance`}
          </Button>
        )}
      </div>
    </Card>
  );
})}
      </div>
      
      {/* Mark Attendance Dialog */}
      <Dialog open={isMarkAttendanceDialogOpen} onOpenChange={setIsMarkAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mark Attendance: {selectedMeeting?.meetingTitle}</DialogTitle>
            <DialogDescription>
              Please provide your signature and location to confirm your attendance for this meeting.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-2 px-5">
            <div>
              <div className='flex gap-4'>
              <Label className="text-sm font-semibold">Current Time</Label>
              <p className="text-sm font-semibold">{format(currentTime, "hh:mm a")}</p>
              </div>
              <div className='flex gap-4'>
              <Label className="text-sm font-semibold">Current Date</Label>
              <p className="text-sm font-semibold">{format(currentTime, "yyyy-MM-dd")}</p>
              </div>
            </div>
           
            {/* Signature Canvas */}
            <SignatureCanvas 
              signature={signature}
              onSignatureChange={setSignature}
              disabled={isLoading}
            />
            
            {/* Enhanced Map Location Tracker */}
            <MapLocationTracker 
              currentLocation={geoLocation}
              onLocationChange={handleLocationChange}
              isLoading={isLocationLoading}
            />
          </div>
          
          <DialogFooter className="sm:justify-start">
            <Button 
              onClick={handleConfirmMeetingAttendance} 
              disabled={isLoading || !signature || !geoLocation} 
              className="bg-blue-500 hover:bg-blue-600"
            >
              {isLoading ? <PageLoader className="mr-2 h-4 w-4 animate-spin" /> : "Confirm & Mark"}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}