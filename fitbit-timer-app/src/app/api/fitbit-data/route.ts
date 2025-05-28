import { NextRequest, NextResponse } from "next/server";

// Helper function to format time (ensure two digits)
const formatTime = (value: number): string => {
  return value.toString().padStart(2, "0");
};

export async function POST(request: NextRequest) {
  const pythonApiUrl = process.env.PYTHON_API_URL;

  if (!pythonApiUrl) {
    return NextResponse.json(
      { error: "Python API URL is not configured." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json(); // Gets { startTime, endTime, date } from client

    const response = await fetch(`${pythonApiUrl}/get-heart-rate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseData = await response.json(); // Get the JSON response from Python server

    if (!response.ok) {
      console.error(
        "Error from Python /get-heart-rate:",
        response.status,
        responseData
      );
      return NextResponse.json(responseData, { status: response.status });
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Network error fetching from Python /get-heart-rate:", error);
    return NextResponse.json(
      {
        error: "Network error connecting to Python server for heart rate data",
        details: (error as Error).message,
      },
      { status: 503 } // Service Unavailable
    );
  }
}
