import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Search, CheckCircle, AlertCircle, Clock, Pencil, Users, ArrowUpRight } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"


function isPatientReady(patient: any) {
  const requiredFields = [
    "patient_id",
    "name",
    "age",
    "gender",
    "diagnosis",
    "comorbidities",
    "allergies",
    "icd_notes",
    "labs",
    "medication",
    "refill_request_date",
    "last_filled",
    "refill_history",
    "refill_notes"
  ];
  for (const field of requiredFields) {
    const value = patient[field];
    if (value === null || value === undefined || value.toString().trim() === "") {
      return false;
    }
  }
  return true;
}

function getPatientStatus(patient: any) {
  return isPatientReady(patient)
    ? { label: "Ready", color: "bg-blue-100 text-blue-800" }
    : { label: "Incomplete", color: "bg-yellow-100 text-yellow-800" };
}

export function BatchProcessing() {
  const [selectedPatients, setSelectedPatients] = useState<any[]>([])
  const [processingResults, setProcessingResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)
  const [activeResultTab, setActiveResultTab] = useState("all")
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [patients, setPatients] = useState<any[]>([]);
  const [editPatient, setEditPatient] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any | null>(null);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<"unprocessed" | "processed">("unprocessed");
  const [searchQuery, setSearchQuery] = useState("");
  const { authState } = useAuth();

  useEffect(() => {
    if (!authState.isAuthenticated) {
      setError("Please log in to view patients");
      setFetching(false);
      return;
    }

    setFetching(true);
    fetch(`${API_BASE}/api/v1/patients`, { credentials: "include" })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Please log in to view patients");
          }
          throw new Error("Failed to fetch patients");
        }
        return res.json();
      })
      .then((allPatients) => {
        // Check if allPatients is an array
        if (!Array.isArray(allPatients)) {
          console.error("Expected array but got:", allPatients);
          setPatients([]);
          return;
        }
        
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
      .catch(err => setError(err.message))
      .finally(() => setFetching(false));
  }, [authState.isAuthenticated]);

  // Separate patients into processed and unprocessed
  const unprocessedPatients = patients.filter((patient: any) => {
    return !patient.last_processed_request_date || 
           patient.last_processed_request_date !== patient.refill_request_date;
  });
  
  const processedPatients = patients.filter((patient: any) => {
    return patient.last_processed_request_date && 
           patient.last_processed_request_date === patient.refill_request_date;
  });

  // Filter patients based on search query
  const filterPatients = (patientList: any[]) => {
    if (!searchQuery.trim()) return patientList;
    
    const query = searchQuery.toLowerCase();
    return patientList.filter((patient: any) => 
      patient.patient_id?.toLowerCase().includes(query) ||
      patient.name?.toLowerCase().includes(query) ||
      patient.medication?.toLowerCase().includes(query)
    );
  };

  const filteredUnprocessedPatients = filterPatients(unprocessedPatients);
  const filteredProcessedPatients = filterPatients(processedPatients);
  const currentPatients = activeTab === "unprocessed" ? filteredUnprocessedPatients : filteredProcessedPatients;

  if (fetching) return <div className="p-4 text-blue-600">Loading patients...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!Array.isArray(patients)) return <div className="p-4 text-gray-600">No patients found.</div>;

  const togglePatientSelection = (patient: any) => {
    setSelectedPatients((prev) =>
      prev.some((p: any) => p.patient_id === patient.patient_id)
        ? prev.filter((p: any) => p.patient_id !== patient.patient_id)
        : [...prev, patient]
    );
  };

  const processBatch = async () => {
    setShowResults(false);
    setProcessingResults([]);
    setLoading(true);
    setError(null);
    try {
      const payload = {
        patients: selectedPatients.map((p) => ({
          icd_request_data: {
            note: p.icd_notes || "",
            age: p.age,
            sex: p.gender,
            past_medical_history: p.comorbidities || "",
          },
          refill_request_data: {
            refill_request: {
              patient_id: p.patient_id,
              medication: p.medication,
              refill_request_date: p.refill_request_date,
              last_filled: p.last_filled,
            },
            patient_context: {
              last_visit: p.last_visit,
              labs: p.labs,
              diagnosis: p.diagnosis,
              notes: p.refill_notes || "",
              age: p.age,
              gender: p.gender,
              allergies: p.allergies,
              comorbidities: p.comorbidities,
              refill_history: p.refill_history,
            }
          }
        }))
      };
      const response = await fetch(`${API_BASE}/api/v1/combined_icd_refill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setProcessingResults(data.results || []);
      setShowResults(true);

      if (authState.user) {
        const userId = authState.user.id;
        const histories: any[] = [];
        
        (data.results || []).forEach((result: any, idx: number) => {
          const patient = selectedPatients[idx];
          
          // Add refill history entry
          const rawRefillStatus = result.refill_decision?.decision || "unknown";
          const refillReasoning = result.refill_decision?.reason;
          
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
          console.log("Raw refill status:", rawRefillStatus, "Standardized:", refillStatus);
          if (refillStatus === "escalate") {
            // Only use arrow if AI escalated, not if user changed it
            const doctorName = authState.user ? `${authState.user.first_name} ${authState.user.last_name}` : "Unknown";
            decisionBy = `AI -> Dr. ${doctorName}`;
            console.log("Setting decision_by to:", decisionBy);
          }
          
          histories.push({
            user_id: Number(userId),
            patient_id: patient.patient_id,
            action_type: "Prescription Refill",
            medication: patient.medication,
            status: refillStatus,
            decision_by: decisionBy,
            icd_codes: null,
            reasoning: refillReasoning,
            original_status: refillStatus,
            original_reasoning: refillReasoning,
          });
          
          // Add ICD history entry
          const icdStatus = result.icd_prediction?.predictions && result.icd_prediction.predictions.length > 0 ? "Found" : "No Codes Found";
          const icdCodes = result.icd_prediction?.predictions
            ? result.icd_prediction.predictions.map((pred: any) => pred.icd_code).join(', ')
            : null;
          const icdReasoning = result.icd_prediction?.predictions
            ? result.icd_prediction.predictions.map((pred: any) => pred.justification).join(' | ')
            : null;
          histories.push({
            user_id: Number(userId),
            patient_id: patient.patient_id,
            action_type: "ICD Prediction",
            medication: patient.medication,
            status: icdStatus,
            decision_by: "AI",
            icd_codes: icdCodes,
            reasoning: icdReasoning,
            original_status: icdStatus,
            original_reasoning: icdReasoning,
          });
        });
        if (histories.length > 0) {
          console.log("Sending histories to backend:", histories);
          const historyRes = await fetch(`${API_BASE}/api/v1/history/batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(histories),
            credentials: "include",
          });
          if (!historyRes.ok) {
            const errorText = await historyRes.text();
            console.error("History API error:", errorText);
          } else {
            // Trigger dashboard refresh
            window.dispatchEvent(new CustomEvent('historyUpdated'));
          }
        }

        // Update last_processed_request_date for all processed patients
        const updatePromises = selectedPatients.map(async (patient: any) => {
          try {
            const updateRes = await fetch(`${API_BASE}/api/v1/patients/${patient.patient_id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...patient,
                last_processed_request_date: patient.refill_request_date
              }),
              credentials: "include",
            });
            if (!updateRes.ok) {
              console.error(`Failed to update patient ${patient.patient_id}`);
            }
          } catch (err) {
            console.error(`Error updating patient ${patient.patient_id}:`, err);
          }
        });

        await Promise.all(updatePromises);

        // Refresh the patient list
        const refreshRes = await fetch(`${API_BASE}/api/v1/patients`, { credentials: "include" });
        if (refreshRes.ok) {
          const allPatients = await refreshRes.json();
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
        } else {
          console.error("Failed to refresh patient list:", await refreshRes.text());
        }

      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!showResults ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Patient Batch Processing
            </CardTitle>
            <CardDescription>
              Select patients to process in batch for prescription refill decisions and ICD code predictions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Tabs for processed vs unprocessed */}
              <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                <button
                  onClick={() => {
                    setActiveTab("unprocessed");
                    setSelectedPatients([]);
                  }}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    activeTab === "unprocessed"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Unprocessed ({unprocessedPatients.length})
                </button>
                <button
                  onClick={() => {
                    setActiveTab("processed");
                    setSelectedPatients([]);
                  }}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    activeTab === "processed"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Processed ({processedPatients.length})
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="search"
                      placeholder="Search patients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{selectedPatients.length} patients selected</span>
                  {activeTab === "unprocessed" && (
                    <Button onClick={processBatch} disabled={selectedPatients.length === 0 || loading}>
                      {loading ? "Processing..." : "Process Selected"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPatients([...currentPatients]);
                            } else {
                              setSelectedPatients([]);
                            }
                          }}
                          checked={selectedPatients.length === currentPatients.length && currentPatients.length > 0}
                          disabled={activeTab === "processed"}
                        />
                      </TableHead>
                      <TableHead>Patient ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Last Visit</TableHead>
                      {activeTab === "processed" && <TableHead>Processed Date</TableHead>}
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12">Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPatients.map((patient: any) => {
                      const status = getPatientStatus(patient);
                      const isReady = isPatientReady(patient);
                      return (
                        <TableRow key={patient.patient_id} className="cursor-pointer">
                          <TableCell>
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300"
                              checked={selectedPatients.some((p: any) => p.patient_id === patient.patient_id)}
                              onChange={() => togglePatientSelection(patient)}
                              disabled={!isReady || activeTab === "processed"}
                            />
                          </TableCell>
                          <TableCell className="font-medium" onClick={isReady ? () => togglePatientSelection(patient) : undefined}>
                            {patient.patient_id}
                          </TableCell>
                          <TableCell onClick={isReady ? () => togglePatientSelection(patient) : undefined}>{patient.name}</TableCell>
                          <TableCell onClick={isReady ? () => togglePatientSelection(patient) : undefined}>{patient.age}</TableCell>
                          <TableCell onClick={isReady ? () => togglePatientSelection(patient) : undefined}>{patient.last_visit}</TableCell>
                          {activeTab === "processed" && (
                            <TableCell onClick={isReady ? () => togglePatientSelection(patient) : undefined}>
                              {patient.last_processed_request_date}
                            </TableCell>
                          )}
                          <TableCell onClick={isReady ? () => togglePatientSelection(patient) : undefined}>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </TableCell>
                          <TableCell className="w-12">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditPatient(patient);
                                setEditForm({
                                  name: patient.name,
                                  patient_id: patient.patient_id,
                                  medication: patient.medication,
                                  refill_request_date: patient.refill_request_date,
                                  last_filled: patient.last_filled,
                                  last_visit: patient.last_visit,
                                  labs: patient.labs,
                                  diagnosis: patient.diagnosis,
                                  icd_notes: patient.icd_notes,
                                  refill_notes: patient.refill_notes,
                                  age: patient.age,
                                  gender: patient.gender,
                                  allergies: patient.allergies,
                                  comorbidities: patient.comorbidities,
                                  refill_history: patient.refill_history,
                                  notes: patient.notes,
                                });
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {error && <div className="mt-4 text-red-600">{error}</div>}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Batch Processing Results</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowResults(false)}>
                Back to Selection
              </Button>
            </div>
          </div>

          <Tabs value={activeResultTab} onValueChange={setActiveResultTab}>
            <TabsList>
              <TabsTrigger value="all">All Results ({processingResults.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="pt-4">
              <ResultsTable
                results={processingResults}
                onViewDetails={(result, idx) => setSelectedResult({ result, patient: selectedPatients[idx] })}
                selectedPatients={selectedPatients}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      <Dialog open={!!selectedResult} onOpenChange={(open) => !open && setSelectedResult(null)}>
        {selectedResult && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Analysis Results - Patient {selectedResult.patient?.patient_id}
              </DialogTitle>
              <DialogDescription>AI-powered clinical decision support results</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Refill Decision */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Prescription Refill Decision</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                      (selectedResult.result.refill_decision?.decision || '').toLowerCase() === 'approve'
                        ? 'bg-green-100 text-green-800'
                        : (selectedResult.result.refill_decision?.decision || '').toLowerCase() === 'deny'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {(selectedResult.result.refill_decision?.decision || 'N/A').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">Reason:</span> {selectedResult.result.refill_decision?.reason || 'N/A'}
                  </div>
                </CardContent>
              </Card>

              {/* ICD Predictions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">ICD Code Prediction</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(selectedResult.result.icd_prediction?.predictions || []).length > 0 ? (
                    (selectedResult.result.icd_prediction?.predictions || []).map((pred: any, i: number) => (
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
            </div>
            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => setSelectedResult(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!editPatient} onOpenChange={(open) => { if (!open) setEditPatient(null); }}>
        {editPatient && (
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Patient</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={async e => {
                e.preventDefault();
      
                await fetch(`${API_BASE}/api/v1/patients/${editForm.patient_id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(editForm),
                  credentials: "include",
                });
              
                setPatients(prev =>
                  prev.map(p =>
                    p.patient_id === editForm.patient_id ? { ...editForm } : p
                  )
                );
                setEditPatient(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium">Patient ID</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.patient_id} onChange={e => setEditForm({ ...editForm, patient_id: e.target.value })} placeholder="Enter patient ID" />
              </div>
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Enter name" />
              </div>
              <div>
                <label className="block text-sm font-medium">Age</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.age} onChange={e => setEditForm({ ...editForm, age: e.target.value })} placeholder="Enter age" />
              </div>
              <div>
                <label className="block text-sm font-medium">Gender</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })} placeholder="Enter gender" />
              </div>
              <div>
                <label className="block text-sm font-medium">Diagnosis</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.diagnosis} onChange={e => setEditForm({ ...editForm, diagnosis: e.target.value })} placeholder="Enter diagnosis" />
              </div>
              <div>
                <label className="block text-sm font-medium">Comorbidities</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.comorbidities} onChange={e => setEditForm({ ...editForm, comorbidities: e.target.value })} placeholder="Enter comorbidities" />
              </div>
              <div>
                <label className="block text-sm font-medium">Allergies</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.allergies} onChange={e => setEditForm({ ...editForm, allergies: e.target.value })} placeholder="Enter allergies" />
              </div>
              <div>
                <label className="block text-sm font-medium">Clinical Note</label>
                <textarea className="w-full border rounded px-2 py-1" value={editForm.icd_notes} onChange={e => setEditForm({ ...editForm, icd_notes: e.target.value })} placeholder="Enter clinical note" />
              </div>
              <div>
                <label className="block text-sm font-medium">Past Medical History</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.icd_pmh || ''} onChange={e => setEditForm({ ...editForm, icd_pmh: e.target.value })} placeholder="Enter past medical history" />
              </div>
              <div>
                <label className="block text-sm font-medium">Lab Results</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.labs} onChange={e => setEditForm({ ...editForm, labs: e.target.value })} placeholder="Enter lab results" />
              </div>
              <div>
                <label className="block text-sm font-medium">Medication</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.medication} onChange={e => setEditForm({ ...editForm, medication: e.target.value })} placeholder="Enter medication" />
              </div>
              <div>
                <label className="block text-sm font-medium">Date of Refill Request</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.refill_request_date} onChange={e => setEditForm({ ...editForm, refill_request_date: e.target.value })} placeholder="mm/dd/yyyy" />
              </div>
              <div>
                <label className="block text-sm font-medium">Date of Last Fill</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.last_filled} onChange={e => setEditForm({ ...editForm, last_filled: e.target.value })} placeholder="mm/dd/yyyy" />
              </div>
              <div>
                <label className="block text-sm font-medium">Medication Refill History</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.refill_history} onChange={e => setEditForm({ ...editForm, refill_history: e.target.value })} placeholder="Enter refill history" />
              </div>
              <div>
                <label className="block text-sm font-medium">Refill Notes</label>
                <textarea className="w-full border rounded px-2 py-1" value={editForm.refill_notes} onChange={e => setEditForm({ ...editForm, refill_notes: e.target.value })} placeholder="Enter refill notes" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditPatient(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

function ResultsTable({ results, onViewDetails, selectedPatients }: { results: any[]; onViewDetails: (result: any, idx: number) => void; selectedPatients: any[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Prescription Decision</TableHead>
            <TableHead>ICD Codes</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result, idx) => {
            const patient = selectedPatients?.[idx];
            const decision = result.refill_decision?.decision || "";
            const d = decision.toLowerCase();
            return (
              <TableRow key={patient?.patient_id || result.patientId || result.patient_id} className="hover:bg-transparent">
                <TableCell className="font-medium">{patient?.patient_id}</TableCell>
                <TableCell>{patient?.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {d === "approve" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : d === "deny" ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : d === "escalate" || d === "review required" ? (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    ) : null}
                    {decision}
                  </div>
                </TableCell>
                <TableCell>{(result.icd_prediction?.predictions?.map((p: any) => p.icd_code).join(", "))}</TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onViewDetails(result, idx)}
                    className="flex items-center gap-1"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>View</span>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  )
}
