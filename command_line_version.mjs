import { Configuration, OpenAIApi } from "openai";
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize OpenAI API
const openai = initializeOpenAI();

/**
 * Initialize OpenAI API with Configuration
 * @returns {OpenAIApi} - an instance of OpenAIApi
 */
function initializeOpenAI() {
    const apiKey = process.env.OPENAI_API_KEY;

    // Check for API key
    if (!apiKey) {
        handleError("OpenAI API key not configured");
    }

    const configuration = new Configuration({ apiKey });
    return new OpenAIApi(configuration);
}

/**
 * Custom error handling function
 * @param {string} message - Error message
 */
function handleError(message) {
    console.error(message);
    process.exit(1);
}

/**
 * Generate a customized prompt by injecting stock instructions into the prompt template
 * @param {string} promptTemplate - The prompt template
 * @param {string} stockInstructions - The stock instructions from the file
 * @returns {string} - The customized prompt
 */
function generatePrompt(promptTemplate, stockInstructions) {
    return promptTemplate.replace('Here is the import file:', `Here is the import file:\n${stockInstructions}`);
}

async function main() {
    const filePathArg = process.argv[2];

    // Validate input arguments
    if (!filePathArg) {
        handleError("Please specify the path to the file containing stock instructions.");
    }

    try {
        const stockInstructions = await fs.readFile(filePathArg, 'utf8');

        // Validate stock instructions
        if (stockInstructions.trim().length === 0) {
            handleError("Please enter valid stock instructions in the file.");
        }

        console.log("Current working directory:", process.cwd());

        const customizedPrompt = generatePrompt(promptTemplate, stockInstructions);
        const completion = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: customizedPrompt,
            max_tokens: 500,
            temperature: 0.6,
        });

        console.log("OpenAI Response:", completion.data.choices[0].text);
    } catch (error) {
        if (error.response) {
            handleError(`${error.response.status} ${error.response.data}`);
        } else {
            handleError(`Error: ${error.message}`);
        }
    }
}

main().catch(handleError);

// Prompt template for OpenAI
const promptTemplate = `
## Objective
Your task is to implement a function for maintaining stock levels. The function should read stock update instructions from an input file and output the updated stock levels in a specific format to the console.

## Input File Format
- Each new line of the file will represent a separate instruction.
- Lines are terminated by a newline character.

### Possible Instructions
The file contains three types of instructions:

1. **set-stock**: Initialize stock levels
   - Syntax: set-stock <sku-id> <stock-level> [<sku-id> <stock-level>] ...
   - Example: set-stock AB-6 100 CD-3 200

2. **add-stock**: Add to existing stock
   - Syntax: add-stock <sku-id> <stock-amount> [<sku-id> <stock-amount>] ...
   - Example: add-stock AB-6 20 CD-3 10

3. **order**: Deduct from stock for an order
   - Syntax: order <order-ref> <sku-id> <quantity> [<sku-id> <quantity>] ...
   - Example: order ON-123 AB-6 2 CD-3 1

## Requirements and Validation

### SKU-ID Format
- SKU-IDs are alphanumeric strings.
- Length should be between 2 to 10 characters.

### Quantities and Stock Levels
- Quantities and stock levels must be non-negative integers.
- Maximum allowable stock level is 10,000.

### Additional Requirements
- SKU must be initialized using set-stock before performing add-stock or order operations on it.
- An order cannot be processed if the required quantity is greater than the available stock level for that SKU.
- All input amounts must be integers.

### Behaviors and Validations
1. **Initialization Requirement**: SKU must be initialized using set-stock before performing add-stock or order operations on it.
2. **Negative Stock**: If an order operation makes stock level negative, the operation should proceed, but the negative stock level must be flagged for review.
3. **Disallow Negative Inputs**: Commands like set-stock or add-stock should not accept negative amounts.

If any of these requirements are not met, terminate the process, return the errors using a "❌" emoji, and do not proceed with outputting the stock levels.

## Output
- Your code should print the updated stock levels to the console.
- Stock levels should be sorted alphabetically by SKU.

### Output Format
Your output should consist of two main sections:
1. **Logging**: Log each instruction as it's processed. Use the following format:
    
    🔍 Processing instruction [number]: [instruction]
   
2. **Result**: Summarize the final stock levels as follows:
   
    📊 Final Stock Levels:
    [SKU] [Stock Level]
   
    Example:
   
    📊 Final Stock Levels:
    AB-6 118
    CD-3 214
    DE-1 209
    FG-4 300
   

## Validation
- Your code should validate the input file and instructions based on these specifications.
- Invalid instructions should be skipped and flagged.

## Bonus
- Implement logging to keep track of each instruction's effect, as per the logging format described above.

---

Please summarize the operations performed on the stock levels based on these instructions in the specified output format.

---

Here is the import file:

If requirements are not met, please don't calculate anything and just return the errors.
`;