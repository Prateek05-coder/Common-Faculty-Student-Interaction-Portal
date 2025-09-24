// Safe stub for Gemini config to avoid accidental execution and leaked keys.
// If you plan to use Google GenAI, install the SDK and export a configured client here.
// npm i @google/generative-ai
// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// module.exports = { genAI };

module.exports = {
  isConfigured: false,
  getClient() {
    throw new Error('Gemini is not configured. Set GEMINI_API_KEY and initialize the client in config/gemini.js');
  }
};