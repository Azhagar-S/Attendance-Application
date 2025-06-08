'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { db } from "@/app/firebase/config"
import { doc, setDoc, collection, serverTimestamp } from "firebase/firestore"
import { toast } from "sonner"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/app/firebase/config";
import { LogIn } from "lucide-react"
import { Loader2 } from "lucide-react";

export default function SignUp() {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [name, setName] = useState('');
    const router = useRouter();

    const handleCreateSuperAdmin = async(e) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const newDocRef = doc(collection(db, "superadmin"));
            const docSnap = await setDoc(newDocRef, {
                name: name,
              email: email,
              createdAt: serverTimestamp(),
              role: "superadmin",
              lastUpdated: serverTimestamp(),
              uid: newDocRef.id  // Use the same ID as the document ID
            });
            toast.success("Super Admin Created Successfully");
            setIsLoading(false);
            router.push('/superadmin');
        } catch (error) {
            console.error("Error creating super admin: ", error);
            toast.error("Failed to create super admin. Please try again.");
            setIsLoading(false);
        }
    }

  return (
    <Card className="w-full max-w-md mx-auto mt-40">
      <CardHeader>
        <CardTitle>Create an Account</CardTitle>
        <CardDescription>Enter your details below to sign up for our service.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleCreateSuperAdmin}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="John Doe" required onChange={(e) => setName(e.target.value)}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="john@example.com" required onChange={(e) => setEmail(e.target.value)}/>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required onChange={(e) => setPassword(e.target.value)}/>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            Sign Up
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}