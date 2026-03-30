import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("🚀 Scan Aushadhi PRO Backend Running");
});


// 🔥 1. ULTRA PRO SCAN API
app.post("/scan", async (req, res) => {
  try {
    const { image, lang = "en" } = req.body;

    // ❌ Image validation
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

    const prompt = `
You are an advanced medical AI expert with high accuracy.

STRICT TASK:
- Deeply analyze the image (read labels, detect brand, ingredients)
- Only accept:
  ✔ Medicines
  ✔ Skincare
  ✔ Cosmetics
  ✔ Supplements
- Reject ALL other objects strictly

INTELLIGENCE MODE:
- Do NOT guess blindly
- If unclear → say "Not clearly visible"
- Extract REAL data only

OUTPUT LANGUAGE:
${languageNote}

RESPONSE RULES:
- Return ONLY JSON

INVALID RESPONSE:
{
  "name": "NOT_HEALTH_PRODUCT",
  "confidence": 0,
  "category": "invalid",
  "type": "invalid",
  "sections": {}
}

VALID RESPONSE:
{
  "name": "",
  "confidence": 0,
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
`;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
          temperature: 0.3
        })
      }
    );

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
                ? "केवल दवाइयाँ स्कैन करें"
                : "Scan only health products"
          }
        }
      });
    }

    // 🔥 SAFE DEFAULTS
    parsed.name =
      parsed.name ||
      (lang === "hi" ? "अज्ञात उत्पाद" : "Unknown Product");

    parsed.category = parsed.category || "General";
    parsed.type = parsed.type || "Product";
    parsed.brand = parsed.brand || "Unknown";
    parsed.confidence = parsed.confidence || 50;

    if (!parsed.sections) parsed.sections = {};

    const defaultSections =
      lang === "hi"
        ? {
            mainUse: "स्वास्थ्य उपयोग के लिए",
            otherUses: "अन्य उपयोग संभव हैं",
            composition: "स्पष्ट नहीं",
            dosage: "लेबल देखें",
            howToUse: "निर्देश अनुसार उपयोग करें",
            sideEffects: "हल्के साइड इफेक्ट हो सकते हैं",
            safety: "डॉक्टर से सलाह लें",
            warnings: "⚠️ जानकारी सीमित है"
          }
        : {
            mainUse: "Health related use",
            otherUses: "Other uses possible",
            composition: "Not clearly visible",
            dosage: "Follow instructions",
            howToUse: "Use as directed",
            sideEffects: "Mild side effects possible",
            safety: "Consult expert",
            warnings: "⚠️ Limited information"
          };

    parsed.sections = { ...defaultSections, ...parsed.sections };

    // ⚠️ Low confidence warning
    if (parsed.confidence < 60) {
      parsed.sections.warnings +=
        lang === "hi"
          ? " ⚠️ जानकारी पूरी तरह स्पष्ट नहीं"
          : " ⚠️ Not fully accurate";
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


// 🔥 2. SIDE EFFECTS API
app.post("/sideeffects", async (req, res) => {
  try {
    const { medicine, lang = "en" } = req.body;

    const prompt = `
Tell side effects of ${medicine}.
${lang === "hi" ? "Answer in Hindi." : "Answer in English."}

Return JSON:
{
  "name": "",
  "sideEffects": ""
}
`;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 400
        })
      }
    );

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "{}";
    reply = reply.replace(/```json|```/g, "").trim();

    let parsed;

    try {
      parsed = JSON.parse(reply);
    } catch {
      parsed = {
        name: medicine,
        sideEffects:
          lang === "hi" ? "डेटा उपलब्ध नहीं" : "No data available"
      };
    }

    res.json(parsed);

  } catch {
    res.status(500).json({ error: "Side effect error" });
  }
});


// 🔥 3. COMPOSITION API
app.post("/composition", async (req, res) => {
  try {
    const { medicine, lang = "en" } = req.body;

    const prompt = `
Give composition, uses and precautions of ${medicine}.
${lang === "hi" ? "Answer in Hindi." : "Answer in English."}

Return JSON:
{
  "name": "",
  "composition": "",
  "uses": "",
  "precautions": ""
}
`;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
      }
    );

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


// 🔥 4. CHAT API (PRO)
app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
                "You are a smart medical assistant. Give accurate answers."
            },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 600
        })
      }
    );

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content || "No response";

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
