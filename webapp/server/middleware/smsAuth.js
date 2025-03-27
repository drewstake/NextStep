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

  console.log("Initializing Twilio with:", {
    accountSid: accountSid.substring(0, 10) + "...",
    fromNumber,
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

const sendVerificationCode = async (phoneNumber) => {
  try {
    if (!client) {
      console.error("Twilio client not initialized");
      return false;
    }

    if (!fromNumber) {
      console.error("Twilio phone number is missing");
      return false;
    }

    // Format the phone number to E.164 format if it's not already
    const formattedPhone = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+1${phoneNumber}`;

    const code = generateVerificationCode();
    console.log(
      `Attempting to call ${formattedPhone} with verification code ${code}`
    );

    // Store the code with the phone number
    verificationCodes.set(formattedPhone, {
      code,
      timestamp: Date.now(),
      attempts: 0,
    });

    // Create TwiML to speak the verification code
    const twiml = `<Response><Say>Your NextStep verification code is: ${code
      .split("")
      .join(", ")}. I repeat, your code is: ${code
      .split("")
      .join(", ")}</Say></Response>`;

    console.log("Using Twilio credentials:", {
      fromNumber,
      accountSid: accountSid ? accountSid.substring(0, 10) + "..." : "missing",
      authTokenPresent: !!authToken,
    });

    // Make the call using Twilio
    const call = await client.calls.create({
      twiml: twiml,
      to: formattedPhone,
      from: fromNumber,
    });

    console.log(`Call initiated with details:`, {
      sid: call.sid,
      status: call.status,
      direction: call.direction,
      from: call.from,
      to: call.to,
    });

    return true;
  } catch (error) {
    console.error("Error making verification call:", error.message);
    console.error("Error code:", error.code);
    console.error("Error status:", error.status);
    console.error("Full error details:", {
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo,
      details: error.details,
    });
    if (error.code === 21614) {
      console.error(
        "Invalid phone number format. Please use E.164 format (+1XXXXXXXXXX)"
      );
    }
    return false;
  }
};

const verifyCode = (phoneNumber, code) => {
  // Format the phone number consistently
  const formattedPhone = phoneNumber.startsWith("+")
    ? phoneNumber
    : `+1${phoneNumber}`;

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
};
