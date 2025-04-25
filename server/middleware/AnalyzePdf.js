const OpenAI = require("openai");
const fs = require('fs');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function analyzePDF(file_buffer) {
    try {
        // Read the PDF file
        //const pdfFile = fs.readFileSync(pdfPath);

        // Encode PDF content to base64
                // Validate that it's a Base64 string (basic check)
        const base64Regex = /^([A-Za-z0-9+/=]){2,}$/;
        if (!base64Regex.test(file_buffer)) {
            return res.status(400).send('Invalid Base64 string');
        }
        
        const encodedPdf = file_buffer;
        const pdfContent = `data:application/pdf;base64,${encodedPdf}`

        const extractionPrompt = `what job skills and experiences does this resume have. 
provide the output as a json response. return a json document that 
provides skills as an array and experiences array as well, 
and a potential job title suitable for this candidate, regardless of any of their past job titles, in "jobTitle" field`

        const response = await openai.responses.create({
            model: "gpt-4o",
            input: [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": extractionPrompt
                        },
                        {
                            "type": "input_file",
                            "filename": 'resume.pdf',
                            "file_data": pdfContent
                        }
                    ]
                },
                {
                    "role": "assistant",
                    "content": [
                        {
                            "type": "output_text",
                            "text": "```json\n{\n}\n```"
                        }
                    ]
                }
            ],
            text: {
                "format": {
                    "type": "json_object"
                }
            },
            reasoning: {},
            tools: [],
            temperature: 1,
            max_output_tokens: 2048,
            top_p: 1,
        });

        if (response && response?.status === "completed" && response.output_text) {
            const generatedText = response.output_text;
            try {
                // Parse the generated text as JSON
                const parsedJson = JSON.parse(generatedText);
                return parsedJson;
            } catch (parseError) {
                console.error("Error parsing JSON:", parseError);
                console.log("Raw generated text:", generatedText);
                throw parseError;
            }
        } else {
            throw new Error("Could not extract generated text from the response");
        }

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

module.exports = analyzePDF;
