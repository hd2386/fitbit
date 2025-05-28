"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { de, enAU } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface TimePickerProps {
  onTimeSubmit: (startTime: string, endTime: string, date: string) => void;
  loading: boolean;
  apiResponse: any; // Can be more specific based on actual response structure
}

interface TimeValue {
  hours: number;
  minutes: number;
  seconds: number;
}

const TimePicker: React.FC<TimePickerProps> = ({
  onTimeSubmit,
  loading,
  apiResponse,
}) => {
  const initialTime = (): TimeValue => ({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [startTime, setStartTime] = useState<TimeValue>(initialTime());
  const [endTime, setEndTime] = useState<TimeValue>(initialTime());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check for OAuth success/error query params from Python redirect
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get("oauth_success") === "false") {
      setAuthError(
        queryParams.get("error_message") ||
          "Fitbit authorization failed on Python server."
      );
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (queryParams.get("oauth_success") === "true") {
      // Optionally show a success message, then clean up URL
      // For now, just clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const formatTimeUnit = (unit: number): string =>
    unit.toString().padStart(2, "0");

  const handleTimeChange = (
    type: "start" | "end",
    unit: "hours" | "minutes" | "seconds",
    value: number
  ) => {
    const setter = type === "start" ? setStartTime : setEndTime;
    let newUnitValue = parseInt(value.toString(), 10);

    if (isNaN(newUnitValue)) {
      newUnitValue = 0;
    }

    // Ensure minimum value is 0
    newUnitValue = Math.max(0, newUnitValue);

    setter((prevTime) => {
      let newTime = { ...prevTime };

      if (unit === "hours") {
        // Hour overflow: if >= 24, reset to 0
        if (newUnitValue >= 24) {
          newTime.hours = 0;
        } else {
          newTime.hours = newUnitValue;
        }
      } else if (unit === "minutes") {
        // Minute overflow: if >= 60, add 1 to hours and set minutes to 0
        if (newUnitValue >= 60) {
          const extraHours = Math.floor(newUnitValue / 60);
          const remainingMinutes = newUnitValue % 60;

          let newHours = newTime.hours + extraHours;
          // Apply hour overflow rule
          if (newHours >= 24) {
            newHours = newHours % 24;
          }

          newTime.hours = newHours;
          newTime.minutes = remainingMinutes;
        } else {
          newTime.minutes = newUnitValue;
        }
      } else if (unit === "seconds") {
        // Second overflow: if >= 60, add to minutes and set seconds to remainder
        if (newUnitValue >= 60) {
          const extraMinutes = Math.floor(newUnitValue / 60);
          const remainingSeconds = newUnitValue % 60;

          let newMinutes = newTime.minutes + extraMinutes;
          let newHours = newTime.hours;

          // Apply minute overflow rule
          if (newMinutes >= 60) {
            const extraHours = Math.floor(newMinutes / 60);
            newMinutes = newMinutes % 60;
            newHours += extraHours;

            // Apply hour overflow rule
            if (newHours >= 24) {
              newHours = newHours % 24;
            }
          }

          newTime.hours = newHours;
          newTime.minutes = newMinutes;
          newTime.seconds = remainingSeconds;
        } else {
          newTime.seconds = newUnitValue;
        }
      }

      return newTime;
    });
  };

  const handleManualInputChange = (
    type: "start" | "end",
    unit: "hours" | "minutes" | "seconds",
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseInt(event.target.value, 10);
    handleTimeChange(type, unit, value);
  };

  const renderTimeSelector = (type: "start" | "end", timeValue: TimeValue) => {
    const timeUnits: (keyof TimeValue)[] = ["hours", "minutes", "seconds"];
    const labels = {
      hours: "hours",
      minutes: "minute",
      seconds: "second",
    };

    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="text-4xl font-bold text-primary mb-6">
          {formatTimeUnit(timeValue.hours)} :{" "}
          {formatTimeUnit(timeValue.minutes)} :{" "}
          {formatTimeUnit(timeValue.seconds)}
        </div>
        <div className="grid grid-cols-3 gap-x-3 w-full max-w-xs">
          {timeUnits.map((unit) => (
            <div key={unit} className="flex flex-col items-center">
              <Label
                htmlFor={`${type}-${unit}`}
                className="text-xs text-muted-foreground mb-1"
              >
                {labels[unit]}
              </Label>
              <Input
                type="number"
                id={`${type}-${unit}`}
                name={`${type}-${unit}`}
                value={formatTimeUnit(timeValue[unit])}
                onChange={(e) => handleManualInputChange(type, unit, e)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleManualInputChange(type, unit, e as any);
                  }
                }}
                min="0"
                className="bg-transparent cursor-pointer text-foreground text-center text-2xl font-semibold rounded-md w-full p-2 my-1  hide-number-arrows"
                aria-label={`${labels[unit]} for ${type} time`}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedStartTime = `${formatTimeUnit(
      startTime.hours
    )}:${formatTimeUnit(startTime.minutes)}:${formatTimeUnit(
      startTime.seconds
    )}`;
    const formattedEndTime = `${formatTimeUnit(endTime.hours)}:${formatTimeUnit(
      endTime.minutes
    )}:${formatTimeUnit(endTime.seconds)}`;

    // Format the date as YYYY-MM-DD
    const formattedDate = selectedDate
      ? format(selectedDate, "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd");

    onTimeSubmit(formattedStartTime, formattedEndTime, formattedDate);
  };

  const addDuration = (durationMinutes: number) => {
    const totalStartSeconds =
      startTime.hours * 3600 + startTime.minutes * 60 + startTime.seconds;
    const totalEndSeconds = totalStartSeconds + durationMinutes * 60;

    const endHours = Math.floor(totalEndSeconds / 3600);
    const endMinutes = Math.floor((totalEndSeconds % 3600) / 60);
    const endSecondsRemainder = totalEndSeconds % 60;

    if (endHours <= 99) {
      setEndTime({
        hours: endHours,
        minutes: endMinutes,
        seconds: endSecondsRemainder,
      });
    }
  };

  const handleFitbitAuth = async () => {
    setAuthError(null);
    try {
      const response = await fetch("/api/fitbit-oauth");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to get auth URL from Next.js server"
        );
      }
      const data = await response.json();
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        throw new Error(
          "Authorization URL not found in response from Next.js server"
        );
      }
    } catch (error) {
      console.error("Fitbit Auth Error (client-side):", error);
      setAuthError((error as Error).message);
    }
  };

  const extractBpmFromMessage = (message: string) => {
    const bpmMatch = message.match(/(\d+\.?\d*)\s*bpm/i);
    return bpmMatch ? bpmMatch[1] : null;
  };

  const getMessageWithoutBpm = (message: string) => {
    return message.replace(/(\d+\.?\d*)\s*bpm/i, "").trim();
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-center p-4 space-y-6 pb-20 select-none">
      <style jsx global>{`
        .hide-number-arrows::-webkit-outer-spin-button,
        .hide-number-arrows::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
          background-color: hsl(var(--primary));
          opacity: 0.8;
          cursor: pointer;
          border-radius: 4px;
          width: 20px;
          height: 20px;
        }
        .hide-number-arrows::-webkit-outer-spin-button:hover,
        .hide-number-arrows::-webkit-inner-spin-button:hover {
          background-color: hsl(var(--primary) / 0.9);
          opacity: 1;
        }
        .hide-number-arrows {
          -moz-appearance: textfield; /* Firefox */
        }
        .hide-number-arrows[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      {authError && (
        <div className="absolute top-16 right-4 p-3 bg-red-600 text-white rounded-md text-sm shadow-lg">
          <p>
            <strong>Authorization Error:</strong>
          </p>
          <p>{authError}</p>
        </div>
      )}

      {/* Date picker */}
      <div className="w-full max-w-xs sm:max-w-sm">
        <Label className="block text-sm font-medium mb-1 text-center">
          Date
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="cursor-pointer w-full"
              aria-label="Datum auswählen"
              tabIndex={0}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? (
                format(selectedDate, "dd MMMM yyyy", { locale: enAU })
              ) : (
                <span>Datum auswählen</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 ">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              initialFocus
              className=""
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10 w-full max-w-3xl px-4">
        <Card className="bg-background">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-center text-foreground">
              start time
            </CardTitle>
          </CardHeader>
          <CardContent>{renderTimeSelector("start", startTime)}</CardContent>
        </Card>

        <Card className="bg-background">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-center text-foreground">
              end time
            </CardTitle>
          </CardHeader>
          <CardContent>{renderTimeSelector("end", endTime)}</CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap justify-center gap-3 my-6 px-4">
        {[2, 10, 15, 30, 60].map((minutes) => (
          <Button
            variant="outline"
            key={minutes}
            onClick={() => addDuration(minutes)}
            className="cursor-pointer"
            aria-label={`Add ${minutes} minutes to current start time`}
            tabIndex={0}
          >
            {minutes} min
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <Button
          onClick={handleFitbitAuth}
          variant="ghost"
          className="cursor-pointer"
          aria-label="Authorize with Fitbit"
          tabIndex={0}
        >
          Authorize Fitbit
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          variant="default"
          className="cursor-pointer"
          aria-label="Start timer and fetch data"
          tabIndex={0}
        >
          {loading ? "Laden..." : "Start"}
        </Button>
      </div>

      {/* API Response as a card*/}
      {apiResponse && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Response:
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {apiResponse.error ? (
              <pre className="text-red-400 whitespace-pre-wrap text-xs">
                Error: {apiResponse.error}
                {apiResponse.details &&
                  typeof apiResponse.details === "string" &&
                  `\nDetails: ${apiResponse.details}`}
                {apiResponse.details &&
                  typeof apiResponse.details === "object" &&
                  `\nDetails: ${JSON.stringify(apiResponse.details, null, 2)}`}
              </pre>
            ) : apiResponse.message ? (
              <div className="space-y-3">
                {/* Show the rest of the message */}
                <pre className="text-foreground whitespace-pre-wrap text-xs">
                  {getMessageWithoutBpm(apiResponse.message)}
                </pre>
                {/* Show the BPM value in big*/}
                {extractBpmFromMessage(apiResponse.message) && (
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">
                      {extractBpmFromMessage(apiResponse.message)} BPM
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-foreground text-xs">No data available</p>
            )}

            {/* Show the dataset if it exists */}
            {apiResponse.dataset && (
              <details className="mt-2">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground text-xs">
                  Show dataset
                </summary>
                <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto max-h-48">
                  {JSON.stringify(apiResponse.dataset, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TimePicker;
