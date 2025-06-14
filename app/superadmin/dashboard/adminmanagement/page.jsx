"use client";
import { useState, useEffect } from 'react'; // useEffect might be needed for fetching data
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Plus, Trash2, Edit, UserPlus, PlusCircle, Square } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge"; // npx shadcn-ui@latest add badge
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { addDoc, collection, serverTimestamp, setDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { auth } from "@/app/firebase/config";
import { Search } from 'lucide-react';
import { CheckCircle } from 'lucide-react';
import { XCircle } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';
import { query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";



// Mock data - replace with Firebase data
const initialAdmins = [
  { id: "admin1", name: "Alice Wonderland", email: "alice@example.com", role: "Regional Admin", status: "active", lastLogin: "2024-05-29" },
  { id: "admin2", name: "Bob The Builder", email: "bob@example.com", role: "Department Admin", status: "inactive", lastLogin: "2024-05-15" },
  { id: "admin3", name: "Charlie Brown", email: "charlie@example.com", role: "System Admin", status: "active", lastLogin: "2024-05-30" },
  { id: "admin4", name: "Diana Prince", email: "diana@example.com", role: "Regional Admin", status: "active", lastLogin: "2024-05-28" },
  { id: "admin5", name: "Edward Scissorhands", email: "edward@example.com", role: "Support Admin", status: "inactive", lastLogin: "2024-04-10" },
];

export default  function AdminManagementPage() {
  const [admins, setAdmins] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null); // For editing
  const [newAdmin, setNewAdmin] = useState({
    companyname: '',
    phone: ''
  });
  const [companies, setCompanies] = useState([]);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminRequests, setAdminRequests] = useState([]);


  // Filtered Admins

  const filteredAdmins = admins.filter(admin =>
    (admin.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (admin.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (admin.role?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );


useEffect(()=>{
    const unsubscribe = onAuthStateChanged(auth, async(currentUser) => {
        console.log(currentUser);
         if (currentUser) {
           setUser(currentUser);
            try{
              setLoading(true);

             const q = query(collection(db, 'users'), where('role', '==', 'admin'));
             const querySnapshot = await getDocs(q);
             const adminsList = querySnapshot.docs.map(doc => ({
               id: doc.id,
               ...doc.data(),
             }));
             console.log("adminsList",adminsList)
             setAdmins(adminsList);
             setLoading(false);
           }catch(error){
             console.log(error)
             setLoading(false);
           }
           }
    });

    return () => unsubscribe();
}, [user]);
 
useEffect(() => {
    const fetchAdminRequests = async () => {
      if (!user) return;
      try {
        const requestsRef = collection(db, 'request');
        // Assuming superadmin sees all admin requests. If it needs to be filtered by who created it,
        // you would add a where clause like: where('createdBy', '==', user.uid)
        const q = query(requestsRef, where('role', '==', 'admin') , where('isNew', '==', true));
        const querySnapshot = await getDocs(q);
        const requestsList = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(req => !req.status || req.status === 'pending'); // Show only pending requests
        setAdminRequests(requestsList);
      } catch (error) {
        console.error("Error fetching admin requests:", error);
        toast.error("Failed to load pending admin requests.");
      }
    };

    fetchAdminRequests();
  }, [user, isCreateModalOpen]); // Re-fetch when user changes or a new admin is created


  const handleCreateAdmin = async(e) => {
    e.preventDefault();
    if (!newAdmin.phone || !newAdmin.companyId) {
        toast.error("Please fill in all required fields");
        return;
    }

    try {
        // Get the selected company
        const selectedCompany = companies.find(c => c.id === newAdmin.companyId);
        if (!selectedCompany) {
            toast.error("Selected company not found");
            return;
        }

        // Check for existing admins in the same company
        const adminsRef = collection(db, 'users');
        const q = query(adminsRef, where('companyuid', '==', selectedCompany.id));
        const querySnapshot = await getDocs(q);
        
       
      

        

        // Create new admin document
        const newAdminRef = doc(collection(db, "request"));
        const newAdminId = newAdminRef.id;

        await setDoc(newAdminRef, {
            uid: newAdminId,
            phone: newAdmin.phone,
            companyname: selectedCompany.name,
            companyuid: selectedCompany.id,
            role: "admin",
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            isNew: true,
            lastUpdated: serverTimestamp(),
           
        });

       
       
        
        
        
        toast.success(`Admin created successfully for ${selectedCompany.name}`);
        setIsCreateModalOpen(false);
        setNewAdmin({
            companyname: '',
            phone: '',
            companyId: ''
        });
        
    } catch (error) {
        console.error("Error creating admin: ", error);
        toast.error("Failed to create admin. Please try again.");
    }
    setIsCreateModalOpen(false);
    setNewAdmin({
      companyname:'',
      phone:''
    }); // Reset form
  };




  const handleEditAdmin = (e) => {
    e.preventDefault();
    if (!currentAdmin) {
        toast.error("Enter Phone Number");
        return;
    }
    toast.success(`Admin ${currentAdmin}'s details have been updated.`);
    setIsEditModalOpen(false);
    setCurrentAdmin(null);
  };

  const openEditModal = (admin) => {
    setCurrentAdmin({ ...admin }); // Create a copy to edit
    setIsEditModalOpen(true);
  };

  const handleDeleteAdmin = (adminIdToDelete) => {
    // TODO: Add Firebase logic to delete admin auth user and Firestore record.
    // This is a critical action and should have robust confirmation.
    // Using a custom dialog for confirmation is better than window.confirm.
    if (window.confirm(`Are you sure you want to delete admin: ${adminIdToDelete}? This action cannot be undone.`)) {
        toast.error(`Admin ${adminIdToDelete} has been deleted.`);
    }
  };

   const toggleAdminStatus = async(adminIdToToggle) => {
    // TODO: Add Firebase logic to update admin status in Firestore.
    setAdmins(prevAdmins =>
      prevAdmins.map(admin =>
        admin.id === adminIdToToggle
          ? { ...admin, isActive: admin.isActive && 'active' ? 'inactive' : 'active' }
          : admin
      )
    );

    try {
      await updateDoc(doc(db, "users", adminIdToToggle), { isActive: (prev) => !prev});
    } catch (error) {
      console.error("Error updating admin status:", error);
      toast.error("Failed to update admin status. Please try again.");
    }
    const updatedAdmin = admins.find(admin => admin.id === adminIdToToggle);
    toast.success(`Admin status has been changed to ${updatedAdmin?.isActive && 'active' ? 'inactive' : 'active'}.`);
  };


  // Fetch companies on component mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const companiesRef = collection(db, 'companies');
        const snapshot = await getDocs(companiesRef);
        const companiesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Initialize admin count if not exists
          
        }));
        setCompanies(companiesList);
      } catch (error) {
        console.error('Error fetching companies:', error);
        toast.error('Failed to load companies');
      }
    };

    fetchCompanies();
  }, []);

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    try {
      const newCompanyRef = doc(collection(db, 'companies'));
      await setDoc(newCompanyRef, {
        name: newCompanyName,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        uid: newCompanyRef.id
      });
      
      // Update local state
      setCompanies(prev => [...prev, {
        id: newCompanyRef.id,
        name: newCompanyName,
        createdAt: new Date(),
        createdBy: user.uid
      }]);
      
      // Select the newly added company
      setNewAdmin(prev => ({
        ...prev,
        companyname: newCompanyName,
        companyId: newCompanyRef.id
      }));
      
      setNewCompanyName('');
      setIsAddingCompany(false);
      toast.success('Company added successfully');
    } catch (error) {
      console.error('Error adding company:', error);
      toast.error('Failed to add company');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-semibold">Admin Account Management</h1>
            <p className="text-muted-foreground">Create, edit, and manage administrator accounts.</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> Create New Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md"> {/* Adjusted width */}
            <DialogHeader>
              <DialogTitle>Create New Admin</DialogTitle>
              <DialogDescription>Fill in the details to create a new administrator account.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAdmin} className="space-y-4 ">
              <div className="space-y-2">
                <Label>Company</Label>
                {isAddingCompany ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter company name"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button 
                        type="button"
                        size="sm"
                        onClick={handleAddCompany}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsAddingCompany(false);
                          setNewCompanyName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full">
                    <Select
                      value={newAdmin.companyId}
                      onValueChange={(value) => {
                        const selected = companies.find(c => c.id === value);
                        setNewAdmin(prev => ({
                          ...prev,
                          companyname: selected?.name || '',
                          companyId: value
                        }));
                      }}
                    >
                      <SelectTrigger className="shadow-none w-full">
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                      <div 
                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsAddingCompany(true);
                        }}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Company
                      </div>
                    </SelectContent>
                  </Select>
                  </div>
                )}
              </div>
              {/* <div>
                <Label htmlFor="name-new" className="mb-2">Company Name</Label>
                <Input id="name-new" name="name" maxLength={10} value={newAdmin.companyname} onChange={(e) => setNewAdmin({...newAdmin, companyname: e.target.value})} required />
              </div> */}
                <div>
                  <Label htmlFor="name-new" className="mb-2">Phone Number</Label>
                  <Input id="name-new" name="name" maxLength={10} value={newAdmin.phone} onChange={(e) => setNewAdmin({...newAdmin, phone: e.target.value})} required />
                </div>
                
              <DialogFooter className="pt-4">
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Create Admin</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="pb-4">
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
            type="search"
            placeholder="Search admins by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 sm:w-full md:w-1/2 lg:w-1/3"
            />
        </div>
      </div>

      {/* Admins Table */}
      <Card>
        <CardHeader>
            <CardTitle>Administrator List ({filteredAdmins.length})</CardTitle>
            <CardDescription>A list of all administrator accounts in the system.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="hidden md:table-cell w-[150px]">Last Login</TableHead>
                <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredAdmins.length > 0 ? filteredAdmins.map((admin) => (
                <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.role}</TableCell>
                    <TableCell>
                    <Badge variant={admin.isActive && 'active' ? 'default' : 'outline'}
                           className={admin.isActive && 'active' ? 'border-green-500 text-green-700 bg-green-100 dark:border-green-400 dark:text-green-300 dark:bg-green-900/50' 
                                                               : 'border-red-500 text-red-700 bg-red-100 dark:border-red-400 dark:text-red-300 dark:bg-red-900/50'}>
                        {admin.isActive && 'active' ? <CheckCircle className="mr-1 h-3 w-3"/> : <XCircle className="mr-1 h-3 w-3"/>}
                        {admin.isActive && 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                    </TableCell>
                    {/* <TableCell className="hidden md:table-cell">{admin.lastLogin || 'N/A'}</TableCell> */}
                    <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu for {admin.name}</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openEditModal(admin)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleAdminStatus(admin.id)}>
                            {admin.isActive && 'active' ? <XCircle className="mr-2 h-4 w-4 text-yellow-600" /> : <CheckCircle className="mr-2 h-4 w-4 text-green-600" />}
                            {admin.isActive && 'active' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteAdmin(admin.id)} className="text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:text-red-400 dark:focus:bg-red-900/50">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                        </DropdownMenuItem>
                        </DropdownMenuContent> 
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
                )) : (
                <TableRow>
                    <TableCell colSpan="6" className="h-24 text-center">
                    No admins found matching your search criteria.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </CardContent>
      </Card>

      {adminRequests.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>
            Pending Admin Requests ({adminRequests.length})
            <span className="text-sm font-normal text-muted-foreground ml-2">
              - Admins waiting for approval
            </span>
          </CardTitle>
          <CardDescription>
            Review and approve admin requests before they can manage their organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">No. Admins</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Request Date
                  </TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminRequests.map((req, index) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-mono text-xs">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {req.phone || "N/A"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {req.companyname || "Unassigned"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {req.createdAt
                            ? new Date(req.createdAt.seconds * 1000).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-yellow-500 text-yellow-700 bg-yellow-100 text-xs whitespace-nowrap"
                          >
                            <Square className="mr-1 h-3 w-3" />
                            Pending
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Edit Admin Modal */}
      {currentAdmin && (
        <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => { setIsEditModalOpen(isOpen); if (!isOpen) setCurrentAdmin(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Admin: {currentAdmin.name}</DialogTitle>
              <DialogDescription>Update the details for this administrator account.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditAdmin} className="space-y-4">
                <div>
                  <Label htmlFor="name-edit">Full Name</Label>
                  <Input id="name-edit" name="name" value={currentAdmin.name} onChange={(e) => handleInputChange(e, 'edit')} required />
                </div>
                <div>
                  <Label htmlFor="email-edit">Email Address</Label>
                  <Input id="email-edit" name="email" type="email" value={currentAdmin.email} onChange={(e) => handleInputChange(e, 'edit')} required />
                </div>
                <div>
                  <Label htmlFor="role-edit">Role / Permissions</Label>
                  <Input id="role-edit" name="role" value={currentAdmin.role} onChange={(e) => handleInputChange(e, 'edit')} required />
                </div>
                {/* Note: Password changes should typically be a separate, more secure flow. */}
                {/* For example, sending a password reset link or requiring current password. */}
                <div className="text-sm text-muted-foreground">
                    To change the password, a separate "Reset Password" function is recommended.
                </div>
              <DialogFooter className="pt-4">
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
