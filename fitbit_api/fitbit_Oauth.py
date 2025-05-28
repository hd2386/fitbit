import requests
from flask import Flask, request, redirect, jsonify
import base64
import urllib.parse
import sys
import traceback
from dotenv import load_dotenv
import os

load_dotenv()


# Fitbit App Information
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
PYTHON_APP_REDIRECT_URI = os.getenv("PYTHON_SERVER_CALLBACK_URI")
NEXTJS_APP_URL = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")

# Simple token storage (use a more secure method for production)
current_access_token = None
current_refresh_token = None

# Safe printing function for terminal output
def safe_print(*args, **kwargs):
    try:
        print(*args, file=sys.stdout, flush=True, **kwargs)
    except Exception as e:
        print(f"Error in safe_print: {e}")
        print(*args)


app = Flask(__name__)

@app.route("/start-oauth")
def start_oauth_flow():
    if not CLIENT_ID:
        return jsonify({"error": "Fitbit Client ID not configured on Python server"}), 500
    
    auth_url_params = {
        "response_type": "code",
        "client_id": CLIENT_ID,
        "redirect_uri": PYTHON_APP_REDIRECT_URI, # Python server callback
        "scope": "heartrate activity profile",
        "expires_in": "604800" 
    }
    authorization_url = "https://www.fitbit.com/oauth2/authorize?" + urllib.parse.urlencode(auth_url_params)
    safe_print("Generated Fitbit Authorization URL:", authorization_url)
    return jsonify({"authorizationUrl": authorization_url})

@app.route("/exchange-token") # Callback that Fitbit will redirect to
def oauth_callback():
    global current_access_token, current_refresh_token
    try:
        code = request.args.get("code")
        if not code:
            safe_print("!!! Authorization failed. No code provided by Fitbit redirect. !!!")
            # Redirect to Next.js app with error
            return redirect(f"{NEXTJS_APP_URL}?oauth_success=false&error_message=No_code_from_Fitbit")

        safe_print("Authorization code received, attempting to exchange for tokens...")

        token_url = "https://api.fitbit.com/oauth2/token"
        auth_header_val = f"{CLIENT_ID}:{CLIENT_SECRET}"
        auth_header = base64.b64encode(auth_header_val.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {
            "client_id": CLIENT_ID,
            "grant_type": "authorization_code",
            "redirect_uri": PYTHON_APP_REDIRECT_URI, # Must match Fitbit App settings
            "code": code,
        }

        response = requests.post(token_url, headers=headers, data=data)

        if response.status_code == 200:
            token_data = response.json()
            current_access_token = token_data.get("access_token")
            current_refresh_token = token_data.get("refresh_token") # Store refresh token too
            safe_print("\n🎉 Success! Tokens obtained: 🎉")
            safe_print("Access token stored:", current_access_token is not None)
            safe_print("Refresh token stored:", current_refresh_token is not None)
            # Redirect to Next.js app on success
            return redirect(f"{NEXTJS_APP_URL}?oauth_success=true")
        else:
            response_text_safe = response.text.encode('utf-8', 'replace').decode('utf-8', 'replace')
            safe_print(f"!!! Error during token exchange. Status: {response.status_code}, Text: {response_text_safe} !!!")
            # Redirect to Next.js app with error
            return redirect(f"{NEXTJS_APP_URL}?oauth_success=false&error_message=Token_exchange_failed_{response.status_code}")

    except Exception as e:
        safe_print(f"!!! An unexpected exception occurred in oauth_callback: {str(e)} !!!")
        tb_lines = traceback.format_exception(etype=type(e), value=e, tb=e.__traceback__)
        safe_print("Traceback:\n" + "".join(tb_lines))
        return redirect(f"{NEXTJS_APP_URL}?oauth_success=false&error_message=Python_server_exception")

@app.route("/get-heart-rate", methods=["POST"])
def get_heart_rate_data():
    global current_access_token
    if not current_access_token:
        return jsonify({"error": "Not authenticated with Fitbit. Please authorize first.", "details": "Access token is missing on Python server."}), 401

    try:
        payload = request.get_json()
        date = payload.get("date")
        start_time = payload.get("startTime")
        end_time = payload.get("endTime")

        if not all([date, start_time, end_time]):
            return jsonify({"error": "Missing date, startTime, or endTime in request body"}), 400

        # URL format for 1-second resolution:
        url = f"https://api.fitbit.com/1/user/-/activities/heart/date/{date}/1d/1sec/time/{start_time}/{end_time}.json"
        
        headers = {
            "Authorization": f"Bearer {current_access_token}"
        }
        
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            data = response.json()
            dataset = data.get('activities-heart-intraday', {}).get('dataset', [])
            hr_values = [entry['value'] for entry in dataset if 'value' in entry]
            
            if hr_values:
                average_hr = sum(hr_values) / len(hr_values)
                return jsonify({
                    "averageHr": float(f"{average_hr:.2f}"),
                    "dataset": dataset,
                    "message": f"Average HR from {start_time} to {end_time} on {date}: {average_hr:.2f} bpm"
                })
            else:
                return jsonify({"message": "No heart rate data found in the given time window.", "dataset": []})
        elif response.status_code == 401: # Token might be expired
            # Refresh token mechanism should be implemented here (not included in this example)
            safe_print("Access token might be expired. Need to refresh.")
            # For now, tell client to re-authorize
            current_access_token = None # Clear token
            current_refresh_token = None
            return jsonify({"error": "Fitbit token expired or invalid. Please re-authorize.", "details": response.text}), 401
        else:
            safe_print(f"Fitbit API Error on /get-heart-rate: Status {response.status_code}, Text: {response.text}")
            return jsonify({"error": f"Fitbit API Error: {response.status_code}", "details": response.text}), response.status_code
            
    except Exception as e:
        safe_print(f"Exception in /get-heart-rate: {str(e)}")
        tb_lines = traceback.format_exception(etype=type(e), value=e, tb=e.__traceback__)
        safe_print("Traceback:\n" + "".join(tb_lines))
        return jsonify({"error": "Internal server error on Python while fetching heart rate", "details": str(e)}), 500

if __name__ == "__main__":
    # REMOVING AUTO BROWSER OPENING, NOW STARTING FROM NEXTJS
    safe_print("========================================================================")
    safe_print("Fitbit Python Backend for Next.js App")
    safe_print(f"Flask server running at http://localhost:8081")
    safe_print(f"OAuth Callback configured for: {PYTHON_APP_REDIRECT_URI}")
    safe_print(f"Will redirect to Next.js app at: {NEXTJS_APP_URL} after auth.")
    safe_print("========================================================================")
    app.run(port=8081, debug=True) # debug=True for development
