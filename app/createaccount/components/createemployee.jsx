// components/CreateAdminForm.jsx
"use client";

import { useState, useEffect } from "react";
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
import { useRouter } from "next/navigation";
import { setDoc, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/app/firebase/config";
import { query , getDocs , where } from "firebase/firestore";



export function CreateEmployeeForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isuser , setUser] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [department, setDepartment] = useState("");
  const router = useRouter();


  useEffect(()=>{
    const unsubscribe = onAuthStateChanged(auth, async(currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setPhone(currentUser.phoneNumber.slice(3));
        
      } else {
        setUser(null);
        router.push('/login');
      }
      setCheckingStatus(false);
    });


    return () => unsubscribe();
  }, [auth])




  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Basic validation (you'd want more robust validation in a real app, e.g., with Zod)
    if (!name || !email || !phone || !department) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill out all required fields.",
      });
      setIsLoading(false);
      return;
    }

    try {

      // First, find the employee's request to get the adminuid
      const requestQuery = query(
        collection(db, "request"),
        where("phone", "==", phone) // The phone number from the form
      );
      
      const requestSnapshot = await getDocs(requestQuery);
      
      if (requestSnapshot.empty) {
        throw new Error("No registration request found for this phone number");
      }
      
      // Get the adminuid from the request
      const requestData = requestSnapshot.docs[0].data();
      console.log("requestData",requestData)
      const adminUid = requestData.adminuid;
      const companyuid = requestData.companyuid;
      const tracingMethod = requestData.tracingMethod;
      
      if (!adminUid) {
        throw new Error("No admin UID found in registration request");
      }
 
      // Create the new employee document
      const newDocRef = doc(collection(db, "users"));
      
      await setDoc(newDocRef, {
        name: name,
        email: email,
        phone: phone,
        adminuid: adminUid,  // Use the adminuid from the request
        companyuid: companyuid,
        department: department,
        role: "employee",
        isNew: false,
        isActive: true,
        tracingMethod: tracingMethod,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        uid: newDocRef.id
      });

      await updateDoc(doc(db, "request", requestSnapshot.docs[0].id), { isNew: false });

      // Optionally, you might want to update the request to mark it as processed
      // await updateDoc(requestSnapshot.docs[0].ref, { processed: true });
    


    toast.success("Employee account created successfully");
    router.push("/employee");

    // Reset form fields after successful submission
    setName("");
    setEmail("");
   
  } catch (error) {
    console.error("Error creating account:", error);
    toast.error(`Error creating account: ${error.message || "An unexpected error occurred"}`);
  } finally {
    setIsLoading(false);
  }
};

 


  return (
    <Card className="w-full max-w-lg mx-auto shadow-md">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <UserPlus className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">Create New Employee Account</CardTitle>
        </div>
        <CardDescription>
          Fill in the details below to add a new employee.
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
         
          <div className="space-y-2 mb-8">
            <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
            <Input
              id="phone"
              type="text"
              placeholder="e.g., 9876543210"
              value={phone}
              readOnly
              required
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

          <div className="space-y-2">
            <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
            <Input
              id="department"
              type="text"
              placeholder="e.g., IT, HR, Sales, etc."
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            />
          </div>

        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Create Employee Account"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}