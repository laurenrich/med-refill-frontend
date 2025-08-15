import React, { useState } from "react";
import { usePatients } from "@/context/PatientContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertCircle, Clock, Users, Play } from "lucide-react";

const BatchTab: React.FC = () => {
    const [selected, setSelected] = useState<any[]>([]);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { patients } = usePatients();

    const handleSelect = (patient: any) => {
        setSelected((prev) =>
            prev.some((p: any) => p.refill_request_data.refill_request.patient_id === patient.refill_request_data.refill_request.patient_id)
                ? prev.filter((p: any) => p.refill_request_data.refill_request.patient_id !== patient.refill_request_data.refill_request.patient_id)
                : [...prev, patient]
        );
    };

    // Calculate queue stats
    const queueStats = {
        total: patients.length,
        selected: selected.length,
        ready: patients.length, // All patients are ready for batch processing
        processed: result?.results?.length || 0
    };

    return (
        <div className="flex gap-6">
            {/* Left: Patient Table - Now Narrower */}
            <div className="flex-1 max-w-4xl">
                <Card className="border-0 bg-gray-50 shadow-[0_2px_4px_rgba(0,0,0,0.05)] rounded-xl">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-gray-900">
                            <Users className="h-5 w-5 text-primary" />
                            Batch Patient Processing
                        </CardTitle>
                        <CardDescription className="text-gray-500">
                            Select patients for batch analysis
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="rounded-lg border border-gray-100 bg-white overflow-hidden">
                            <table className="w-full caption-bottom text-sm">
                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 transition-colors">
                                        <th className="h-8 px-4 text-left font-normal text-gray-500 text-sm">Select</th>
                                        <th className="h-8 px-4 text-left font-normal text-gray-500 text-sm">Patient ID</th>
                                        <th className="h-8 px-4 text-left font-normal text-gray-500 text-sm">Name</th>
                                        <th className="h-8 px-4 text-left font-normal text-gray-500 text-sm">Age</th>
                                        <th className="h-8 px-4 text-left font-normal text-gray-500 text-sm">Gender</th>
                                        <th className="h-8 px-4 text-left font-normal text-gray-500 text-sm">Medication</th>
                    </tr>
                </thead>
                <tbody>
                    {patients.map((p: any) => (
                                        <tr key={p.refill_request_data.refill_request.patient_id} className="border-b transition-colors hover:bg-gray-50/50">
                                            <td className="p-4 align-middle">
                                <input
                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={selected.some((sel: any) => sel.refill_request_data.refill_request.patient_id === p.refill_request_data.refill_request.patient_id)}
                                    onChange={() => handleSelect(p)}
                                />
                            </td>
                                            <td className="p-4 align-middle font-medium">{p.refill_request_data.refill_request.patient_id}</td>
                                            <td className="p-4 align-middle">{p.name}</td>
                                            <td className="p-4 align-middle">{p.refill_request_data.patient_context.age}</td>
                                            <td className="p-4 align-middle">{p.refill_request_data.patient_context.gender}</td>
                                            <td className="p-4 align-middle">{p.refill_request_data.refill_request.medication}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
                        </div>

                        <div className="mt-4">
                            <Button
                onClick={async () => {
                    setLoading(true);
                    setError(null);
                    setResult(null);
                    const payload = {
                        patients: selected.map(({ name, ...rest }) => rest)
                    };
                    try {
                        const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
                        const response = await fetch(`${API_BASE}/api/v1/combined_icd_refill`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                            credentials: 'include',
                        });
                        if (!response.ok) {
                            throw new Error(await response.text());
                        }
                        const data = await response.json();
                        setResult(data);
                    } catch (err: any) {
                        setError(err.message || "Unknown error");
                    } finally {
                        setLoading(false);
                    }
                }}
                                disabled={selected.length === 0 || loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 rounded-xl shadow-sm hover:shadow-md py-2.5"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2 h-4 w-4" />
                Process All Selected Patients
                                    </>
                                )}
                            </Button>
                        </div>

                        {error && (
                            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600">
                                Error: {error}
                            </div>
                        )}

                        {result && result.results && (
                            <div className="mt-6 space-y-4">
                                {result.results.map((res: any, idx: number) => {
                const patient = selected[idx];
                const icdPreds = res.icd_prediction?.predictions || [];
                const refillDecision = res.refill_decision?.decision || "N/A";
                                    let refillBg = "bg-gray-100 text-gray-800";
                                    if (refillDecision.toLowerCase() === "approve") refillBg = "bg-green-100 text-green-800";
                                    else if (refillDecision.toLowerCase() === "escalate") refillBg = "bg-yellow-100 text-yellow-800";
                                    else if (refillDecision.toLowerCase() === "deny") refillBg = "bg-red-100 text-red-800";
                
                return (
                                        <details key={idx} className="rounded-xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
                                            <summary className="cursor-pointer font-semibold p-4 hover:bg-gray-50 transition-colors">
                                                Results: {patient ? patient.name : `Patient ${idx + 1}`}
                        </summary>
                                            <div className="p-4 border-t border-gray-100 space-y-4">
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 mb-2">Refill Decision</h4>
                                                    <div className={`${refillBg} rounded-lg px-3 py-2 font-medium text-sm`}>
                                                        {refillDecision.charAt(0).toUpperCase() + refillDecision.slice(1)}
                                                    </div>
                                                    {res.refill_decision?.reason && (
                                                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded border">
                                                            {res.refill_decision.reason}
                                                        </p>
                                                    )}
                                                </div>
                                                
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 mb-2">ICD Predictions</h4>
                                                    {icdPreds.length === 0 ? (
                                                        <p className="text-sm text-gray-500">No ICD predictions returned.</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {icdPreds.map((pred: any, i: number) => (
                                                                <div key={i} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-mono font-semibold text-blue-900">{pred.icd_code}</span>
                                                                        <span className="text-sm text-blue-700">{pred.description}</span>
                                                                    </div>
                                                                    {pred.justification && (
                                                                        <p className="text-xs text-blue-600">{pred.justification}</p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </details>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Right: Queue Stats Sidebar */}
            <div className="w-80 flex-shrink-0">
                <div className="space-y-6">
                    {/* Queue Stats */}
                    <Card className="border-0 bg-gray-50 shadow-[0_2px_4px_rgba(0,0,0,0.05)] rounded-xl">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-gray-900">
                                <RefreshCw className="h-5 w-5 text-primary" />
                                Batch Queue Status
                            </CardTitle>
                            <CardDescription className="text-gray-500">
                                Current processing status
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-4">
                                {/* Total Patients */}
                                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Users className="h-4 w-4 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Total</p>
                                            <p className="text-xs text-gray-600">Available patients</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-bold text-gray-900">{queueStats.total}</span>
                                </div>

                                {/* Selected for Processing */}
                                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                            <Clock className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-blue-900">Selected</p>
                                            <p className="text-xs text-blue-600">Ready for processing</p>
                            </div>
                                    </div>
                                    <span className="text-lg font-bold text-blue-900">{queueStats.selected}</span>
                                </div>

                                {/* Processed */}
                                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div>
                                            <p className="text-sm font-medium text-green-900">Processed</p>
                                            <p className="text-xs text-green-600">Completed analysis</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-bold text-green-900">{queueStats.processed}</span>
                                </div>

                                {/* Processing Status */}
                                {loading && (
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                                                <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-yellow-900">Processing</p>
                                                <p className="text-xs text-yellow-600">Analysis in progress</p>
                                            </div>
                                        </div>
                                        <span className="text-lg font-bold text-yellow-900">...</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                        </div>
        </div>
    );
};

export default BatchTab;






