import React, { useState } from "react";
import { usePatients } from "@/context/PatientContext";

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

    return (
        <div>
            <h2 className="text-xl font-bold mb-4">Batch Patient Processing</h2>
            <table className="min-w-full border mt-4">
                <thead>
                    <tr>
                        <th className="border px-2 py-1"></th>
                        <th className="border px-2 py-1">Patient ID</th>
                        <th className="border px-2 py-1">Name</th>
                        <th className="border px-2 py-1">Age</th>
                        <th className="border px-2 py-1">Gender</th>
                        <th className="border px-2 py-1">Last Visit</th>
                        <th className="border px-2 py-1">Medication</th>
                    </tr>
                </thead>
                <tbody>
                    {patients.map((p: any) => (
                        <tr key={p.refill_request_data.refill_request.patient_id}>
                            <td className="border px-2 py-1">
                                <input
                                    type="checkbox"
                                    checked={selected.some((sel: any) => sel.refill_request_data.refill_request.patient_id === p.refill_request_data.refill_request.patient_id)}
                                    onChange={() => handleSelect(p)}
                                />
                            </td>
                            <td className="border px-2 py-1">{p.refill_request_data.refill_request.patient_id}</td>
                            <td className="border px-2 py-1">{p.name}</td>
                            <td className="border px-2 py-1">{p.refill_request_data.patient_context.age}</td>
                            <td className="border px-2 py-1">{p.refill_request_data.patient_context.gender}</td>
                            <td className="border px-2 py-1">{p.refill_request_data.patient_context.last_visit}</td>
                            <td className="border px-2 py-1">{p.refill_request_data.refill_request.medication}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <button
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                disabled={selected.length === 0 || loading}
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
            >
                Process All Selected Patients
            </button>

            {loading && <div className="mt-4 text-blue-600">Processing...</div>}
            {error && <div className="mt-4 text-red-600">Error: {error}</div>}

            {result && result.results && result.results.map((res: any, idx: number) => {
                const patient = selected[idx];
                const icdPreds = res.icd_prediction?.predictions || [];
                const refillDecision = res.refill_decision?.decision || "N/A";
                let refillBg = "bg-gray-100";
                if (refillDecision.toLowerCase() === "approve") refillBg = "bg-green-100";
                else if (refillDecision.toLowerCase() === "escalate") refillBg = "bg-yellow-100";
                else if (refillDecision.toLowerCase() === "deny") refillBg = "bg-red-100";

                
                return (
                    <details key={idx} className="mb-4 rounded border p-4 bg-white shadow">
                        <summary className="cursor-pointer font-semibold">
                            Detailed Results: {patient ? patient.name : `Patient ${idx + 1}`}
                        </summary>
                        <div className="mt-4">
                            <h4 className="font-bold text-lg mb-2">Refill Decision</h4>
                            <div className={`${refillBg} rounded px-4 py-2 mb-2 font-medium`}>
                                Refill Decision: {refillDecision.charAt(0).toUpperCase() + refillDecision.slice(1)}
                            </div>
                            <div className="mb-4">
                                <span className="font-semibold">Reason:</span> {res.refill_decision?.reason || "N/A"}
                            </div>
                            <h4 className="font-bold text-lg mb-2">ICD Predictions</h4>
                            {icdPreds.length === 0 && <div className="text-gray-500">No ICD predictions returned.</div>}
                            {icdPreds.map((pred: any, i: number) => (
                                <div key={i} className="mb-3">
                                    <div className="bg-blue-100 rounded px-4 py-2 font-mono mb-1">
                                        <span className="font-bold">{pred.icd_code}</span>: {pred.description}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Justification:</span> {pred.justification}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </details>
                );
            })}
        </div>
    );
};

export default BatchTab;






