// components/CreateAdminForm.jsx
"use client";

import { useState , useEffect} from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { UserPlus } from "lucide-react"; // Icon
import { setDoc, doc, collection, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { auth } from "@/app/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getDocs, query, where } from "firebase/firestore";


 
export function CreateAdminForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [attendanceMethod, setAttendanceMethod] = useState("Daily Attendance"); // Default value
  const [isLoading, setIsLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isuser , setUser] = useState(null);
  const [phone , setPhone] = useState("");
  const router = useRouter();
   

    //Get current user
 


   useEffect(() => {
         const unsubscribe = onAuthStateChanged(auth, async(currentUser) => {
          console.log(currentUser);
           if (currentUser) {
             setUser(currentUser);
             // Safely extract phone number with error handling
             console.log(currentUser);
             if (currentUser.phoneNumber) {
               setPhone(currentUser.phoneNumber.slice(3));

            } else {
               console.error("No phone number found for user");
               toast.error("No phone number associated with your account");
               router.push('/login');
             }
           } else {
             setUser(null);
             router.push('/login');
           }
           setCheckingStatus(false);
         });
   
         return () => unsubscribe();
       }, [router]); // Add router to dependency array


  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Basic validation (you'd want more robust validation in a real app, e.g., with Zod)
    if (!name || !email  || !attendanceMethod ) {
      toast.error("Missing Information: Please fill out all required fields.");
      setIsLoading(false);
      return;
    }

    try {
        const q = query(collection(db, "request"), where("phone", "==",phone));
        const querySnapshot = await getDocs(q);

        if(querySnapshot.empty){
          toast.error("User not found");
          setIsLoading(false);
          return;
        }

        // Create admin document in users collection
        const newAdminRef = doc(collection(db, "users"));
        const newAdminId = newAdminRef.id;

        const userData = querySnapshot.docs[0].data();

        // Create admin document
        await setDoc(newAdminRef, {
            uid: newAdminId,
            name: name,
            email: email,
            phone: phone,
            companyuid: userData.companyuid,
            companyName: userData.companyname,
            role: "admin",
            tracingMethod: attendanceMethod,
            createdAt: serverTimestamp(),
            createdBy: isuser.uid,
            isActive: true,
            isNew: false,
          });

          const q2 = query(collection(db, "request"), where("phone", "==", phone));
          const quernSnap2 = await getDocs(q2);
  
          if(quernSnap2.empty){
            toast.error("User not found");
            setIsLoading(false);
            return;
          }

          await updateDoc(doc(db, "request", quernSnap2.docs[0].id), { isNew: false });

       
        

        toast.success("Admin account created successfully");
        setIsLoading(false);
        router.push('/admin');
    } catch (error) {
        console.error("Error creating admin:", error);
        toast.error("Failed to create admin. Please try again.");
        setIsLoading(false);
    }
  };


  // Show loading state while checking authentication
  if (checkingStatus) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isuser) {
    // This will only run on client side
    router.push("/login");
    return null;
  }

  return (
    
    <Card className="w-full max-w-lg mx-auto shadow-md">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <UserPlus className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">Create New Admin Account</CardTitle>
        </div>
        <CardDescription>
          Fill in the details below to add a new administrator.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              placeholder="e.g., Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
            <Input
              id="phone"
              type="text"
              value={phone}
              required
              readOnly
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g., admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-3 mb-5">
            <Label>Attendance Tracking Method <span className="text-red-500">*</span></Label>
            <RadioGroup
              value={attendanceMethod}
              onValueChange={setAttendanceMethod}
              className="space-y-2"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Daily Attendance" id="daily-attendance" />
                    <Label htmlFor="daily-attendance" className="font-normal cursor-pointer flex-grow">
                    Daily Attendance
                    </Label>
                </div>
             
                <div className="flex items-center space-x-2">
                <RadioGroupItem value="Schedule Meetings" id="Schedule Meetings" />
                <Label htmlFor="Schedule Meetings" className="font-normal cursor-pointer flex-grow">
                  Schedule Meetings
                </Label>
                </div>
              
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Create Admin Account"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}