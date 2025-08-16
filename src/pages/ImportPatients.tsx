import React, { useRef, useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { UploadCloud } from "lucide-react";
import { usePatients } from "@/context/PatientContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

const requiredColumns = [
  "patient_id","medication","patient_name","refill_request_date","last_filled",
  "last_visit","labs","diagnosis","refill_notes","icd_notes","age","gender",
  "allergies","comorbidities","refill_history"
];
  

  export function ImportPatients() {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [error, setError] = useState("");
    const { triggerGlobalUpdate } = usePatients();

    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    

    
  
      const handleDownloadTemplate = () => {
    const sampleCsv = requiredColumns.join(",") + "\n" +
      "P001,Levothyroxine 50mcg,Jane Doe,2025-05-25,2025-04-22,2024-02-24,\"TSH = 2.4, T4 normal\",Hypothyroidism,\"Routine refill, no recent adverse events, within visit window.\",\"Patient presents with vomiting. Symptoms started 2 days ago. Vitals stable. No prior history of this condition. Assessment: likely vomiting, unspecified.\",48,Female,Penicillin,\"Obesity, Hyperlipidemia\",\"First time refill\"\n" +
      "P002,Omeprazole 20mg,John Smith,2025-06-01,2025-04-29,2025-03-15,\"No active GI symptoms\",GERD,\"Labs outdated, unclear if condition is controlled.\",\"Patient presents with joint pain. Symptoms started 2 days ago. Vitals stable. No prior history of this condition. Assessment: likely pain in unspecified joint.\",45,Male,NSAIDs,\"Obesity, Hyperlipidemia\",\"Missed last 2 refills\"\n";
      const blob = new Blob([sampleCsv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "patient-template.csv";
      a.click();
      URL.revokeObjectURL(url);
    };
  
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log("File change triggered");
      setError("");
      setSuccess(false);
      const file = e.target.files?.[0];
      if (!file) return;
      
      console.log("File selected:", file.name, file.size);
  
      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        setError("Please upload a valid CSV file.");
        return;
      }
  
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        fastMode: false,
        complete: async (results: any) => {
          console.log("Papa Parse - Raw parsed headers:", results.meta.fields);
          console.log("Papa Parse - Required columns:", requiredColumns);
          console.log("Papa Parse - Number of parsed headers:", results.meta.fields?.length);
          
          const missing = requiredColumns.filter(col => !results.meta.fields?.includes(col));
          
          if (missing.length) {
            setError(`Missing columns: ${missing.join(", ")}. Found: ${results.meta.fields?.join(", ") || "none"}`);
            return;
          }
          
          const patients = results.data.map((row: any) => ({
            patient_id: row.patient_id,
            name: row.patient_name,
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
            refill_history: row.refill_history
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
              const errorText = await response.text();
              throw new Error(errorText);
            }
            setSuccess(true);
            setError("");
            // Trigger global update for all components
            triggerGlobalUpdate();
          } catch (err: any) {
            setError(`Upload Error: ${err.message || "Failed to upload patients."}`);
          } finally {
            setUploading(false);
          }
        },
        error: (err: any) => {
          console.log("CSV Parse Error:", err);
          setError(`CSV Parse Error: ${err.message}`);
        },
      });
    };
  
    return (
      <Card className="max-w-2xl mx-auto border-0 bg-white shadow-[0_8px_25px_rgba(0,0,0,0.1)] rounded-2xl overflow-hidden">
        <CardHeader className="pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <UploadCloud className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Upload Patient Data</CardTitle>
              <CardDescription className="text-gray-600 mt-1">Import a CSV file of patient records. Download the template for correct formatting.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleDownloadTemplate}
              className="flex-1 h-12 bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
            >
              <UploadCloud className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <label className="flex-1">
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
              <Button 
                asChild 
                type="button" 
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 transition-all duration-200"
              >
                <span className="flex items-center justify-center">
                  <UploadCloud className="h-4 w-4 mr-2" />
                  Choose CSV File
                </span>
              </Button>
            </label>
          </div>



          {/* Status Messages */}
          {error && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                </div>
                <div className="text-sm text-red-700">
                  {error.includes("Missing columns") ? (
                    "Missing required columns. Please use the template above."
                  ) : error.includes("CSV Parse Error") ? (
                    "Invalid CSV file format."
                  ) : error.includes("Upload Error") ? (
                    `Upload failed: ${error}`
                  ) : (
                    `Error importing CSV: ${error}`
                  )}
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl border border-green-200 bg-green-50">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                </div>
                <div className="text-sm text-green-700 font-medium">
                  Patients uploaded successfully!
                </div>
              </div>
            </div>
          )}

          {uploading && (
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                </div>
                <div className="text-sm text-blue-700 font-medium">
                  Uploading patients...
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }


