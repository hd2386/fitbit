"use client";

import React, { useState } from "react";
import TimePicker from "@/components/local/TimePicker"; // Assuming @ is configured for src path

export default function HomePage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTimeSubmit = async (
    startTime: string,
    endTime: string,
    date: string
  ) => {
    setLoading(true);
    setError(null);
    setApiResponse(null);

    try {
      const response = await fetch("/api/fitbit-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ startTime, endTime, date }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("API Error from page:", data);
        setError(data.error || "Ein Fehler ist aufgetreten.");
        setApiResponse(data); // Store full error response
      } else {
        setApiResponse(data);
      }
    } catch (err) {
      console.error("Fetch Error from page:", err);
      setError("Netzwerkfehler oder Server antwortet nicht.");
      setApiResponse({
        error: "Netzwerkfehler",
        details: (err as Error).message,
      });
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center">
      <TimePicker
        onTimeSubmit={handleTimeSubmit}
        loading={loading}
        apiResponse={apiResponse}
      />
      {/* error state is now handled within TimePicker's apiResponse display */}
    </main>
  );
}
