import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const pythonApiUrl = process.env.PYTHON_API_URL;

  if (!pythonApiUrl) {
    return NextResponse.json(
      { error: "Python API URL is not configured." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${pythonApiUrl}/start-oauth`); // Python endpoint to get auth URL
    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        "Error from Python /start-oauth:",
        response.status,
        errorData
      );
      return NextResponse.json(
        {
          error: "Failed to get authorization URL from Python server",
          details: errorData,
        },
        { status: response.status }
      );
    }
    const data = await response.json(); // Expects { authorizationUrl: "..." }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Network error fetching from Python /start-oauth:", error);
    return NextResponse.json(
      {
        error: "Network error connecting to Python server",
        details: (error as Error).message,
      },
      { status: 503 } // Service Unavailable
    );
  }
}
