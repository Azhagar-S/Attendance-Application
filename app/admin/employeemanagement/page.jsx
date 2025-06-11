"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table as ShadcnTable,
  TableBody as ShadcnTableBody,
  TableCell as ShadcnTableCell,
  TableHead as ShadcnTableHead,
  TableHeader as ShadcnTableHeader,
  TableRow as ShadcnTableRow,
} from "@/components/ui/table";

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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  PlusCircle,
  Edit3,
  Trash2,
  UserCog,
  Search as SearchIcon,
  CheckSquare,
  Square,
  UserPlus,
  Filter,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge as ShadcnBadge } from "@/components/ui/badge";
import {
  Select as ShadcnSelect,
  SelectContent as ShadcnSelectContent,
  SelectItem as ShadcnSelectItem,
  SelectTrigger as ShadcnSelectTrigger,
  SelectValue as ShadcnSelectValue,
} from "@/components/ui/select";
import { db } from "@/app/firebase/config";
import { auth } from "@/app/firebase/config";
import {
  addDoc,
  collection,
  serverTimestamp,
  setDoc,
  doc,
  query,
  getDocs,
  where,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function EmployeeManagementPage() {
  const [employees, setEmployees] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);

  const [newEmployee, setNewEmployee] = useState({
    phone: "",
    name: "",
    email: "",
    department: "",
    creationMethod: "request",
    tracingMethod: "",
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [user, setUser] = useState(null);

  // Combined filtering logic
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && emp.isActive === true) ||
      (statusFilter === "inactive" && emp.isActive === false);

    return matchesSearch && matchesStatus;
  });

  // Fetch employees function
  const fetchEmployees = async (currentUser) => {
    if (!currentUser || !currentUser.phoneNumber) return;

    try {
      console.log("user", currentUser);
      const phoneNumber = currentUser.phoneNumber.slice(3);

      const userQuery = query(
        collection(db, "users"),
        where("phone", "==", phoneNumber)
      );
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        console.error("User not found in database");
        return;
      }

      const userData = userSnapshot.docs[0].data();
      const companyuid = userData.companyuid;

      const companyQuery = query(
        collection(db, "users"),
        where("companyuid", "==", companyuid),
        where("role", "==", "employee")
      );
      const companySnapshot = await getDocs(companyQuery);

      const employees = companySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setEmployees(employees);
      console.log("Fetched employees:", employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // Fetch requests function
  const fetchRequests = async (currentUser) => {
    if (!currentUser || !currentUser.phoneNumber) return;

    try {
      const phoneNumber = currentUser.phoneNumber.slice(3);

      const userQuery = query(
        collection(db, "users"),
        where("phone", "==", phoneNumber)
      );
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        console.error("User not found in database");
        return;
      }

      const userData = userSnapshot.docs[0].data();
      const companyuid = userData.companyuid;

      const requestQuery = query(
        collection(db, "request"),
        where("companyuid", "==", companyuid),
        where("role", "==", "employee")
      );
      const requestSnapshot = await getDocs(requestQuery);

      const requests = requestSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRequests(requests);
      console.log("Fetched requests:", requests);
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Assuming you have router available
        // return router.push("/admin/auth");
        console.log("No user authenticated");
        return;
      }

      setUser(user);
      fetchEmployees(user);
      fetchRequests(user);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();

    // Validation
    if (newEmployee.creationMethod === "manual") {
      if (!newEmployee.phone || !newEmployee.name || !newEmployee.email) {
        toast.error(
          "Please fill in all required fields (Name, Email, Phone Number)"
        );
        return;
      }
    } else {
      // For requests, only phone is required
      if (!newEmployee.phone) {
        toast.error("Phone number is required");
        return;
      }
    }

    try {
      const phoneNumber = auth.currentUser?.phoneNumber?.slice(3);
      if (!phoneNumber) {
        toast.error("Admin phone number not found");
        return;
      }

      const q = query(
        collection(db, "users"),
        where("phone", "==", phoneNumber)
      );
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        toast.error("Admin user not found");
        return;
      }

      const adminUid = querySnapshot.docs[0].id;
      const adminData = querySnapshot.docs[0].data();
      const companyuid = adminData.companyuid;
      const defaultTracingMethod = adminData.tracingMethod || "Daily Attendance";

      if (newEmployee.creationMethod === "manual") {
        // Manual creation - add directly to users collection
        const newEmployeeData = {
          phone: newEmployee.phone,
          name: newEmployee.name,
          email: newEmployee.email,
          companyuid: companyuid,
          createdAt: serverTimestamp(),
          role: "employee",
          lastUpdated: serverTimestamp(),
          adminuid: adminUid,
          isNew: false,
          tracingMethod: newEmployee.tracingMethod || defaultTracingMethod,
          isActive: true,
          department: newEmployee.department || "Unassigned",
        };

        const newDocRef = doc(collection(db, "users"));
        newEmployeeData.uid = newDocRef.id;
        await setDoc(newDocRef, newEmployeeData);
        
        console.log("Employee added to users collection:", newEmployeeData);
        toast.success(`Employee ${newEmployee.name} has been added successfully.`);
        
        // Refresh the employee list
        await fetchEmployees(auth.currentUser);
        
      } else {
        // Request creation - add to request collection
        const newEmployeeData = {
          phone: newEmployee.phone,
          companyuid: companyuid,
          createdAt: serverTimestamp(),
          role: "employee",
          isNew: true,
          lastUpdated: serverTimestamp(),
          adminuid: adminUid,
          tracingMethod: newEmployee.tracingMethod || defaultTracingMethod,
          isActive: true,
          department: newEmployee.department || "Unassigned",
          status: "pending", // Add status for requests
        };

        const newDocRef = doc(collection(db, "request"));
        newEmployeeData.uid = newDocRef.id;
        await setDoc(newDocRef, newEmployeeData);
        
        console.log("Employee request added:", newEmployeeData);
        toast.success("Employee request has been sent for approval.");
        
        // Refresh both employee list and requests
        await fetchEmployees(auth.currentUser);
        await fetchRequests(auth.currentUser);
      }

      // Reset form and close modal
      setIsCreateModalOpen(false);
      setNewEmployee({
        phone: "",
        name: "",
        email: "",
        department: "",
        creationMethod: "request",
        tracingMethod: "",
      });

    } catch (error) {
      console.error("Error creating employee:", error);
      toast.error("Failed to create employee. Please try again.");
    }
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    
    try {
      // Update Firebase
      await updateDoc(doc(db, "users", currentEmployee.id), {
        name: currentEmployee.name,
        email: currentEmployee.email,
        phone: currentEmployee.phone,
        lastUpdated: serverTimestamp(),
      });

      // Update local state
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === currentEmployee.id ? currentEmployee : emp))
      );
      
      toast.success("Employee Updated", {
        description: `${currentEmployee.name}'s details updated.`,
      });
      
      setIsEditModalOpen(false);
      setCurrentEmployee(null);
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error("Failed to update employee. Please try again.");
    }
  };

  const openEditModal = (employee) => {
    setCurrentEmployee({ ...employee });
    setIsEditModalOpen(true);
  };

  const toggleEmployeeStatus = async (employeeId) => {
    const employee = employees.find((e) => e.id === employeeId);
    const newStatus = !employee.isActive;

    try {
      await updateDoc(doc(db, "users", employeeId), {
        isActive: newStatus,
      });

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employeeId ? { ...emp, isActive: newStatus } : emp
        )
      );

      toast.info("Status Updated", {
        description: `${employee.name}'s status changed to ${
          newStatus ? "active" : "inactive"
        }.`,
      });
    } catch (error) {
      console.error("Error updating employee status:", error);
      toast.error("Failed to update employee status");
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (
      window.confirm(
        "Are you sure you want to remove this employee? Consider deactivating first."
      )
    ) {
      try {
        // You might want to implement soft delete by updating isActive to false
        // Or actually delete the document - uncomment the line below for hard delete
        // await deleteDoc(doc(db, "users", employeeId));
        
        // For now, just removing from local state (soft delete approach)
        setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
        
        toast.error("Employee Removed", {
          description: "The employee has been removed from the system.",
        });
      } catch (error) {
        console.error("Error deleting employee:", error);
        toast.error("Failed to delete employee");
      }
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      const request = requests.find((req) => req.id === requestId);
      
      if (!request) {
        toast.error("Request not found");
        return;
      }

      // Move request to users collection
      const newEmployeeData = {
        ...request,
        isNew: false,
        status: "approved",
        approvedAt: serverTimestamp(),
      };
      
      // Remove the id field before adding to users collection
      delete newEmployeeData.id;
      
      const newDocRef = doc(collection(db, "users"));
      newEmployeeData.uid = newDocRef.id;
      await setDoc(newDocRef, newEmployeeData);

      // Remove from requests collection
      // await deleteDoc(doc(db, "request", requestId));
      // Or update status to approved
      await updateDoc(doc(db, "request", requestId), {
        status: "approved",
        approvedAt: serverTimestamp(),
      });

      // Refresh both lists
      await fetchEmployees(auth.currentUser);
      await fetchRequests(auth.currentUser);

      toast.success("Request approved successfully!");
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request");
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (window.confirm("Are you sure you want to reject this request?")) {
      try {
        await updateDoc(doc(db, "request", requestId), {
          status: "rejected",
          rejectedAt: serverTimestamp(),
        });

        await fetchRequests(auth.currentUser);
        toast.error("Request rejected");
      } catch (error) {
        console.error("Error rejecting request:", error);
        toast.error("Failed to reject request");
      }
    }
  };

  const handleInputChange = (e, mode) => {
    const { name, value } = e.target;
    if (mode === "edit") {
      setCurrentEmployee((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Reset form when modal closes
  const handleModalClose = (isOpen) => {
    setIsCreateModalOpen(isOpen);
    if (!isOpen) {
      setNewEmployee({
        phone: "",
        name: "",
        email: "",
        department: "",
        creationMethod: "request",
        tracingMethod: "",
      });
    }
  };

  // Get status counts for display
  const activeCount = employees.filter((emp) => emp.isActive === true).length;
  const inactiveCount = employees.filter((emp) => emp.isActive === false).length;
  const pendingRequestsCount = requests.filter((req) => req.status === "pending" || !req.status).length;

  return (
    <div className="space-y-6 mt-10 mx-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Employee Management</h1>
          <p className="text-muted-foreground">
            Add, view, and manage employee (member) accounts.
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={handleModalClose}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> Add New Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Enter the details for the new employee.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateEmployee} className="space-y-4 py-2">
              <div>
                <Label htmlFor="creationMethod-new" className="mb-2">
                  Creation Method
                </Label>
                <ShadcnSelect
                  value={newEmployee.creationMethod}
                  onValueChange={(value) =>
                    setNewEmployee((prev) => ({
                      ...prev,
                      creationMethod: value,
                    }))
                  }
                >
                  <ShadcnSelectTrigger>
                    <ShadcnSelectValue placeholder="Select creation method" />
                  </ShadcnSelectTrigger>
                  <ShadcnSelectContent>
                    <ShadcnSelectItem value="request">
                      Request (Pending Approval)
                    </ShadcnSelectItem>
                    <ShadcnSelectItem value="manual">
                      Manually (Direct Add)
                    </ShadcnSelectItem>
                  </ShadcnSelectContent>
                </ShadcnSelect>
              </div>

              <div>
                <Label htmlFor="phone-new" className="mb-2">
                  Phone Number
                </Label>
                <Input
                  id="phone-new"
                  name="phone"
                  type="tel"
                  value={newEmployee.phone}
                  onChange={(e) =>
                    setNewEmployee((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              {newEmployee.creationMethod === "manual" && (
                <>
                  <div>
                    <Label htmlFor="name-new" className="mb-2">
                      Name
                    </Label>
                    <Input
                      id="name-new"
                      name="name"
                      type="text"
                      value={newEmployee.name}
                      onChange={(e) =>
                        setNewEmployee((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email-new" className="mb-2">
                      Email
                    </Label>
                    <Input
                      id="email-new"
                      name="email"
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) =>
                        setNewEmployee((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="department-new" className="mb-2">
                      Department
                    </Label>
                    <Input
                      id="department-new"
                      name="department"
                      value={newEmployee.department}
                      onChange={(e) =>
                        setNewEmployee((prev) => ({
                          ...prev,
                          department: e.target.value,
                        }))
                      }
                    />
                  </div>
                
                  {/* <div>
                    <Label htmlFor="tracingMethod-new" className="mb-2">
                      Tracing Method
                    </Label>
                    <ShadcnSelect
                      value={newEmployee.tracingMethod}
                      onValueChange={(value) =>
                        setNewEmployee((prev) => ({
                          ...prev,
                          tracingMethod: value,
                        }))
                      }
                    >
                      <ShadcnSelectTrigger>
                        <ShadcnSelectValue placeholder="Select tracing method" />
                      </ShadcnSelectTrigger>
                      <ShadcnSelectContent>
                        <ShadcnSelectItem value="Daily Attendance">
                          Daily Attendance
                        </ShadcnSelectItem>
                        <ShadcnSelectItem value="Schedule Meetings">
                          Schedule Meetings
                        </ShadcnSelectItem>
                      </ShadcnSelectContent>
                    </ShadcnSelect>
                  </div> */}
                </>
              )}

              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Add Employee</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col sm:flex-row gap-4 pb-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <ShadcnSelect value={statusFilter} onValueChange={setStatusFilter}>
            <ShadcnSelectTrigger className="w-[180px]">
              <ShadcnSelectValue placeholder="Filter by status" />
            </ShadcnSelectTrigger>
            <ShadcnSelectContent>
              <ShadcnSelectItem value="all">
                All Employees ({employees.length})
              </ShadcnSelectItem>
              <ShadcnSelectItem value="active">
                Active ({activeCount})
              </ShadcnSelectItem>
              <ShadcnSelectItem value="inactive">
                Inactive ({inactiveCount})
              </ShadcnSelectItem>
            </ShadcnSelectContent>
          </ShadcnSelect>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Employee List ({filteredEmployees.length})
            {statusFilter !== "all" && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - Showing {statusFilter} employees
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <ShadcnTable>
              <ShadcnTableHeader>
                <ShadcnTableRow>
                  <ShadcnTableHead className="w-[80px]">ID</ShadcnTableHead>
                  <ShadcnTableHead>Name</ShadcnTableHead>
                  <ShadcnTableHead className="hidden md:table-cell">
                    Email
                  </ShadcnTableHead>
                  <ShadcnTableHead className="hidden lg:table-cell">
                    Phone
                  </ShadcnTableHead>
                  <ShadcnTableHead>Status</ShadcnTableHead>
                  <ShadcnTableHead className="text-right">Actions</ShadcnTableHead>
                </ShadcnTableRow>
              </ShadcnTableHeader>
              <ShadcnTableBody>
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp, index) => (
                    <ShadcnTableRow key={emp.id}>
                      <ShadcnTableCell className="font-mono text-xs">
                        {index + 1}
                      </ShadcnTableCell>
                      <ShadcnTableCell className="font-medium truncate max-w-[120px]">
                        {emp.name || "N/A"}
                      </ShadcnTableCell>
                      <ShadcnTableCell className="hidden md:table-cell truncate max-w-[180px]">
                        {emp.email || "N/A"}
                      </ShadcnTableCell>
                      <ShadcnTableCell className="hidden lg:table-cell">
                        {emp.phone || "N/A"}
                      </ShadcnTableCell>
                      <ShadcnTableCell>
                        <ShadcnBadge
                          variant={emp.isActive ? "default" : "outline"}
                          className={
                            emp.isActive
                              ? "border-green-500 text-green-700 bg-green-100 text-xs whitespace-nowrap"
                              : "border-slate-500 text-slate-700 bg-slate-100 text-xs whitespace-nowrap"
                          }
                        >
                          {emp.isActive ? (
                            <CheckSquare className="mr-1 h-3 w-3" />
                          ) : (
                            <Square className="mr-1 h-3 w-3" />
                          )}
                          {emp.isActive ? "Active" : "Inactive"}
                        </ShadcnBadge>
                      </ShadcnTableCell>
                      <ShadcnTableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <UserCog className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Manage</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditModal(emp)}>
                              <Edit3 className="mr-2 h-4 w-4" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleEmployeeStatus(emp.id)}
                            >
                              {emp.isActive ? (
                                <Square className="mr-2 h-4 w-4" />
                              ) : (
                                <CheckSquare className="mr-2 h-4 w-4" />
                              )}
                              {emp.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Employee
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </ShadcnTableCell>
                    </ShadcnTableRow>
                  ))
                ) : (
                  <ShadcnTableRow>
                    <ShadcnTableCell colSpan="6" className="h-24 text-center">
                      {searchTerm || statusFilter !== "all"
                        ? "No employees found matching your criteria."
                        : "No employees found."}
                    </ShadcnTableCell>
                  </ShadcnTableRow>
                )}
              </ShadcnTableBody>
            </ShadcnTable>
          </div>
        </CardContent>
      </Card>

      {/* Employee Requests Section */}

      {requests.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>
            Pending Employee Requests ({pendingRequestsCount})
            <span className="text-sm font-normal text-muted-foreground ml-2">
              - Employees waiting for approval
            </span>
          </CardTitle>
          <CardDescription>
            Review and approve employee requests before they join your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <ShadcnTable>
              <ShadcnTableHeader>
                <ShadcnTableRow>
                  <ShadcnTableHead className="w-[80px]">ID</ShadcnTableHead>
                  <ShadcnTableHead>Phone</ShadcnTableHead>
                  <ShadcnTableHead className="hidden md:table-cell">
                    Department
                  </ShadcnTableHead>
                  <ShadcnTableHead className="hidden lg:table-cell">
                    Request Date
                  </ShadcnTableHead>
                  <ShadcnTableHead>Status</ShadcnTableHead>
                  {/* <ShadcnTableHead className="text-right">Actions</ShadcnTableHead> */}
                </ShadcnTableRow>
              </ShadcnTableHeader>
              <ShadcnTableBody>
                {requests.length > 0 ? (
                  requests
                    .filter((req) => req.status === "pending" || !req.status)
                    .map((req, index) => (
                      <ShadcnTableRow key={req.id}>
                        <ShadcnTableCell className="font-mono text-xs">
                          {index + 1}
                        </ShadcnTableCell>
                        <ShadcnTableCell className="font-medium">
                          {req.phone || "N/A"}
                        </ShadcnTableCell>
                        <ShadcnTableCell className="hidden md:table-cell">
                          {req.department || "Unassigned"}
                        </ShadcnTableCell>
                        <ShadcnTableCell className="hidden lg:table-cell">
                          {req.createdAt
                            ? new Date(req.createdAt.seconds * 1000).toLocaleDateString()
                            : "N/A"}
                        </ShadcnTableCell>
                        <ShadcnTableCell>
                          <ShadcnBadge
                            variant="outline"
                            className="border-yellow-500 text-yellow-700 bg-yellow-100 text-xs whitespace-nowrap"
                          >
                            <Square className="mr-1 h-3 w-3" />
                            Pending
                          </ShadcnBadge>
                        </ShadcnTableCell>
                        {/* <ShadcnTableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApproveRequest(req.id)}
                              className="h-8 px-3 bg-green-600 hover:bg-green-700"
                            >
                              <CheckSquare className="mr-1 h-3 w-3" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectRequest(req.id)}
                              className="h-8 px-3 border-red-500 text-red-600 hover:bg-red-50"
                            >
                              <Square className="mr-1 h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        </ShadcnTableCell> */}
                      </ShadcnTableRow>
                    ))
                ) : (
                  <ShadcnTableRow>
                    <ShadcnTableCell colSpan="6" className="h-24 text-center">
                      No pending requests found.
                    </ShadcnTableCell>
                  </ShadcnTableRow>
                )}
              </ShadcnTableBody>
            </ShadcnTable>
          </div>
        </CardContent>
      </Card>
      )}
      {/* Edit Employee Modal */}
      {currentEmployee && (
        <Dialog
          open={isEditModalOpen}
          onOpenChange={(isOpen) => {
            setIsEditModalOpen(isOpen);
            if (!isOpen) setCurrentEmployee(null);
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Employee: {currentEmployee.name}</DialogTitle>
              <DialogDescription>
                Update the details for this employee.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditEmployee} className="space-y-4 py-2">
              <div>
                <Label htmlFor="name-edit">Name</Label>
                <Input
                  id="name-edit"
                  name="name"
                  type="text"
                  value={currentEmployee.name || ""}
                  onChange={(e) => handleInputChange(e, "edit")}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email-edit">Email</Label>
                <Input
                  id="email-edit"
                  name="email"
                  type="email"
                  value={currentEmployee.email || ""}
                  onChange={(e) => handleInputChange(e, "edit")}
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone-edit">Phone Number</Label>
                <Input
                  id="phone-edit"
                  name="phone"
                  type="text"
                  value={currentEmployee.phone || ""}
                  onChange={(e) => handleInputChange(e, "edit")}
                  required
                />
              </div>

              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}