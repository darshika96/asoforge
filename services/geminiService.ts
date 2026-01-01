import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, GeneratedName, BrandIdentity } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

const LONG_DESCRIPTION_INSTRUCTION = `You are a professional copywriter for the Chrome Web Store.
Your task is to write a comprehensive "Long Description" (Overview) using Markdown.
You must adhere to Google's best practices: clear headings, bullet points for readability, and keyword integration without stuffing.
Use the provided "Reference Example" style: concise sections, clear value propositions, and a "How to Use" section.`;

const PRIVACY_POLICY_INSTRUCTION = `You are a Legal Compliance Expert for the Chrome Web Store.
Your task is to generate a 'Privacy Policy' description for the 'Privacy practices' tab of the store listing, OR a standalone markdown policy document.

RULES:
1. You MUST justify every permission found in the 'manifest.json' (permissions, host_permissions).
2. Adhere to the 'Data Minimization' and 'Single Purpose' policies.
3. If no remote server is used, explicitly state that data stays local.
4. Tone: Transparent, Legal but readable, Trust-building.
5. Format: Markdown.
`;

const DESIGNER_INSTRUCTION = `You are a world-class visual identity designer and prompt engineer.
Your goal is to craft precise, descriptive prompts for an AI image generator to create App Icons.
You understand the technical limitations of small icons (16px - 128px).
You MUST focus on: High Contrast, Thick Lines, Minimal Detail, and distinctive silhouettes.
You NEVER use generic phrases like "high quality" without specifying the visual style details.
`;

const BRAND_IDENTITY_INSTRUCTION = `You are a Lead Brand Designer.
Generate a cohesive brand identity (Colors & Typography) for a Chrome Extension.
CRITICAL RULES FOR COLORS:
1. Output STRICT 7-character HEX codes (e.g., #FF5733).
2. HEX codes MUST match regex: ^#[0-9A-Fa-f]{6}$
3. ABSOLUTELY NO 8-digit hex codes (Alpha channels are FORBIDDEN).
4. Do NOT output strings of zeros.
"Nano Banana" aesthetic implies vibrant, high-energy colors (Neon Yellows, Deep Blacks, Electric Blues).
CRITICAL: Return ONLY valid JSON.`;

const SCREENSHOT_ANALYSIS_INSTRUCTION = `You are a UX writer and marketing expert.
Your task is to look at a UI screenshot and generate a punchy, benefit-driven Headline (max 4 words) and a Subheadline (max 10 words).
It must describe the specific feature shown in the image.

Also, identify the single most important word or 2-word phrase in your generated Headline to highlight.
The "highlightText" MUST be an exact substring of the "headline".

Tone: Professional, Energetic, Direct.
Return JSON only.`;

// Helper: Clean and Parse JSON with recovery
const parseJSON = <T>(text: string | undefined): T => {
  if (!text) throw new Error("Empty response from AI");

  try {
    // Remove markdown code blocks if present
    let clean = text.replace(/```json\n?|\n?```/g, '').trim();

    // Safety check: if there is a massive run of zeros or 'F's due to a glitch, truncate it.
    clean = clean.replace(/(#[0-9A-Fa-f]{6})[0-9A-Fa-f]{2,}/g, '$1');

    // Attempt to fix common JSON errors before parsing
    clean = clean.replace(/,\s*([\]\}])/g, '$1');

    try {
      return JSON.parse(clean) as T;
    } catch (parseError) {
      // Recover from common AI formatting issues
      if (/(#?[0-9A-Fa-f]{6})$/.test(clean)) {
        clean += '"';
      }

      const openBraces = (clean.match(/\{/g) || []).length;
      const closeBraces = (clean.match(/\}/g) || []).length;
      if (openBraces > closeBraces) {
        clean += '}'.repeat(openBraces - closeBraces);
      }

      const openBrackets = (clean.match(/\[/g) || []).length;
      const closeBrackets = (clean.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) {
        clean += ']'.repeat(openBrackets - closeBrackets);
      }

      return JSON.parse(clean) as T;
    }
  } catch (e) {
    console.error("JSON Parse Error. Raw text:", text);
    throw new Error("Failed to parse AI response. The model output was malformed.");
  }
};

// Retry Utility for Rate Limits (429)
async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Check for 429 status code in various forms
    const isRateLimit = error?.status === 429 || error?.code === 429 || error?.message?.includes('429') || error?.message?.includes('quota');

    if (retries > 0 && isRateLimit) {
      console.warn(`Rate limit hit. Retrying in ${delay}ms... (Retries left: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
}

// Internal interface for the raw AI response
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

// Verification Helper
const validateAnalysis = (raw: RawAnalysisResponse): boolean => {
  if (raw.isJunk === undefined) return false;
  if (!raw.isJunk) {
    // Ensure critical fields aren't empty
    const hasData = raw.category &&
      raw.targetAudience &&
      raw.coreFeatures?.length > 0 &&
      raw.primaryKeywords?.length > 0 &&
      raw.seoStrategy &&
      raw.marketAnalysis &&
      raw.customerPsychology;
    return !!hasData;
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
        contents: `Analyze the following Chrome Extension idea/description with your full expert persona:
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
      } else {
        console.warn(`Analysis validation failed on attempt ${attempts + 1}`);
      }
    } catch (e) {
      console.error(`Attempt ${attempts + 1} failed:`, e);
    }
    attempts++;
  }

  if (!rawResponse) {
    throw new Error("Unable to obtain correct analysis data after multiple attempts. Please try a more detailed description.");
  }

  if (rawResponse.isJunk) {
    throw new Error("Junk input detected. Please provide a real project description or idea.");
  }

  // Convert the array tone back to string to match AnalysisResult interface
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
  const prompt = `Based on this expert analysis: ${JSON.stringify(analysis)}, generate 6 SEO-optimized names and 6 Creative Brand names.
  For Creative names, use the specified Brand Strategist techniques.
  Provide a score (0-100) and identify the specific "strategy" used for each name.`;

  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL, // Using gemini-3-flash-preview
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
  const prompt = `
    App Name: ${name}
    Analysis: ${JSON.stringify(analysis)}
    
    Generate 6 distinct "Short Descriptions" for the Chrome Web Store.
    
    Requirements:
    1. STRICT LIMIT: Under 132 characters (spaces included).
    2. Incorporate primary keywords: ${keywords}.
    3. Analyze user behavior for this niche and apply psychological triggers.
    4. Provide a score (0-100) and identify the specific "keywordsUsed" for each.
  `;

  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL, // Using gemini-3-flash-preview
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

export const generateStoreListing = async (
  analysis: AnalysisResult,
  name: string,
  shortDescription: string
): Promise<string> => {
  // Safe access for coreFeatures to avoid "undefined[0]" error
  const featureExample = (analysis.coreFeatures && analysis.coreFeatures.length > 0)
    ? analysis.coreFeatures[0]
    : "Main Key Feature";

  const prompt = `
  App Name: ${name}
  Short Description: ${shortDescription}
  Analysis: ${JSON.stringify(analysis)}

  Reference Example Style (Do not copy content, only structure and tone):
  """
  Easy-to-use PDF tools to view, edit, convert, fill, e-sign PDF files, and more in your browser.

  WPS PDF, part of the WPS Office suite... offers an efficient approach to managing PDFs...
  
  How to Use the WPS PDF Chrome Extension:
  • Install and pin WPS PDF Chrome Extension 
  • Open your PDFs in browser...
  
  View, Download, Print, and Store PDFs 
  • Get the best PDF viewing experience online...
  
  Edit PDFs 
  • Add notes, text comments...
  """

  Task: Generate a markdown formatted "Long Description" for the Chrome Web Store. 
  Include:
  1. A strong opening hook expanding on the short description.
  2. "How to Use" section with bullet points.
  3. Feature sections with clear headers (e.g., "${featureExample}").
  4. Conclusion/Call to Action.
  `;

  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      systemInstruction: LONG_DESCRIPTION_INSTRUCTION,
      // No JSON schema here, we want Markdown text
    }
  }));

  return response.text || "Failed to generate description.";
};

export const generatePrivacyPolicy = async (
  appName: string,
  analysis: AnalysisResult,
  manifestData: any
): Promise<string> => {
  const permissions = manifestData.permissions || [];
  const hostPermissions = manifestData.host_permissions || [];
  const optionalPermissions = manifestData.optional_permissions || [];

  const prompt = `
  App Name: ${appName}
  Description: ${analysis.targetAudience}
  
  MANIFEST DATA:
  Permissions: ${JSON.stringify(permissions)}
  Host Permissions: ${JSON.stringify(hostPermissions)}
  Optional Permissions: ${JSON.stringify(optionalPermissions)}
  
  Task:
  Write a comprehensive Privacy Policy for this Chrome Extension.
  1. Explain WHY each permission is needed (Justification).
  2. Explicitly state what data is collected, how it is used, and if it is shared (Data Minimization).
  3. If permissions list is empty, state that no user data is accessed.
  4. Include standard clauses for "Changes to this Policy" and "Contact Us".
  `;

  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      systemInstruction: PRIVACY_POLICY_INSTRUCTION,
    }
  }));

  return response.text || "Failed to generate privacy policy.";
};

export const generateBrandIdentity = async (analysis: AnalysisResult, name: string): Promise<BrandIdentity> => {
  const prompt = `
      App Name: ${name}
      Tone: ${analysis.tone}
      Audience: ${analysis.targetAudience}

      Generate a unique brand identity including a color palette and typography choices.
      Ensure all color hex codes are valid 6-character strings (e.g. #000000).
    `;

  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      systemInstruction: BRAND_IDENTITY_INSTRUCTION,
      temperature: 0.1,
      // maxOutputTokens: 1000,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          colors: {
            type: Type.OBJECT,
            properties: {
              primary: { type: Type.STRING, description: "Main color Hex #RRGGBB (7 chars)" },
              secondary: { type: Type.STRING, description: "Secondary color Hex #RRGGBB (7 chars)" },
              background: { type: Type.STRING, description: "Background Hex #RRGGBB (7 chars)" },
              accent: { type: Type.STRING, description: "Accent Hex #RRGGBB (7 chars)" }
            }
          },
          typography: {
            type: Type.OBJECT,
            properties: {
              headingFont: { type: Type.STRING, description: "Google Font for headers" },
              bodyFont: { type: Type.STRING, description: "Google Font for body text" },
              reasoning: { type: Type.STRING }
            }
          },
          visualStyleDescription: { type: Type.STRING, description: "Brief description of the visual vibe" }
        }
      }
    }
  }));

  const parsed = parseJSON<Partial<BrandIdentity>>(response.text);

  // Provide default values to prevent undefined access errors in UI
  return {
    colors: {
      primary: parsed.colors?.primary || '#c0f425',
      secondary: parsed.colors?.secondary || '#ffffff',
      background: parsed.colors?.background || '#161811',
      accent: parsed.colors?.accent || '#a3d615',
    },
    typography: {
      headingFont: parsed.typography?.headingFont || 'Inter',
      bodyFont: parsed.typography?.bodyFont || 'Roboto',
      reasoning: parsed.typography?.reasoning || 'Clean and modern fallback.',
    },
    visualStyleDescription: parsed.visualStyleDescription || 'Modern dark mode aesthetic.'
  };
};

export const analyzeScreenshot = async (imageBase64: string, appName: string, tone: string): Promise<{ headline: string, subheadline: string, highlightText: string }> => {
  const prompt = `Analyze this UI screenshot for the app "${appName}".
  Tone: ${tone}.
  
  Generate a text overlay for a marketing screenshot.
  1. Headline: Max 4 words, very punchy, benefit driven.
  2. Subheadline: Max 10 words, describing the feature shown.
  3. Highlight Text: Choose 1-2 words from the headline to emphasize.`;

  // Strip prefix if present
  const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL, // Using gemini-3-flash-preview which is multimodal
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Data } },
        { text: prompt }
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

  return parseJSON<{ headline: string, subheadline: string, highlightText: string }>(response.text);
};

// Step 1: Generate the Prompt Text (Editable)
export const generateImagePrompt = async (
  style: string,
  analysis: AnalysisResult,
  appName: string,
  assetType: 'ICON' | 'BANNER',
  brandIdentity?: BrandIdentity | null
): Promise<string> => {
  const isBanner = assetType === 'BANNER';

  // Construct Brand Palette Context
  let colorContext = "";
  if (brandIdentity) {
    colorContext = `
      STRICT COLOR PALETTE (You MUST utilize these exact colors in your composition):
      - Primary Color (Dominant): ${brandIdentity.colors.primary}
      - Secondary Color: ${brandIdentity.colors.secondary}
      - Background Color: ${brandIdentity.colors.background}
      - Accent Color: ${brandIdentity.colors.accent}
      `;
  }

  // Specific Style Instructions based on the user's selection
  let styleInstruction = "";

  if (!isBanner) {
    // ICON SPECIFIC LOGIC
    switch (style) {
      case 'Cute Character':
        styleInstruction = `
              STYLE: CUTE MASCOT HEADSHOT.
              - Content: A close-up face/head of a cute character or animal related to "${appName}".
              - Composition: Centered headshot. Zoomed in. Big expressive eyes.
              - Details: Minimalist vector art. Thick rounded outlines. NO small details.
              - Background: Solid gradient using the brand palette.
              - Vibe: Kawaii, friendly, approachable, high contrast.
              `;
        break;
      case '3D Geometric':
        styleInstruction = `
              STYLE: ABSTRACT 3D GEOMETRY.
              - Content: A single abstract primitive shape representing the core feature.
              - Composition: Isometric view. Centered. Floating in space.
              - Details: Soft lighting, matte finish, slight ambient occlusion. No text.
              - Background: Clean, solid dark or light background to make the shape pop.
              - Vibe: Tech-forward, modern, stable.
              `;
        break;
      case '3D Letter':
        styleInstruction = `
              STYLE: 3D TYPOGRAPHY.
              - Content: The first letter of the app name: "${appName.charAt(0).toUpperCase()}".
              - Composition: Big, bold, centered letterform.
              - Details: 3D render, glossy or matte material, dramatic lighting from top-left.
              - Background: Solid contrasting background from brand palette.
              - Vibe: Professional, established, premium.
              `;
        break;
      case 'Modern Minimalist':
        styleInstruction = `
              STYLE: FLAT VECTOR ICON.
              - Content: A symbolic representation of the app's function using simple geometric forms.
              - Composition: Flat 2D. Perfect symmetry. Heavy use of negative space.
              - Details: Zero gradients. Zero shadows. Pure flat color.
              - Background: Solid single color.
              - Vibe: Clean, utility, efficient.
              `;
        break;
      case 'Abstract':
        styleInstruction = `
              STYLE: ABSTRACT TECH SYMBOL.
              - Content: Interconnected nodes, flow lines, or digital energy concept.
              - Composition: Radial or symmetrical balance.
              - Details: Glowing edges, neon aesthetics, "Nano Banana" high saturation.
              - Background: Deep dark background to let the neon colors glow.
              - Vibe: Cyberpunk, futuristic, AI.
              `;
        break;
      default:
        styleInstruction = `
              STYLE: VECTOR APP ICON.
              - Content: Simple central logo mark.
              - Composition: High contrast, readable at 16x16px.
              - Background: Simple gradient.
              `;
        break;
    }
  } else {
    // BANNER SPECIFIC LOGIC
    styleInstruction = `
      STYLE: STORE MARQUEE BACKGROUND.
      - Aspect Ratio: 16:9.
      - Composition: Abstract wallpaper, pattern, or 3D scene.
      - Layout: MUST have empty "negative space" in the center or left for text overlay.
      - Content: Subtle reference to the app theme, but mostly decorative.
      - Constraint: DO NOT INCLUDE ANY TEXT IN THE IMAGE.
      `;
  }

  const prompt = `
  Role: Create a precise image generation prompt for a Chrome Extension ${assetType}.
  
  APP CONTEXT:
  - App Name: ${appName}
  - Description: ${analysis.targetAudience}
  ${colorContext}
  
  ${styleInstruction}
  
  GENERAL RULES:
  - Use comma-separated descriptive tags.
  - Mention specific lighting (e.g., "soft studio lighting", "neon rim light").
  - Mention texture (e.g., "matte plastic", "vector flat", "glassmorphism").
  - For Icons: Emphasize "white background" or "solid background" to ensure easy cropping.
  
  OUTPUT:
  Return ONLY the raw prompt string for the image generator. Do not wrap in quotes or markdown.
  `;

  const response = await retry(async () => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      systemInstruction: DESIGNER_INSTRUCTION
    }
  }));

  return response.text || `A ${style} ${assetType} for ${appName}, vector art`;
};

// Step 2: Execute Image Generation
export const generateImageFromPrompt = async (
  prompt: string,
  aspectRatio: '1:1' | '16:9' = '1:1'
): Promise<string> => {
  try {
    const response = await retry(async () => ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        // @ts-ignore
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    }));

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Image generation failed", e);
    throw new Error("Failed to generate image. The model might be overloaded or the prompt restricted.");
  }

  throw new Error("No image generated");
};

/**
 * @deprecated Use generateImagePrompt + generateImageFromPrompt instead
 */
export const generateBrandAsset = async (
  style: string,
  analysis: AnalysisResult,
  appName: string,
  assetType: 'LOGO' | 'ICON'
): Promise<string> => {
  const prompt = await generateImagePrompt(style, analysis, appName, 'ICON');
  return generateImageFromPrompt(prompt, '1:1');
};