import React, { useRef, useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { UploadCloud } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

const requiredColumns = [
  "patient_id","name","medication","refill_request_date","last_filled",
  "last_visit","labs","diagnosis","refill_notes","icd_notes","age","gender",
  "allergies","comorbidities","refill_history"
];
  

  export function ImportPatients() {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [error, setError] = useState("");
    const { authState } = useAuth();

    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
  
    const handleDownloadTemplate = () => {
      const sampleCsv = requiredColumns.join(",") + "\n" +
        "P007,John Doe,Hydrochlorothiazide 25mg,2025-05-30,2025-04-04,2024-02-27,\"Stable electrolytes\",Hypertension,\"Patient seen last month, BP well-controlled, compliant with regimen.\",\"Patient presents with hypertension symptoms\",68,F,\"Sulfa drugs\",None,\"Frequently requests early refills\"\n";
      const blob = new Blob([sampleCsv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "patient-template.csv";
      a.click();
      URL.revokeObjectURL(url);
    };
  
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setError("");
      setSuccess(false);
      const file = e.target.files?.[0];
      if (!file) return;
  
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        setError("Please upload a valid CSV file.");
        return;
      }
  
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: any) => {
          const missing = requiredColumns.filter(col => !results.meta.fields?.includes(col));
          
          if (missing.length) {
            setError(`Missing columns: ${missing.join(", ")}. Found: ${results.meta.fields?.join(", ") || "none"}`);
            return;
          }
          const patients = results.data.map((row: any) => ({
            patient_id: row.patient_id,
            name: row.name,
            medication: row.medication,
            refill_request_date: row.refill_request_date,
            last_filled: row.last_filled,
            last_visit: row.last_visit,
            labs: row.labs,
            diagnosis: row.diagnosis,
            refill_notes: row.refill_notes,
            icd_notes: row.icd_notes,
            age: row.age ? parseInt(row.age) : undefined,
            gender: row.gender,
            allergies: row.allergies,
            comorbidities: row.comorbidities,
            refill_history: row.refill_history,
            user_id: authState.user?.id
          }));
          setUploading(true);
          try {
            const response = await fetch(`${API_BASE}/api/v1/patients/batch`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(patients),
              credentials: "include",
            });
            if (!response.ok) {
              throw new Error(await response.text());
            }
            setSuccess(true);
            setError("");
            // Trigger refresh of patient lists with a small delay
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('historyUpdated'));
            }, 500);
          } catch (err: any) {
            console.log("CSV Upload Error:", err);
            setError(err.message || "Failed to upload patients.");
          } finally {
            setUploading(false);
          }
        },
        error: (err: any) => setError(`CSV Parse Error: ${err.message}`),
      });
    };
  
    return (
      <Card className="max-w-xl mx-auto mt-6">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <UploadCloud className="h-6 w-6 text-blue-600" />
          <div>
            <CardTitle className="text-lg">Upload Patient Data</CardTitle>
            <CardDescription>Import a CSV file of patient records. Download the template for correct formatting.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              Download Template
            </Button>
            <label className="inline-block">
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
              <Button asChild type="button" variant="default">
                <span>Choose CSV File</span>
              </Button>
            </label>
          </div>
          {error && (
            <div className="text-red-500 font-medium border border-red-200 bg-red-50 rounded px-3 py-2">
              {error.includes("Missing columns") ? (
                "Missing required columns. Please use the template above."
              ) : error.includes("CSV Parse Error") ? (
                "Invalid CSV file format."
              ) : error.includes("Failed to upload") ? (
                "Upload failed. Please try again."
              ) : (
                "Error importing CSV. Please check your file and try again."
              )}
            </div>
          )}
          {success && <div className="text-green-600 font-medium border border-green-200 bg-green-50 rounded px-3 py-2">Patients uploaded successfully!</div>}
          {uploading && <div className="text-blue-600 font-medium">Uploading...</div>}

        </CardContent>
      </Card>
    );
  }




