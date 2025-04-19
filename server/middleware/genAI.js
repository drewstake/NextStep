const OpenAI = require("openai");
const dotenv = require('dotenv');

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Function to generate embeddings using OpenAI
async function generateEmbeddings(text) {

    if(!text) {
        throw new Error("Text is required for generating embeddings");
    }

    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float",
    });
    //console.log(response.data[0].embedding);
    return response.data[0].embedding;
}


async function parseSearchCriteria(text) {
    try {
        const extractionPrompt = `Analyze the following search criteria for a job and extract any mentioned charachteristics of a job. 
You must respond with a valid JSON object in the following format:
{
    "locations": ["array of locations mentioned"],
    "salaryRange": {minimum: minimum-salary, maximum: maximum-salary},
    "my_requirements": "what i am specifically looking for, if specified, otherwise null",
    "skills": ["array of skills mentioned"],
    "company": "company name, if specified, otherwise null",

}

If no salary range is found, return empty object for that field. if either min or max are not found, return null for that field. 
Do not include any additional text or explanation, only return the JSON object.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that helps a jobseeker analyze a jobseeker's search criteria for a job. You will analyze the search criteria and return a json object with the following fields: locations, salaryRange, my_requirements, skills, company. Do not include any additional text or explanation, only return the JSON object."
                },
                {
                    role: "user",
                    content: `${extractionPrompt}\n\nText to analyze:\n${text}`
                }
            ],
            temperature: 0.3,
            max_tokens: 500
        });

        if (response.choices && response.choices[0]?.message?.content) {
            try {
                // Extract JSON from the response content
                const content = response.choices[0].message.content;
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("No JSON object found in response");
                }
                const parsedJson = JSON.parse(jsonMatch[0]);
                return parsedJson;
            } catch (parseError) {
                console.error("Error parsing JSON:", parseError);
                console.log("Raw response:", response.choices[0].message.content);
                throw parseError;
            }
        } else {
            throw new Error("Could not extract content from the response");
        }

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function isThisAGoodMatch(description, criteria) {
    try {
        const answerPrompt = `Analyze the following job description and determine if it matches the search criteria. 
You must respond with a valid JSON object in the following format:
{
    "match": "poor/good/great",
    "additionalInfo": "your reasoning for the match"
}

Do not include any additional text or explanation, only return the JSON object.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that helps determine if a job description matches the critera specified by a jobseeker. You will analyze the job posting and determine if it is a good match. You will respond with a json document comprising of three fields - 'match' - poor/good/great, 'additionalInfo' - describing to the jobseeker why you think what you think about the match. In additional info, you will write as if you are speaking directly to the jobseeker."
                },
                {
                    role: "user", 
                    content: `Job description: ${description}\n\nCriteria:\n${criteria}`
                }
            ],
            temperature: 0.3,
            max_tokens: 500
        });

        if (response.choices && response.choices[0]?.message?.content) {
            try {
                // Extract JSON from the response content
                const content = response.choices[0].message.content;
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("No JSON object found in response");
                }
                const parsedJson = JSON.parse(jsonMatch[0]);
                return parsedJson;
            } catch (parseError) {
                console.error("Error parsing JSON:", parseError);
                console.log("Raw response:", response.choices[0].message.content);
                throw parseError;
            }
        } else {
            throw new Error("Could not extract content from the response");
        }

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function refineFoundPositions(results, basedOnThisCriteria) {
    const analyzedJobs = await Promise.all(results.map(async (job) => {
        const analysis = await isThisAGoodMatch(
            `Job Title: ${job.title}\nJob Description: ${job.jobDescription}
\nJob Skills: ${job.skills?.join(', ')}\nJob Company: ${job.company}\nJob Location: ${job.locations?.join(', ')}
\nJob Salary: ${job.salaryRange}\nJob Schedule: ${job.schedule}\nJob Benefits: ${job.benefits?.join(', ')}`,
            basedOnThisCriteria
        );
        return { job, analysis };
    }));

    // Sort jobs by match quality (great -> good -> poor)
    const sortedJobs = analyzedJobs.sort((a, b) => {
        const matchOrder = { great: 0, good: 1, poor: 2 };
        return matchOrder[a.analysis.match] - matchOrder[b.analysis.match];
    });

    // Create enhanced jobs array with match properties
    const enhancedJobs = sortedJobs.map(({ job, analysis }) => ({
        ...job,
        match: analysis.match,
        additionalInfo: analysis.additionalInfo
    }));
    return enhancedJobs;
}

module.exports = { parseSearchCriteria, generateEmbeddings, refineFoundPositions };