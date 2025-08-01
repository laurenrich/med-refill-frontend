import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, User, Search, RefreshCw } from "lucide-react"
import { useAuth } from "../../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface PatientFormData {
  patient_id: string;
  name: string;
  age: string;
  gender: string;
  last_visit: string;
  diagnosis: string;
  medication: string;
  icd_note: string;
  icd_pmh: string;
  refill_request_date: string;
  last_filled: string;
  labs: string;
  allergies: string;
  comorbidities: string;
  refill_history: string;
  notes: string;
  analysisTypes: {
    prescriptionRefill: boolean;
    icdPrediction: boolean;
  };
}

export function PatientAnalysis() {
  const [patients, setPatients] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/patients`, { credentials: "include" })
      .then(res => res.json())
      .then((allPatients) => {
        // Convert date objects to strings if they exist
        const processedPatients = allPatients.map((patient: any) => ({
          ...patient,
          last_processed_request_date: patient.last_processed_request_date 
            ? (typeof patient.last_processed_request_date === 'object' 
                ? patient.last_processed_request_date.toISOString().split('T')[0]
                : patient.last_processed_request_date)
            : patient.last_processed_request_date
        }));
        setPatients(processedPatients);
      })
      .catch(console.error);
  }, []);
  const [formData, setFormData] = useState<PatientFormData>({
    patient_id: "",
    name: "",
    age: "",
    gender: "",
    last_visit: "",
    diagnosis: "",
    medication: "",
    icd_note: "",
    icd_pmh: "",
    refill_request_date: "",
    last_filled: "",
    labs: "",
    allergies: "",
    comorbidities: "",
    refill_history: "",
    notes: "",
    analysisTypes: {
      prescriptionRefill: true,
      icdPrediction: true,
    },
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<any>(null)
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { authState } = useAuth();

  // Filter patients by name or ID
  const filteredPatients = query.length === 0 ? [] : patients.filter(p => {
    const name = p.name?.toLowerCase() || "";
    const id = p.patient_id?.toLowerCase() || "";
    return name.includes(query.toLowerCase()) || id.includes(query.toLowerCase());
  });

  // Handle patient selection from autocomplete
  const handlePatientAutocomplete = (patientId: string) => {
    setShowDropdown(false);
    const patient = patients.find((p) => p.patient_id === patientId);
    if (patient) {
      setQuery(`${patient.name} (${patient.patient_id})`);
      setFormData({
        patient_id: patient.patient_id ?? "",
        name: patient.name ?? "",
        age: String(patient.age ?? ""),
        gender: patient.gender ?? "",
        last_visit: patient.last_visit ?? "",
        diagnosis: patient.diagnosis ?? "",
        medication: patient.medication ?? "",
        icd_note: patient.icd_notes ?? "",
        icd_pmh: patient.icd_pmh ?? "",
        refill_request_date: patient.refill_request_date ?? "",
        last_filled: patient.last_filled ?? "",
        labs: patient.labs ?? "",
        allergies: patient.allergies ?? "",
        comorbidities: patient.comorbidities ?? "",
        refill_history: patient.refill_history ?? "",
        notes: patient.refill_notes ?? "",
        analysisTypes: {
          prescriptionRefill: true,
          icdPrediction: true,
        },
      });
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleInputChange = (field: keyof PatientFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAnalysisTypeChange = (type: keyof PatientFormData["analysisTypes"], checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      analysisTypes: {
        ...prev.analysisTypes,
        [type]: checked,
      },
    }))
  }

  const handleAnalyze = async () => {
    if (!formData.patient_id || !formData.age) {
      alert("Please fill in required fields (Patient ID and Age)")
      return
    }

    if (!formData.analysisTypes.prescriptionRefill && !formData.analysisTypes.icdPrediction) {
      alert("Please select at least one analysis type.");
      return;
    }
    setIsAnalyzing(true);
    setAnalysisResults(null);
    let error = null;
    try {
      const requests = [];
      const histories: any[] = [];
      
      if (formData.analysisTypes.prescriptionRefill) {
        const refillPayload = {
          refill_request: {
            patient_id: formData.patient_id,
            medication: formData.medication,
            refill_request_date: formData.refill_request_date,
            last_filled: formData.last_filled,
          },
          patient_context: {
            last_visit: formData.last_visit,
            labs: formData.labs,
            diagnosis: formData.diagnosis,
            notes: formData.notes,
            age: formData.age,
            gender: formData.gender,
            allergies: formData.allergies,
            comorbidities: formData.comorbidities,
            refill_history: formData.refill_history,
          },
        };
        requests.push(
          fetch(`${API_BASE}/api/v1/evaluate-refill`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(refillPayload),
            credentials: "include",
          }).then(async (res) => {
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            // Collect history data instead of logging immediately
            if (authState.user) {
              const rawRefillStatus = data.refill_decision?.decision || data.decision || "unknown";
              const refillReasoning = data.reason;
              
              // Standardize status values for storage
              const standardizeStatus = (status: string) => {
                const lowerStatus = status.toLowerCase();
                if (lowerStatus === "approved" || lowerStatus === "approve") return "approve";
                if (lowerStatus === "denied" || lowerStatus === "deny") return "deny";
                if (lowerStatus === "pending" || lowerStatus === "escalated" || lowerStatus === "escalate") return "escalate";
                return status; // Keep other statuses as-is
              };
              
              const refillStatus = standardizeStatus(rawRefillStatus);
              
              // Set decision_by based on status
              let decisionBy = "AI";
      
              if (refillStatus === "escalate") {
                const doctorName = authState.user ? `${authState.user.first_name} ${authState.user.last_name}` : "Unknown";
                decisionBy = `AI -> Dr. ${doctorName}`;

              }
              
              histories.push({
                user_id: Number(authState.user.id),
                patient_id: formData.patient_id,
                action_type: "Prescription Refill",
                medication: formData.medication,
                status: refillStatus,
                decision_by: decisionBy,
                icd_codes: null,
                reasoning: refillReasoning,
                original_status: refillStatus,
                original_reasoning: refillReasoning,
              });
            }
            return data;
          })
        );
      }
      if (formData.analysisTypes.icdPrediction) {
        const icdPayload = {
          note: formData.icd_note,
          age: formData.age,
          sex: formData.gender,
          past_medical_history: formData.icd_pmh || "none",
        };

        requests.push(
          fetch(`${API_BASE}/api/v1/predict-icd`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(icdPayload),
            credentials: "include",
          }).then(async (res) => {
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            // Collect history data instead of logging immediately
            if (authState.user) {
              const icdStatus = data.predictions && data.predictions.length > 0 ? "Found" : "No Codes Found";
              const icdCodes = data.predictions
                ? data.predictions.map((pred: any) => pred.icd_code).join(', ')
                : null;
              const icdReasoning = data.predictions
                ? data.predictions.map((pred: any) => pred.justification).join(' | ')
                : null;
              histories.push({
                user_id: Number(authState.user.id),
                patient_id: formData.patient_id,
                action_type: "ICD Prediction",
                medication: formData.medication,
                status: icdStatus,
                decision_by: "AI",
                icd_codes: icdCodes,
                reasoning: icdReasoning,
                original_status: icdStatus,
                original_reasoning: icdReasoning,
              });
            }
            return data;
          })
        );
      }
      const results = await Promise.all(requests);
      const resultObj: any = {};
      let idx = 0;
      if (formData.analysisTypes.prescriptionRefill) {
        resultObj.refill = results[idx++];
      }
      if (formData.analysisTypes.icdPrediction) {
        resultObj.icd = results[idx++];
      }
      
      // Log all histories together after all analyses are complete
      if (histories.length > 0 && authState.user) {
        await fetch(`${API_BASE}/api/v1/history/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(histories),
          credentials: "include",
        });
        
        // Trigger dashboard refresh
        window.dispatchEvent(new CustomEvent('historyUpdated'));
      }

      // Update last_processed_request_date for the processed patient
      try {
        const patient = patients.find(p => p.patient_id === formData.patient_id);
        if (patient) {
          await fetch(`${API_BASE}/api/v1/patients/${formData.patient_id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...patient,
              last_processed_request_date: formData.refill_request_date
            }),
            credentials: "include",
          });
        }
      } catch (err) {
        console.error("Error updating patient processing date:", err);
      }
      
      setAnalysisResults(resultObj);
    } catch (err: any) {
      error = err.message || "Unknown error";
      setAnalysisResults({ error });
    } finally {
      setIsAnalyzing(false);
    }
  }

  const resetForm = () => {
    setFormData({
      patient_id: "",
      name: "",
      age: "",
      gender: "",
      last_visit: "",
      diagnosis: "",
      medication: "",
      icd_note: "",
      icd_pmh: "",
      refill_request_date: "",
      last_filled: "",
      labs: "",
      allergies: "",
      comorbidities: "",
      refill_history: "",
      notes: "",
      analysisTypes: {
        prescriptionRefill: true,
        icdPrediction: true,
      },
    })
    setQuery(""); // Clear the search input
    setShowDropdown(false); // Hide dropdown
    setAnalysisResults(null)
  }

  // Check if form is valid based on selected analysis types
  const isFormValid = () => {
    // Always required fields (demographics)
    if (!formData.patient_id || !formData.name || !formData.age || !formData.gender) {
      return false;
    }

    // Check if at least one analysis type is selected
    if (!formData.analysisTypes.prescriptionRefill && !formData.analysisTypes.icdPrediction) {
      return false;
    }

    // For prescription refill analysis
    if (formData.analysisTypes.prescriptionRefill) {
      if (!formData.medication || !formData.refill_request_date || !formData.last_filled || 
          !formData.last_visit || !formData.labs || !formData.diagnosis || !formData.notes || 
          !formData.allergies || !formData.comorbidities || !formData.refill_history) {
        return false;
      }
    }

    // For ICD prediction analysis - only clinical note is required
    if (formData.analysisTypes.icdPrediction) {
      if (!formData.icd_note) {
        return false;
      }
    }

    return true;
  };


  

  if (analysisResults) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Analysis Results - Patient {formData.patient_id}
                </CardTitle>
                <CardDescription>AI-powered clinical decision support results</CardDescription>
              </div>
              <Button variant="outline" onClick={resetForm}>
                New Analysis
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {analysisResults.error && (
              <div className="text-red-600 font-medium">Error: {analysisResults.error}</div>
            )}
            {analysisResults.refill && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Prescription Refill Decision</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    // Support both possible backend shapes
                    const refill = analysisResults.refill;
                    const d = (refill.refill_decision?.decision || refill.decision || '').toLowerCase();
                    const reason = refill.refill_decision?.reason ?? refill.reason;
                    const justification = refill.refill_decision?.justification ?? refill.justification;
                    const confidence = refill.confidence;
                    if (d || reason || justification || confidence) {
                      return <>
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold
                            ${d === 'approve' ? 'bg-green-100 text-green-800' : d === 'deny' ? 'bg-red-100 text-red-800' : d === 'escalate' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}
                          >
                            {(refill.refill_decision?.decision || refill.decision || 'N/A').toUpperCase()}
                          </span>
                          {typeof confidence === 'number' && (
                            <span className="text-sm text-muted-foreground">AI Confidence: {confidence}%</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 mb-2">
                          <span className="font-semibold">Reason:</span> {reason || 'N/A'}
                        </div>
                        {justification && (
                          <div className="text-sm text-gray-600">
                            <span className="font-semibold">Justification:</span> {justification}
                          </div>
                        )}
                      </>;
                    } else {
                      // fallback to raw JSON if unknown shape
                      return <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{JSON.stringify(refill, null, 2)}</pre>;
                    }
                  })()}
                </CardContent>
              </Card>
            )}
            {analysisResults.icd && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">ICD Code Prediction</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.isArray(analysisResults.icd.predictions) && analysisResults.icd.predictions.length > 0 ? (
                    analysisResults.icd.predictions.map((pred: any, i: number) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-blue-700 bg-blue-100 rounded px-3 py-1 text-sm">{pred.icd_code}</span>
                          <span className="text-sm text-gray-700 font-medium">{pred.description}</span>
                        </div>
                        {pred.justification && (
                          <div className="text-sm text-gray-600">
                            <span className="font-semibold">Justification:</span> {pred.justification}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No ICD predictions returned.</div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
          Patient Analysis
        </CardTitle>
        <CardDescription>
          Analyze individual patient data for prescription and ICD decisions using AI-powered clinical decision support.
        </CardDescription>
      </CardHeader>
      <CardContent>
          <div className="space-y-6">
          {/* Patient Autocomplete */}
            <div className="relative">
              <label className="block text-sm font-medium mb-2 text-muted-foreground">Search Patient</label>
            <input
              ref={inputRef}
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={patients.length === 0 ? "No patients available" : "Type name or ID..."}
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
                onFocus={() => {
                  // Only show dropdown if the input doesn't contain a selected patient's name and ID
                  const hasSelectedPatient = patients.some(p => query === `${p.name} (${p.patient_id})`);
                  if (!hasSelectedPatient) {
                    setShowDropdown(true);
                  }
                }}
              disabled={patients.length === 0}
            />
            {showDropdown && filteredPatients.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-background border border-input rounded-md shadow max-h-56 overflow-y-auto">
                {filteredPatients.map((p) => (
                  <li
                    key={p.patient_id}
                    className="px-4 py-2 cursor-pointer hover:bg-primary/10"
                    onMouseDown={() => handlePatientAutocomplete(p.patient_id)}
                  >
                    <div className="font-medium text-base">{p.name} <span className="text-xs text-muted-foreground">({p.patient_id})</span></div>
                    <div className="text-xs text-muted-foreground">Age: {p.age ?? "-"}, Last Visit: {p.last_visit ?? "-"}</div>
                  </li>
                ))}
              </ul>
            )}
            {showDropdown && query && filteredPatients.length === 0 && (
              <div className="absolute z-10 mt-1 w-full bg-background border border-input rounded-md shadow px-4 py-2 text-muted-foreground text-sm">No matches found</div>
            )}
          </div>

            {/* Demographics Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Patient Demographics</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
                  <label htmlFor="patient_id" className="text-sm font-medium">Patient ID <span className="text-red-500">*</span></label>
              <input
                id="patient_id"
                value={formData.patient_id}
                onChange={e => handleInputChange("patient_id", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Enter patient ID"
              />
            </div>
            <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">Name <span className="text-red-500">*</span></label>
              <input
                id="name"
                value={formData.name}
                onChange={e => handleInputChange("name", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
                  <label htmlFor="age" className="text-sm font-medium">Age <span className="text-red-500">*</span></label>
              <input
                id="age"
                type="number"
                value={formData.age}
                onChange={e => handleInputChange("age", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Enter age"
              />
            </div>
            <div className="space-y-2">
                  <label htmlFor="gender" className="text-sm font-medium">Gender <span className="text-red-500">*</span></label>
              <input
                id="gender"
                value={formData.gender}
                onChange={e => handleInputChange("gender", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Enter gender"
              />
            </div>
          </div>
            </div>

            {/* Medical Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Medical Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
                  <label htmlFor="diagnosis" className="text-sm font-medium">
                    Diagnosis 
                    {formData.analysisTypes.prescriptionRefill && <span className="text-red-500">*</span>}
                  </label>
            <input
              id="diagnosis"
              value={formData.diagnosis}
              onChange={e => handleInputChange("diagnosis", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Enter diagnosis"
            />
          </div>
          <div className="space-y-2">
                  <label htmlFor="comorbidities" className="text-sm font-medium">
                    Comorbidities 
                    {formData.analysisTypes.prescriptionRefill && <span className="text-red-500">*</span>}
                  </label>
            <input
              id="comorbidities"
              value={formData.comorbidities}
              onChange={e => handleInputChange("comorbidities", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Enter comorbidities"
            />
          </div>
          <div className="space-y-2">
                  <label htmlFor="allergies" className="text-sm font-medium">
                    Allergies 
                    {formData.analysisTypes.prescriptionRefill && <span className="text-red-500">*</span>}
                  </label>
            <input
              id="allergies"
              value={formData.allergies}
              onChange={e => handleInputChange("allergies", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Enter allergies"
            />
          </div>
          <div className="space-y-2">
                  <label htmlFor="labs" className="text-sm font-medium">
                    Lab Results 
                    {formData.analysisTypes.prescriptionRefill && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    id="labs"
                    value={formData.labs}
                    onChange={e => handleInputChange("labs", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Enter lab results"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="last_visit" className="text-sm font-medium">
                  Last Visit 
                  {formData.analysisTypes.prescriptionRefill && <span className="text-red-500">*</span>}
                </label>
                <input
                  id="last_visit"
                  type="date"
                  value={formData.last_visit}
                  onChange={e => handleInputChange("last_visit", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Enter last visit date"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="icd_note" className="text-sm font-medium">Clinical Note <span className="text-red-500">*</span></label>
            <textarea
              id="icd_note"
              value={formData.icd_note}
              onChange={e => handleInputChange("icd_note", e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Enter clinical note"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="icd_pmh" className="text-sm font-medium">Past Medical History</label>
            <input
              id="icd_pmh"
              value={formData.icd_pmh}
              onChange={e => handleInputChange("icd_pmh", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Enter past medical history"
            />
              </div>
          </div>
    
            {/* Refill Information Section - Only show if prescription refill is selected */}
            {formData.analysisTypes.prescriptionRefill && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Refill Information</h3>
                <div className="space-y-4">
          <div className="space-y-2">
                    <label htmlFor="medication" className="text-sm font-medium">Medication <span className="text-red-500">*</span></label>
            <input
              id="medication"
              value={formData.medication}
              onChange={e => handleInputChange("medication", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Enter medication"
            />
          </div>
                  <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
                      <label htmlFor="refill_request_date" className="text-sm font-medium">Date of Refill Request <span className="text-red-500">*</span></label>
              <input
                id="refill_request_date"
                type="date"
                value={formData.refill_request_date}
                onChange={e => handleInputChange("refill_request_date", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Enter refill request date"
              />
            </div>
            <div className="space-y-2">
                      <label htmlFor="last_filled" className="text-sm font-medium">Date of Last Fill <span className="text-red-500">*</span></label>
              <input
                id="last_filled"
                type="date"
                value={formData.last_filled}
                onChange={e => handleInputChange("last_filled", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Enter last filled date"
              />
            </div>
          </div>
          <div className="space-y-2">
                    <label htmlFor="refill_history" className="text-sm font-medium">Medication Refill History <span className="text-red-500">*</span></label>
            <input
              id="refill_history"
              value={formData.refill_history}
              onChange={e => handleInputChange("refill_history", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Enter refill history"
            />
                  </div>
            <div className="space-y-2">
                    <label htmlFor="notes" className="text-sm font-medium">Refill Notes <span className="text-red-500">*</span></label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={e => handleInputChange("notes", e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Enter notes"
            />
          </div>
          </div>
              </div>
            )}

            {/* Analysis Type Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Analysis Options</h3>
          <div className="space-y-2">
                <label className="text-sm font-medium">Analysis Type <span className="text-red-500">*</span></label>
                <div className="flex space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={formData.analysisTypes.prescriptionRefill}
                  onChange={e => handleAnalysisTypeChange("prescriptionRefill", e.target.checked)}
                />
                <span className="text-sm">Prescription Refill Decision</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={formData.analysisTypes.icdPrediction}
                  onChange={e => handleAnalysisTypeChange("icdPrediction", e.target.checked)}
                />
                <span className="text-sm">ICD Code Prediction</span>
              </label>
            </div>
          </div>
            </div>

            {/* Validation Errors */}
            {/* Removed validation error display - relying on red asterisks and field styling instead */}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
            <Button
              onClick={handleAnalyze}
                disabled={isAnalyzing || !isFormValid()}
                className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                </>
              ) : (
                <>
                    <Search className="mr-2 h-4 w-4" />
                    Analyze Patient
                </>
              )}
            </Button>
              <Button
                variant="outline"
                onClick={resetForm}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                New Analysis
              </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <CardDescription>Your recent patient analyses</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {[
            { id: "P-1001", time: "2 hours ago", status: "Approved" },
            { id: "P-1002", time: "3 hours ago", status: "Denied" },
            { id: "P-1003", time: "5 hours ago", status: "Escalated" },
          ].map((patient, i) => (
            <li key={i} className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium leading-none">Patient #{patient.id}</p>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      patient.status === "Approved"
                        ? "bg-green-100 text-green-800"
                        : patient.status === "Denied"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {patient.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Analyzed {patient.time}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
