// components/SuperAdminProfileSettings.jsx
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner"; // For notifications

// Placeholder for a file upload icon or edit icon
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);


// Sample initial data (in a real app, fetch this for the logged-in super admin)
const initialSuperAdminData = {
  fullName: "Dr. Admin Supreme",
  username: "superadmin",
  email: "super.admin@example.com", // Usually not editable if it's the login ID
  phoneNumber: "+11234567890",
  avatarUrl: "https://github.com/shadcn.png", // Placeholder image
  theme: "system", // 'light', 'dark', 'system'
  language: "en", // 'en', 'es', 'fr', etc.
  notifications: {
    systemAlertsEmail: true,
    newUserSignupPush: false,
    weeklySummaryEmail: true,
  },
  // Security fields are usually not pre-filled for display
};

export function SuperAdminProfileSettings({ adminData = initialSuperAdminData }) {
  const [profile, setProfile] = useState(adminData);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Handler for input changes in personal info & preferences
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("notifications.")) {
      const notifKey = name.split(".")[1];
      setProfile((prev) => ({
        ...prev,
        notifications: { ...prev.notifications, [notifKey]: checked },
      }));
    } else {
      setProfile((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleSelectChange = (name, value) => {
     setProfile((prev) => ({
        ...prev,
        [name]: value,
      }));
  };

  const handleSavePersonalInfo = (e) => {
    e.preventDefault();
    // API call to save personal info: profile.fullName, profile.username, profile.phoneNumber
    console.log("Saving personal info:", {
      fullName: profile.fullName,
      username: profile.username,
      phoneNumber: profile.phoneNumber,
    });
    toast.success("Personal information updated successfully!");
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (!newPassword) {
        toast.error("New password cannot be empty.");
        return;
    }
    // API call to change password: currentPassword, newPassword
    console.log("Changing password with:", { currentPassword, newPassword });
    toast.success("Password changed successfully! (Simulated)");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    // API call to save preferences: profile.theme, profile.language, profile.notifications
    console.log("Saving preferences:", {
      theme: profile.theme,
      language: profile.language,
      notifications: profile.notifications,
    });
    toast.success("Preferences saved successfully!");
  };

  const handleAvatarUpload = () => {
    // Placeholder for avatar upload logic
    // This would typically involve an <input type="file" /> and an API call to upload the image.
    toast.info("Avatar upload functionality would be here.");
  };


  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Super Admin Profile Settings</CardTitle>
        <CardDescription>
          Manage your personal information, security settings, and system preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Section 1: Personal Information */}
        <form onSubmit={handleSavePersonalInfo} className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Personal Information</h3>
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />
              <AvatarFallback>SA</AvatarFallback> {/* SA for Super Admin */}
            </Avatar>
            <Button type="button" variant="outline" size="sm" onClick={handleAvatarUpload}>
              <EditIcon className="mr-2 h-4 w-4" /> Change Avatar
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" name="fullName" value={profile.fullName} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" value={profile.username} onChange={handleChange} />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={profile.email} readOnly disabled className="cursor-not-allowed bg-gray-100 dark:bg-gray-700" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email address cannot be changed.</p>
          </div>
          <div>
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input id="phoneNumber" name="phoneNumber" type="tel" value={profile.phoneNumber} onChange={handleChange} />
          </div>
          <div className="flex justify-end">
            <Button type="submit">Save Personal Info</Button>
          </div>
        </form>

  
      
      </CardContent>
      <CardFooter className="border-t pt-6">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Changes to security settings may require you to log in again.
        </p>
      </CardFooter>
    </Card>
  );
}