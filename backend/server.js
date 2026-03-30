import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ✅ ROOT CHECK
app.get("/", (req, res) => {
  res.send("🚀 Scan Aushadhi PRO Backend Running");
});


// 🔥 1. ULTRA PRO SCAN API (SMART AI ANALYSIS)
app.post("/scan", async (req, res) => {
  try {
    const { image, lang = "en" } = req.body;

    if (!image || image.length < 1000) {
      return res.status(400).json({
        success: false,
        error: "Invalid or low-quality image"
      });
    }

    const languageNote =
      lang === "hi"
        ? "Respond in Hindi language."
        : "Respond in English language.";

    // 🔥🔥🔥 ULTRA SMART PROMPT
    const prompt = `
You are a highly intelligent medical AI expert with deep pharmaceutical knowledge.

GOAL:
Analyze the product image and provide COMPLETE and DETAILED medical information.

IMPORTANT:
- Carefully read all visible text (brand, ingredients, label)
- If partially visible → intelligently infer using medical knowledge
- If product is recognized → give full accurate details
- DO NOT be overly conservative
- DO NOT leave fields empty

SMART ANALYSIS:
- Visible → exact data
- Partial → infer logically
- Not visible → then say "Not clearly visible"

CRITICAL:
You MUST provide:
✔ composition (even probable)
✔ dosage (general safe dosage)
✔ side effects (common known)
✔ safety advice
✔ warnings

Even if label is unclear → still provide best possible info using knowledge.

PRODUCT TYPE:
✔ Medicines
✔ Skincare
✔ Cosmetics
✔ Supplements

If not valid → return:

{
  "name": "NOT_HEALTH_PRODUCT",
  "confidence": 0,
  "category": "invalid",
  "type": "invalid",
  "sections": {}
}

OUTPUT LANGUAGE:
${languageNote}

RETURN STRICT JSON:

{
  "name": "",
  "confidence": 70,
  "category": "",
  "type": "",
  "brand": "",
  "sections": {
    "mainUse": "",
    "otherUses": "",
    "composition": "",
    "dosage": "",
    "howToUse": "",
    "sideEffects": "",
    "safety": "",
    "warnings": ""
  }
}

RULES:
- NEVER leave fields empty
- ALWAYS provide useful real-world info
- Keep it short but informative
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this product image carefully" },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.4
      })
    });

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "{}";

    reply = reply.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(reply);
    } catch {
      parsed = {};
    }

    // ❌ INVALID PRODUCT
    if (parsed.name === "NOT_HEALTH_PRODUCT") {
      return res.json({
        success: false,
        data: {
          name: lang === "hi" ? "अमान्य वस्तु" : "Invalid Item",
          category: "Not Supported",
          type: "Unknown",
          sections: {
            mainUse:
              lang === "hi"
                ? "यह चिकित्सा उत्पाद नहीं है"
                : "This is not a health product",
            warnings:
              lang === "hi"
                ? "कृपया केवल दवाइयाँ या स्किनकेयर उत्पाद स्कैन करें"
                : "Scan only medicine or health products"
          }
        }
      });
    }

    // 🔥 SAFE DEFAULTS
    parsed.name = parsed.name || "Unknown Product";
    parsed.category = parsed.category || "General";
    parsed.type = parsed.type || "Product";
    parsed.brand = parsed.brand || "Unknown";
    parsed.confidence = parsed.confidence || 75;

    if (!parsed.sections) parsed.sections = {};

    const defaultSections =
      lang === "hi"
        ? {
            mainUse: "स्वास्थ्य उपयोग के लिए",
            otherUses: "अन्य उपयोग संभव हैं",
            composition: "संभावित संरचना",
            dosage: "सामान्य खुराक डॉक्टर की सलाह अनुसार लें",
            howToUse: "निर्देश अनुसार उपयोग करें",
            sideEffects: "हल्के साइड इफेक्ट हो सकते हैं",
            safety: "जरूरत हो तो डॉक्टर से सलाह लें",
            warnings: "⚠️ सावधानी से उपयोग करें"
          }
        : {
            mainUse: "Health-related use",
            otherUses: "Other uses possible",
            composition: "Based on typical formulation",
            dosage: "Take standard dosage or consult doctor",
            howToUse: "Use as directed",
            sideEffects: "Common mild side effects possible",
            safety: "Consult doctor if needed",
            warnings: "⚠️ Use carefully"
          };

    parsed.sections = { ...defaultSections, ...parsed.sections };

    if (parsed.confidence < 60) {
      parsed.sections.warnings +=
        lang === "hi"
          ? " ⚠️ जानकारी पूरी तरह सटीक नहीं हो सकती"
          : " ⚠️ Information may not be fully accurate";
    }

    res.json({
      success: true,
      data: parsed,
      meta: {
        aiModel: "GPT-4o",
        confidence: parsed.confidence,
        time: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Scan failed"
    });
  }
});


// 🔥 2. SIDE EFFECTS (PRO LEVEL)
app.post("/sideeffects", async (req, res) => {
  try {
    const { medicine, lang = "en" } = req.body;

    const prompt = `
You are a medical expert.

Give detailed side effects of ${medicine}.
Include common + rare effects + warnings.

Language: ${lang === "hi" ? "Hindi" : "English"}

Return JSON:
{
  "name": "${medicine}",
  "sideEffects": ""
}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500
      })
    });

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "{}";

    reply = reply.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(reply);
    } catch {
      parsed = {
        name: medicine,
        sideEffects: "No data available"
      };
    }

    res.json(parsed);

  } catch {
    res.status(500).json({ error: "Side effect error" });
  }
});


// 🔥 3. COMPOSITION (PRO LEVEL)
app.post("/composition", async (req, res) => {
  try {
    const { medicine, lang = "en" } = req.body;

    const prompt = `
You are a pharmaceutical expert.

Provide composition, uses, and precautions of ${medicine}.
Give detailed and practical info.

Language: ${lang === "hi" ? "Hindi" : "English"}

Return JSON:
{
  "name": "${medicine}",
  "composition": "",
  "uses": "",
  "precautions": ""
}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600
      })
    });

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "{}";

    reply = reply.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(reply);
    } catch {
      parsed = {
        name: medicine,
        composition: "",
        uses: "",
        precautions: ""
      };
    }

    res.json(parsed);

  } catch {
    res.status(500).json({ error: "Composition error" });
  }
});


// 🔥 4. CHAT (SMART AI)
app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a professional medical assistant. Give clear, safe, and accurate answers."
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 700
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No response";

    res.json({ reply });

  } catch {
    res.status(500).json({ error: "Chat error" });
  }
});


// 🚀 START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
