import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, GeneratedName, BrandIdentity, ScoredDescription } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Models
const TEXT_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

// Chrome Web Store Constraints
const CWS_SPECS = `
Chrome Web Store Optimization Rules:
1. Title Limit: Absolute max 75 characters. Recommended < 45 characters.
2. Short Description: Strictly under 132 characters. Must be catchy.
3. Iconography: Optimized for 128x128px (Main) and 16x16px (Toolbar).
4. Keywords: Focus on high-intent search terms.
`;

// System instructions for specific personas
const ANALYST_INSTRUCTION = `You are an elite ASO (App Store Optimization) strategist, Marketing Research Professional, Product & Customer Psychology Expert, Google Trends Analyzer, and Business Strategy Developer.

Your goal is to perform a deep-dive analysis of a project idea for a Chrome Extension.
You must analyze the input through four lenses:
1. CUSTOMER PSYCHOLOGY: What are the hidden pain points? Why would a user NEED this?
2. MARKET ANALYSIS: Where does this fit in the competitive landscape?
3. SEO/ASO STRATEGY: What are the high-value intent keywords that will actually drive traffic?
4. BUSINESS STRATEGY: How can this scale or provide immediate value?

REAL PROJECT VALIDATION:
Set "isJunk" to true ONLY if the input is absolute gibberish (e.g., "asdfghjkl", "123456", random characters) or does not contain any discernible intent. 
IMPORTANT: Vague or short descriptions like "a simple timer" or "color picker extension" are NOT junk. If you can understand what the app does, it is NOT junk.

CRITICAL OUTPUT RULES:
1. "tone" field MUST be an array of exactly 3-5 adjectives.
2. "targetAudience" must be concise (under 20 words).
3. "seoStrategy" should be a high-level plan (30-50 words).
4. "marketAnalysis" should identify the niche and competitive advantage (30-50 words).
5. "customerPsychology" should explain the user's "Jobs to be Done" (30-50 words).
6. Do NOT provide explanations outside of the JSON.
${CWS_SPECS}`;

const NAMING_INSTRUCTION = `You are a world-class Brand Strategist and SEO Maven. 
Your goal is to generate names that are both memorable (Creative) and highly searchable (SEO).

For CREATIVE names, use techniques like:
1. WORD FUSION (e.g., Shopify, Pinterest).
2. LETTER SWAPS/Omissions (e.g., Flickr, Tumblr).
3. FOREIGN LANGUAGE (Using meaningful words from Latin, Greek, Japanese, etc.).
4. SYNESTHESIA (Metaphors relating to speed, color, or texture).

For SEO names, focus on:
1. High-intent keyword incorporation.
2. Clarity and directness.

SCORING:
Score each name from 0-100 based on:
- Brandability (Is it unique and catchy?)
- SEO Potential (Will it rank for intent?)
- Relevance (Does it match the app's purpose?)

Ensure all titles (Name + Tagline) stay well within the 75-character Chrome Web Store limit.
Return valid JSON only.`;

const DESCRIPTION_INSTRUCTION = `You are a world-class ASO (App Store Optimization) Copywriter. 
Your goal is to write high-converting Short Descriptions for the Chrome Web Store.

STRATEGY:
1. SEO FIRST: Weave in high-volume keywords naturally.
2. HOOK: Start with a strong verb or benefit.
3. USER BEHAVIOR: Address what the user is looking for (e.g., "Save time", "Easy-to-use").
4. LIMIT: Absolute max 132 characters.

SCORING:
Score each description (0-100) based on:
- ASO Potential (Keyword integration)
- Conversion Rate (How likely is a user to click?)
- Clarity (Is the value clear in <132 chars?)

Return valid JSON only.`;

const LONG_DESCRIPTION_INSTRUCTION = `You are an Elite Creative Copywriter and Product Psychologist.
Your goal is to write a highly converting "Long Description" that speaks directly to user needs.

CORE PERSONA:
- You are NOT a robot. You are a human storyteller.
- You strictly adhere to the provided "Brand Tone" (e.g., if "Witty", be funny; if "Professional", be serious).

CRITICAL FORMATTING RULES:
1. NO MARKDOWN SYNTAX. Do not use #, ##, ***, or [links].
2. HEADERS: Use CAPITAL LETTERS with emoji decorations for sections.
3. SEPARATORS: Use dashed lines (e.g., "--------------------------------") to break up sections.
4. LISTS: Use emojis (✅, 🚀, •, 👉) as bullet points.
5. EMPHASIS: Use CAPITALS for emphasis instead of bold.
6. LAYOUT: Use spacing effectively to make it scanable.

WRITING STRATEGY:
1. THE HOOK: Start with a question or statement that identifies the user's biggest pain point.
2. THE SOLUTION: Introduce the app as the "Magic Pill" solution.
3. THE FEATURES: List features, but ALWAYS pair them with a benefit (e.g., "Fast Encoding" -> "Save hours of waiting").
4. THE TONE: Match the app's specific brand voice perfectly.
`;

export const generateStoreListing = async (
  analysis: AnalysisResult,
  name: string,
  shortDescription: string
): Promise<string> => {
  const featureExample = (analysis.coreFeatures && analysis.coreFeatures.length > 0)
    ? analysis.coreFeatures[0]
    : "Main Key Feature";

  const prompt = `
  App Name: ${name}
  Short Description: ${shortDescription}
  
  DEEP ANALYSIS CONTEXT:
  - Brand Tone: ${analysis.tone}
  - Target Audience: ${analysis.targetAudience}
  - Customer Pain Points/Psychology: ${analysis.customerPsychology}
  - Core Unique Features: ${analysis.coreFeatures.join(', ')}

  Reference Example Style (STRUCTURE ONLY - USE AS LAYOUT GUIDE):
  """
  🚀 BOOST YOUR PRODUCTIVITY WITH THIS APP
  ----------------------------------------
  
  Do you struggle with X? We have the solution.
  
  ✨ KEY FEATURES
  
  👉 FAST CONVERSION
  Convert files in seconds without losing quality.
  
  👉 SECURE & PRIVATE
  Everything happens locally. No data leaves your text.
  
  ----------------------------------------
  
  🛠️ HOW TO USE
  
  1️⃣ Install the extension
  2️⃣ Open any PDF
  3️⃣ Click the button to edit!
  
  ----------------------------------------
  
  ✅ WHY CHOOSE US?
  • 100% Free
  • No Sign-up required
  • Dark mode support
  
  DOWNLOAD NOW AND START CREATING! 🌟
  """

  Task: Generate a "Long Description" for the Chrome Web Store.
  
  EXECUTION STEPS:
  1. Analyze the "Customer Pain Points" and write a Killer Hook opening.
  2. Adopt the "${analysis.tone}" persona completely.
  3. Highlight the "Core Unique Features" using the Text/Emoji layout style.
  4. Ensure the writing is persuasive, human, and creative.
  5. OUTPUT RAW TEXT ONLY.
  `;

  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      systemInstruction: LONG_DESCRIPTION_INSTRUCTION,
    }
  }));

  return response.text || "Failed to generate description.";
};

const PRIVACY_POLICY_INSTRUCTION = `You are a Legal Compliance Expert for the Chrome Web Store.
Your task is to generate a 'Privacy Policy' description for the 'Privacy practices' tab of the store listing, OR a standalone markdown policy document.

RULES:
1. You MUST justify every permission found in the 'manifest.json' (permissions, host_permissions).
2. Adhere to the 'Data Minimization' and 'Single Purpose' policies.
3. If no remote server is used, explicitly state that data stays local.
4. Tone: Transparent, Legal but readable, Trust-building.
5. Format: STRICT MARKDOWN ONLY. Do NOT include phrases like "Here is your policy". Start directly with the title.
6. DATE: Use the provided current date for the "Last Updated" or "Effective Date" section.
`;

const DESIGNER_INSTRUCTION = `You are an expert high-fidelity prompt engineer.
Your goal is to craft precise, evocative prompts for an AI image generator to create premium logos.
You MUST prioritize Industry Relevance and a "Clean & Friendly" aesthetic.

TECHNICAL RULES:
1. **STRICTLY CLEAN**: Minimize details. Imagery MUST be high-impact and readable at small sizes.
2. **FRIENDLY VIBE**: Use friendly smiles, "cuteness", and approachable shapes where applicable.
3. **NO THICK OUTLINES**: Use rim lighting and depth instead of black lines.
4. **SUBTLE GRADIENTS**: Avoid harsh color jumps; use smooth, minimal transitions.
5. **HARMONIOUS COLORS**: Utilize the provided brand palette across the entire composition without strict subject/background splits.
`;

const BRAND_IDENTITY_INSTRUCTION = `You are a Senior Brand Designer and Master Color Strategist.
Generate a distinctive, high-end brand identity for a Chrome Extension.
Do NOT default to generic "Tech Blues" unless the tone strictly demands it.

COLOR STRATEGY:
1. **Harmony**: Choose the BEST color harmony for the specific Brand Tone (e.g., Complementary for high energy, Analogous for calm, Triadic for balance). Do NOT be limited to one type.
2. **Vibe Match**: 
   - If "Playful/Fun": Use high saturation, warm hues (yellows, pinks, oranges).
   - If "Professional/Trusted": Use deep, rich tones (navy, forest green, slate) with crisp accents.
   - If "Futuristic/Tech": Use electric neons against deep dark backgrounds.
   - If "Minimalist": Use sophisticated neutrals with one bold "Pop" color.

COLOR SPECIFICATIONS:
1. **2 Primary Colors (Background & Core)**:
   - Purpose: Foundations of the UI.
   - Rule: Ensure they have enough contrast to be distinct but work together. 
   - Avoid "muddy" mid-tones. Go for either deeply rich or clearly vibrant.
2. **2 Accent Colors (Subject & Brand Mark)**:
   - Purpose: The "Soul" of the brand.
   - Rule: specific, memorable hues that stand out against the primaries.
3. **Neutrals**: Crisp White (#ffffff), Deep Modern Black (e.g. #0a0a0a), and a balanced Gray.
4. **Highlight Neon**: 
   - Purpose: Cyber-electric glow. 
   - Rule: 100% Saturation, High Brightness.

GENERATE A TYPOGRAPHY SYSTEM (2 FONTS):
1. **Primary / Display Font**: Usage: Logos, headlines. Personality: Expressive, legible.
2. **Secondary / Text Font**: Usage: Body text, UI labels. Personality: Neutral, optimized for screens.

TYPOGRAPHY RULES:
1. **Google Fonts Only**: STRICTLY use only free, commercial-use friendly Google Fonts (e.g. Inter, Roboto, Montserrat, Poppins, Lato). Do NOT use Adobe Fonts or paid fonts.
2. **Pairing Logic**: Contrast in structure (e.g. Serif + Sans, or Geometric Sans + Humanist Sans).

CRITICAL OUTPUT RULES:
1. Output STRICT 7-character HEX codes (e.g., #FF5733).
2. HEX codes MUST match regex: ^#[0-9A-Fa-f]{6}$
3. ABSOLUTELY NO 8-digit hex codes.
4. Do NOT output strings of zeros.
5. Return ONLY valid JSON.
6. reasoning: Explain your specific Color Harmony choice and how it captures the unique "Customer Psychology" of this specific app.
`;

const SCREENSHOT_ANALYSIS_INSTRUCTION = `You are a UX writer and marketing expert.
Your task is to look at a UI screenshot and generate a punchy, benefit-driven Headline (max 4 words) and a Subheadline (max 10 words).
It must describe the specific feature shown in the image.

Also, identify the single most important word or 2-word phrase in your generated Headline to highlight.
The "highlightText" MUST be an exact substring of the "headline".

Tone: Professional, Energetic, Direct.
Return JSON only.`;

const SMALL_TILE_COPY_INSTRUCTION = `You are an expert ASO Copywriter.
Generate a punchy, high-impact headline (STRICTLY 2-5 words) and a short subheadline (max 8 words) for a "Small Promo" tile.
The copy must be based on the app's brand tone, core features, and description.
Do NOT mention specific UI elements as there might not be a screenshot.

Return JSON with:
- headline: 2-5 words.
- subheadline: Catchy summary.
- highlightText: A single word from the headline to emphasize.

Return JSON only.`;

const STYLE_ANALYSIS_INSTRUCTION = `You are an expert Fine Art Analyst and Prompt Engineer.
Analyze the provided image and describe its "Visual Style" in technical terms for an AI image generator.

FOCUS ON:
1. Composition (Camera angle, framing, depth of field).
2. Lighting (Source, intensity, shadows, highlights).
3. Textures & Materials (Glossy, matte, metallic, organic).
4. Artistic Technique (3D render style, flat vector, oil painting, sketch).
5. Line Quality & Shape Language (Thick, thin, sharp, rounded, geometric).

CRITICAL RULE: 
DO NOT mention the colors of the source image. We will override colors with our own brand palette. 
Focus ONLY on the "Style" and "Vibe".

Return a concise paragraph (max 40 words) of technical prompt tags.`;

const parseJSON = <T>(text: string | undefined): T => {
  if (!text) throw new Error("Empty response from AI");
  try {
    let clean = text.replace(/```json\n?|```/g, '').trim();
    clean = clean.replace(/(#[0-9A-Fa-f]{6})[0-9A-Fa-f]{2,}/g, '$1');
    clean = clean.replace(/,\s*([\]\}])/g, '$1');
    try {
      return JSON.parse(clean) as T;
    } catch (parseError) {
      if (/(#?[0-9A-Fa-f]{6})$/.test(clean)) clean += '"';
      const openBraces = (clean.match(/\{/g) || []).length;
      const closeBraces = (clean.match(/\}/g) || []).length;
      if (openBraces > closeBraces) clean += '}'.repeat(openBraces - closeBraces);
      const openBrackets = (clean.match(/\[/g) || []).length;
      const closeBrackets = (clean.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) clean += ']'.repeat(openBrackets - closeBrackets);
      return JSON.parse(clean) as T;
    }
  } catch (e) {
    console.error("JSON Parse Error. Raw text:", text);
    throw new Error("Failed to parse AI response. The model output was malformed.");
  }
};

async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error?.status === 429 || error?.code === 429 || error?.message?.includes('429') || error?.message?.includes('quota');
    if (retries > 0 && isRateLimit) {
      console.warn(`Rate limit hit. Retrying in ${delay}ms... (Retries left: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

interface RawAnalysisResponse {
  category: string;
  targetAudience: string;
  coreFeatures: string[];
  primaryKeywords: string[];
  tone: string[];
  seoStrategy: string;
  marketAnalysis: string;
  customerPsychology: string;
  isJunk: boolean;
}

const validateAnalysis = (raw: RawAnalysisResponse): boolean => {
  if (raw.isJunk === undefined) return false;
  if (!raw.isJunk) {
    return !!(raw.category && raw.targetAudience && raw.coreFeatures?.length > 0 && raw.primaryKeywords?.length > 0 && raw.seoStrategy && raw.marketAnalysis && raw.customerPsychology);
  }
  return true;
};

export const analyzeProjectInput = async (input: string): Promise<AnalysisResult> => {
  const truncatedInput = input.length > 25000 ? input.substring(0, 25000) + "...[truncated]" : input;
  let rawResponse: RawAnalysisResponse | null = null;
  let attempts = 0;
  const maxAttempts = 3;
  while (attempts < maxAttempts) {
    try {
      const response = await retry(async () => ai.models.generateContent({
        model: TEXT_MODEL,
        contents: `Analyze the following Chrome Extension idea / description with your full expert persona:
"""
${truncatedInput}
"""
${attempts > 0 ? "IMPORTANT: Your previous output was incomplete or malformed. Ensure ALL fields are filled with professional, high-quality analysis." : ""}

Return a JSON object with:
- isJunk: Boolean. Set to true ONLY if the input is not a real project idea.
- category: The primary store category.
- targetAudience: A short description of the user (Max 20 words).
- coreFeatures: An array of 3-5 main features (Concise).
- primaryKeywords: An array of 5-8 SEO keywords (High-volume, high-intent).
- tone: An array of exactly 3-5 adjectives describing the brand.
- seoStrategy: A strategic approach to ASO.
- marketAnalysis: Competitive landscape summary.
- customerPsychology: User motivation analysis.`,
        config: {
          systemInstruction: ANALYST_INSTRUCTION,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isJunk: { type: Type.BOOLEAN },
              category: { type: Type.STRING },
              targetAudience: { type: Type.STRING },
              coreFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
              primaryKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              tone: { type: Type.ARRAY, items: { type: Type.STRING } },
              seoStrategy: { type: Type.STRING },
              marketAnalysis: { type: Type.STRING },
              customerPsychology: { type: Type.STRING }
            }
          }
        }
      }));
      const parsed = parseJSON<RawAnalysisResponse>(response.text);
      if (validateAnalysis(parsed)) {
        rawResponse = parsed;
        break;
      }
    } catch (e) {
      console.error(`Attempt ${attempts + 1} failed: `, e);
    }
    attempts++;
  }
  if (!rawResponse) throw new Error("Unable to obtain analysis data.");
  if (rawResponse.isJunk) throw new Error("Junk input detected.");
  return {
    category: rawResponse.category || 'Productivity',
    targetAudience: rawResponse.targetAudience || 'General Users',
    coreFeatures: rawResponse.coreFeatures || [],
    primaryKeywords: rawResponse.primaryKeywords || [],
    tone: Array.isArray(rawResponse.tone) ? rawResponse.tone.join(', ') : String(rawResponse.tone || 'Professional'),
    seoStrategy: rawResponse.seoStrategy,
    marketAnalysis: rawResponse.marketAnalysis,
    customerPsychology: rawResponse.customerPsychology
  };
};

export const generateNameSuggestions = async (analysis: AnalysisResult): Promise<GeneratedName[]> => {
  const prompt = `Based on this expert analysis: ${JSON.stringify(analysis)}, generate 6 SEO-optimized names and 6 Creative Brand names.`;
  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      systemInstruction: NAMING_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            tagline: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['SEO', 'CREATIVE'] },
            reasoning: { type: Type.STRING },
            score: { type: Type.NUMBER },
            strategy: { type: Type.STRING }
          },
          required: ["name", "tagline", "type", "reasoning", "score", "strategy"]
        }
      }
    }
  }));
  return parseJSON<GeneratedName[]>(response.text);
};

export const generateShortDescriptions = async (analysis: AnalysisResult, name: string): Promise<ScoredDescription[]> => {
  const keywords = (analysis.primaryKeywords || []).join(', ');
  const prompt = `App Name: ${name}. Analysis: ${JSON.stringify(analysis)}. Generate 6 descriptions under 132 chars incorporating: ${keywords}.`;
  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      systemInstruction: DESCRIPTION_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            score: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            keywordsUsed: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["text", "score", "reasoning", "keywordsUsed"]
        }
      }
    }
  }));
  return parseJSON<ScoredDescription[]>(response.text);
};

export const generatePrivacyPolicy = async (appName: string, analysis: AnalysisResult, manifestData: any): Promise<string> => {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const prompt = `App: ${appName}. Features: ${analysis.coreFeatures.join(', ')}. Permissions: ${JSON.stringify(manifestData.permissions)}. Write a markdown privacy policy dated ${currentDate}.`;
  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: { systemInstruction: PRIVACY_POLICY_INSTRUCTION }
  }));
  let text = response.text || "Failed.";
  return text.replace(/^```markdown\n?/, '').replace(/\n?```$/, '').trim();
};

export const enhancePrivacyPolicy = async (currentText: string, appName: string, analysis: AnalysisResult): Promise<string> => {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const prompt = `Refine this policy for ${appName}: ${currentText}. Date: ${currentDate}. Output raw markdown.`;
  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: { systemInstruction: PRIVACY_POLICY_INSTRUCTION }
  }));
  let text = response.text || "Failed.";
  return text.replace(/^```markdown\n?/, '').replace(/\n?```$/, '').trim();
};

export const generateBrandIdentity = async (analysis: AnalysisResult, name: string, guidance?: string): Promise<BrandIdentity> => {
  const guidanceInstruction = guidance ? `\nUSER GUIDANCE: The user specifically requested: "${guidance}". YOU MUST INCORPORATE THIS INTO THE COLOR PALETTE/IDENTITY.` : "";
  const prompt = `App: ${name}. Tone: ${analysis.tone}. ${guidanceInstruction} Generate a high-end tetradic brand identity (colors, typography).`;
  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      systemInstruction: BRAND_IDENTITY_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          colors: {
            type: Type.OBJECT,
            properties: {
              primary1: { type: Type.STRING },
              primary2: { type: Type.STRING },
              accent1: { type: Type.STRING },
              accent2: { type: Type.STRING },
              neutral_white: { type: Type.STRING },
              neutral_black: { type: Type.STRING },
              neutral_gray: { type: Type.STRING },
              highlight_neon: { type: Type.STRING }
            }
          },
          typography: {
            type: Type.OBJECT,
            properties: {
              headingFont: { type: Type.STRING },
              bodyFont: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            }
          },
          visualStyleDescription: { type: Type.STRING }
        }
      }
    }
  }));
  const parsed = parseJSON<Partial<BrandIdentity>>(response.text);
  return {
    colors: {
      primary1: parsed.colors?.primary1 || '#c0f425',
      primary2: parsed.colors?.primary2 || '#a3d615',
      accent1: parsed.colors?.accent1 || '#ffffff',
      accent2: parsed.colors?.accent2 || '#f0f0f0',
      neutral_white: parsed.colors?.neutral_white || '#ffffff',
      neutral_black: parsed.colors?.neutral_black || '#161811',
      neutral_gray: parsed.colors?.neutral_gray || '#888888',
      highlight_neon: parsed.colors?.highlight_neon || '#00ffcc',
    },
    typography: {
      headingFont: parsed.typography?.headingFont || 'Inter',
      bodyFont: parsed.typography?.bodyFont || 'Roboto',
      reasoning: parsed.typography?.reasoning || 'Clean and modern.',
    },
    visualStyleDescription: parsed.visualStyleDescription || 'Modern dark mode.'
  };
};

export const analyzeScreenshot = async (imageBase64: string, appName: string, tone: string): Promise<{ headline: string, subheadline: string, highlightText: string }> => {
  const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Data } },
        { text: `Analyze screenshot for ${appName} with tone ${tone}.` }
      ]
    },
    config: {
      systemInstruction: SCREENSHOT_ANALYSIS_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headline: { type: Type.STRING },
          subheadline: { type: Type.STRING },
          highlightText: { type: Type.STRING }
        }
      }
    }
  }));
  return parseJSON(response.text);
};

export const generateSmallTileCopy = async (analysis: AnalysisResult, appName: string, shortDescription: string): Promise<{ headline: string, subheadline: string, highlightText: string }> => {
  const prompt = `Generate small promo copy for ${appName}. 
  Description: ${shortDescription}
  Analysis: ${JSON.stringify(analysis)}
  
  Tone: ${analysis.tone}`;

  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      systemInstruction: SMALL_TILE_COPY_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          headline: { type: Type.STRING },
          subheadline: { type: Type.STRING },
          highlightText: { type: Type.STRING }
        }
      }
    }
  }));
  return parseJSON(response.text);
};

export const analyzeStyleReference = async (imageBase64: string): Promise<string> => {
  const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Data } },
        { text: "Analyze visual style details." }
      ]
    },
    config: { systemInstruction: STYLE_ANALYSIS_INSTRUCTION }
  }));
  return response.text?.trim() || "Clean, modern style.";
};

export const generateImagePrompt = async (
  style: string,
  analysis: AnalysisResult,
  appName: string,
  assetType: 'ICON' | 'BANNER',
  brandIdentity?: BrandIdentity | null,
  styleReferenceDescription?: string,
  userSubject?: string,
  backgroundColorOverride?: string,
  subjectColorOverride?: string
): Promise<string> => {
  const isBanner = assetType === 'BANNER';
  let colorContext = "";

  if (brandIdentity) {
    if (backgroundColorOverride && subjectColorOverride) {
      colorContext = `STRICT COLOR MAPPING: Background MUST be exactly ${backgroundColorOverride}. The main subject/object MUST be exactly ${subjectColorOverride}. Do not use other colors significantly.`;
    } else {
      colorContext = `STRICT COLOR PALETTE: [${brandIdentity.colors.primary1}, ${brandIdentity.colors.primary2}, ${brandIdentity.colors.accent1}, ${brandIdentity.colors.accent2}, ${brandIdentity.colors.highlight_neon}]. USE A PLAIN SOLID COLOR OR EXTREMELY SUBTLE GRADIENT FOR THE BACKGROUND.`;
    }
  }

  /**
   * Brainstorms a creative subject (mascot, shape, or symbol) based on the app's brand and category.
   */
  const brainstormIconSubject = async (analysis: AnalysisResult, appName: string, iconStyle: string): Promise<string> => {
    if (userSubject) return userSubject; // Use user's subject if provided

    const isMascot = iconStyle === 'Modern Mascot';
    const isAbstract = iconStyle === 'Abstract';

    const subjectType = isMascot ? "mascot character head (animal, robot, or stylized object)" :
      isAbstract ? "abstract geometric shape or high-tech symbol" :
        "specific 3D geometric shape or object";

    const prompt = `Brainstorm ONE ${subjectType} for a premium app logo.
App Name: "${appName}"
Category: ${analysis.category}
Tone: ${analysis.tone}
Keywords: ${analysis.primaryKeywords?.join(', ')}

Rules:
1. OUTPUT THE SUBJECT NAME ONLY (e.g., "abstract cybernetic node", "minimalist geometric fox", "interconnected data sphere").
2. **AVOID CLICHÉS**: Do NOT use common tropes like "lightbulbs" for ideas, "rockets" for speed, "magnifying glasses" for search, or "shields" for security.
3. **High Uniqueness**: Brainstorm a metaphor that is distinct to this specific app's nuance.
4. **Style Alignment**: If Abstract/Geometric, avoid literal objects (like "book" or "pen"); focus on concepts (like "flow", "structure", "harmony").
`;

    try {
      const response = await retry(async () => ai.models.generateContent({
        model: TEXT_MODEL,
        contents: prompt,
        config: {
          systemInstruction: `You are a creative brand strategist. Output only the short name of the ${isMascot ? 'character' : 'shape'}.`,
          temperature: 0.8
        }
      }));
      return response.text?.trim() || (isMascot ? "friendly creature" : "geometric shape");
    } catch (e) {
      console.error("Icon subject brainstorming failed", e);
      return isMascot ? "friendly mascot" : "modern shape";
    }
  };
  let styleInstruction = "";
  if (!isBanner) {
    if (userSubject) {
      // Enhanced instruction for user provided subject
      styleInstruction = `STYLE: Premium icon of a ${userSubject}. extreme close-up view. Soft 3D gradient style (flat-3D hybrid), simplified geometry. Single dominant color with tonal gradients, no outlines, clean vector finish. designed for high-visibility at small sizes.`;

      // Add specific style nuance if a known style is selected
      if (style === 'Modern Mascot') styleInstruction += " Friendly, rounded, cute features.";
      else if (style === '3D Shapes' || style === '3D Geometric') styleInstruction += " Abstract, geometric, high-end 3D render.";
      else if (style === 'Modern Minimalist') styleInstruction = `STYLE: CLEAN HIGH-IMPACT SWISS VECTOR. Simplified symbol of a ${userSubject}. flat with soft glow.`;
    } else {
      switch (style) {
        case 'Modern Mascot':
          const chosenMascot = await brainstormIconSubject(analysis, appName, style);
          styleInstruction = `STYLE: Cute modern mascot of a ${chosenMascot}. extreme close-up face view, character has a zoomed-in look. Soft 3D gradient style (flat-3D hybrid), inflated rounded shapes, pastel lighting. large circular eyes with spark highlights, tiny mouth and nose, simplified geometry. Single dominant color with tonal gradients, no outlines, no texture, no grain, clean vector finish, friendly playful emotion. designed for high-visibility at small sizes.`;
          break;
        case '3D Geometric':
        case 'Fun 3D Shapes':
        case '3D Shapes':
          const chosenShape = await brainstormIconSubject(analysis, appName, style);
          styleInstruction = `STYLE: Premium 3D render of a ${chosenShape}. extreme close-up view, zoomed-in look. Soft 3D gradient style (flat-3D hybrid), inflated rounded shapes, pastel lighting. spark highlights, simplified geometry. Single dominant color with tonal gradients, no outlines, no texture, no grain, clean vector finish, high-end feel. designed for high-visibility at small sizes.`;
          break;
        case '3D Letter':
          styleInstruction = `STYLE: Sculptural 3D render of a letter "${appName.charAt(0).toUpperCase()}". extreme close-up and zoomed-in look, letterform is oversized. Soft 3D gradient style (flat-3D hybrid), inflated rounded shapes, pastel lighting. spark highlights, simplified geometry. bold and authoritative but friendly. Single dominant color with tonal gradients, no outlines, no texture, no grain, clean vector finish. designed for high-visibility at small sizes.`;
          break;
        case 'Modern Minimalist':
          styleInstruction = `STYLE: CLEAN HIGH-IMPACT SWISS VECTOR. HUGE simplified symbol for ${analysis.category}. friendly and cute. flat with soft glow.`;
          break;
        case 'Abstract':
          const chosenAbstract = await brainstormIconSubject(analysis, appName, style);
          styleInstruction = `STYLE: An abstract render made from a ${chosenAbstract}. extreme close-up composition, zoomed-in look, oversized shape. Soft 3D gradient style (flat-3D hybrid), inflated rounded shapes, pastel lighting. spark highlights, simplified geometry. high-tech and friendly. Single dominant color with tonal gradients, no outlines, no texture, no grain, clean vector finish.`;
          break;
        default:
          styleInstruction = `STYLE: MODERN APP ICON. central logo mark.`;
      }
    }
  } else {
    styleInstruction = `STYLE: STORE TILES. wide composition. use brand colors ${brandIdentity?.colors.primary1}, ${brandIdentity?.colors.primary2}. negative space.`;
  }

  const referencePriority = styleReferenceDescription ? `CRITICAL: PRIORITIZE THE VISUAL STYLE, LIGHTING, AND COMPOSITION OF THE ATTACHED REFERENCE IMAGE. THIS IS MORE PROMINENT THAN THE TEXT DESCRIPTION.` : "";
  const prompt = `Role: Expert App Icon Designer. Asset: ${assetType}. App: ${appName}. ${colorContext} ${styleInstruction} ${referencePriority} ${styleReferenceDescription || ''} OUTPUT RAW PROMPT ONLY.`;

  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: { systemInstruction: DESIGNER_INSTRUCTION }
  }));

  return response.text || `A ${style} icon for ${appName}`;
};

export const generateImageFromPrompt = async (prompt: string, aspectRatio: '1:1' | '16:9' = '1:1', referenceImageBase64?: string | null): Promise<string> => {
  try {
    const parts: any[] = [{ text: prompt }];

    // Add reference image if provided
    if (referenceImageBase64) {
      const base64Data = referenceImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/png', // Assume PNG/JPEG for simplicity as per common upload types
          data: base64Data
        }
      });
    }

    const response = await retry(async () => ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts },
      config: {
        // @ts-ignore
        imageConfig: { aspectRatio }
      }
    }));
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  } catch (e) {
    console.error("failed", e);
  }
  throw new Error("No image generated");
};

export const generateBrandAsset = async (style: string, analysis: AnalysisResult, appName: string, assetType: 'LOGO' | 'ICON'): Promise<string> => {
  const prompt = await generateImagePrompt(style, analysis, appName, 'ICON');
  return generateImageFromPrompt(prompt, '1:1');
};