import { CreateEmployeeForm } from "@/app/createaccount/components/createemployee"; // Adjust path if needed

export default function CreateEmployeePage() {
  return (
    <div className="container mx-auto py-20 px-4 flex flex-col items-center">
      <CreateEmployeeForm />
    </div>
  );
}