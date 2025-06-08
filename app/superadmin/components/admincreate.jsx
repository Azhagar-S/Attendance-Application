'use client'
import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { collection, doc, serverTimestamp, addDoc, updateDoc, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/app/firebase/config'
import { auth } from '@/app/firebase/config'

const admincreate = () => {
    const [phone , setPhone] = useState("")
    const [loading , setLoading] = useState(false)
    const [error , setError] = useState("")

    const user = auth.currentUser;

    const handleCreateAdmin = async(e) => {
        e.preventDefault();

        // Input validation
        if (!phone || !phone.match(/^[0-9]{10}$/)) {
            setError("Please enter a valid 10-digit phone number");
            return;
        }

        if (!user) {
            setError("You must be logged in to create an admin");
            return;
        }
        
        setLoading(true);
        setError("");
        
        try {
            
            // Create new admin document
            const docRef = await addDoc(collection(db, "request"), {
                phone: phone,
                createdAt: serverTimestamp(),
                createdBy: user.uid,
                role: "admin",
                isNew: true,
                lastUpdated: serverTimestamp()
            });
            
            // Update the document with the generated ID
            await updateDoc(docRef, {
                uid: docRef.id
            });
            
            // Reset form on success
            setPhone("");
            alert("Admin created successfully!");
            
        } catch (error) {
            console.error("Error creating admin:", error);
            setError(error.message || "Failed to create admin. Please try again.");
        } finally {
            setLoading(false);
        }
    }
  return (
    <div className='p-6'>
        
        <form onSubmit={handleCreateAdmin} className='space-y-4' >
        <h1 className='text-2xl font-bold text-center mb-6 text'>Admin Create</h1>
        <Label htmlFor="phone" className="text-lg">Phone</Label>
        <Input type="text" id="phone" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} /> 
        <Button type="submit" className="w-full">Create Admin</Button>
        </form>
    </div>
  )
}

export default admincreate