const twilio = require("twilio");

// Initialize the Twilio client with proper credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let client;

try {
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Twilio credentials are missing");
  }

  console.log("Using Twilio credentials:", {
    fromNumber,
    accountSid: accountSid.substring(0, 10) + "...",
    authTokenPresent: !!authToken,
  });

  client = twilio(accountSid, authToken);
  console.log("Twilio client initialized successfully");
} catch (error) {
  console.error("Error initializing Twilio client:", error.message);
}

// Store verification codes temporarily (in production, use Redis or similar)
const verificationCodes = new Map();

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
};

const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;
  // Remove any non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, "");
  // Ensure the number has 10 or 11 digits
  if (cleaned.length !== 10 && cleaned.length !== 11) {
    throw new Error("Phone number must be 10 or 11 digits");
  }
  // Add +1 if not present
  return cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;
};

const sendVerificationCode = async (phoneNumber) => {
  try {
    if (!client) {
      console.error("Twilio client not initialized - check your credentials");
      throw new Error("Twilio client not initialized - check your credentials");
    }

    if (!phoneNumber) {
      console.error("Phone number is missing");
      throw new Error("Phone number is required");
    }

    // Format the phone number consistently
    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!formattedPhone) {
      console.error("Invalid phone number format for:", phoneNumber);
      throw new Error("Invalid phone number format");
    }

    const code = generateVerificationCode();
    console.log("\n=== Call Attempt Details ===");
    console.log("Original phone number:", phoneNumber);
    console.log("Formatted phone number:", formattedPhone);
    console.log("Verification code:", code);
    console.log("From number:", fromNumber);
    console.log("Account SID:", accountSid);
    console.log("Auth Token present:", !!authToken);
    console.log("========================\n");

    // Verify Twilio client status
    try {
      console.log("\nChecking Twilio account status...");
      const account = await client.api.accounts(accountSid).fetch();
      console.log("Twilio Account Status:", account.status);
      console.log("Twilio Account Type:", account.type);

      // Check if the number is verified
      console.log("\nChecking if number is verified...");
      const verifiedNumbers = await client.outgoingCallerIds.list();
      const isVerified = verifiedNumbers.some(
        (n) => n.phoneNumber === formattedPhone
      );
      console.log("Is number verified?", isVerified);
      console.log(
        "Verified numbers:",
        verifiedNumbers.map((n) => n.phoneNumber).join(", ")
      );
    } catch (accountError) {
      console.error("\nError checking Twilio account:", accountError);
    }

    // Store the code with the phone number
    verificationCodes.set(formattedPhone, {
      code,
      timestamp: Date.now(),
      attempts: 0,
    });

    // Create TwiML to speak the verification code
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(
      { voice: "alice" },
      `Your verification code is: ${code
        .split("")
        .join(", ")}. I repeat, your code is: ${code.split("").join(", ")}`
    );

    console.log("\nTwiML generated:", twiml.toString());

    try {
      console.log("\nAttempting to make Twilio call...");
      // Make the call using Twilio
      const call = await client.calls.create({
        twiml: twiml.toString(),
        to: formattedPhone,
        from: fromNumber,
        statusCallback: "http://localhost:4000/call-status",
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      });

      console.log("\nCall initiated successfully with details:", {
        sid: call.sid,
        status: call.status,
        direction: call.direction,
        from: call.from,
        to: call.to,
      });

      // Fetch call details immediately after creation
      const callDetails = await client.calls(call.sid).fetch();
      console.log("\nImmediate call status:", callDetails.status);

      return true;
    } catch (twilioError) {
      console.error("\n=== Twilio API Error Details ===");
      console.error("Error code:", twilioError.code);
      console.error("Error message:", twilioError.message);
      console.error("Error status:", twilioError.status);
      console.error("More info:", twilioError.moreInfo);
      console.error("Full error object:", JSON.stringify(twilioError, null, 2));
      console.error("============================\n");

      if (twilioError.code === 21219) {
        throw new Error(
          "This phone number is not verified with your trial account. For trial accounts, you must verify phone numbers before sending messages or making calls."
        );
      } else if (twilioError.code === 21214) {
        throw new Error(
          "Invalid phone number format or phone number not verified with Twilio"
        );
      } else if (twilioError.code === 21608) {
        throw new Error(
          "Twilio account is not authorized to make calls to this number"
        );
      } else {
        throw new Error(`Failed to initiate call: ${twilioError.message}`);
      }
    }
  } catch (error) {
    console.error("\nError in sendVerificationCode:", error.message);
    console.error("Full error:", error);
    throw error;
  }
};

const verifyCode = (phoneNumber, code) => {
  // Format the phone number consistently
  const formattedPhone = formatPhoneNumber(phoneNumber);

  console.log(`Verifying code for phone number: ${formattedPhone}`);
  console.log(
    `Stored verification codes:`,
    Array.from(verificationCodes.entries())
  );

  const verification = verificationCodes.get(formattedPhone);
  if (!verification) {
    console.log(`No verification found for ${formattedPhone}`);
    return { valid: false, message: "No verification code found" };
  }

  console.log(`Found verification for ${formattedPhone}:`, verification);

  // Check if code is expired (5 minutes)
  if (Date.now() - verification.timestamp > 5 * 60 * 1000) {
    verificationCodes.delete(formattedPhone);
    return { valid: false, message: "Verification code expired" };
  }

  // Check if too many attempts
  if (verification.attempts >= 3) {
    verificationCodes.delete(formattedPhone);
    return {
      valid: false,
      message: "Too many attempts. Please request a new code",
    };
  }

  // Increment attempts
  verification.attempts++;
  verificationCodes.set(formattedPhone, verification);

  // Check if code matches
  if (verification.code === code) {
    verificationCodes.delete(formattedPhone);
    return { valid: true, message: "Code verified successfully" };
  }

  return { valid: false, message: "Invalid code" };
};

module.exports = {
  sendVerificationCode,
  verifyCode,
  formatPhoneNumber,
};
