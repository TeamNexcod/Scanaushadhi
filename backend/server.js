import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ✅ TEST
app.get("/", (req, res) => {
  res.send("Scan Aushadhi Backend Running 🚀");
});


// 🔥 1. ULTRA PRO SCAN (ACCURATE + LANGUAGE SUPPORT)
app.post("/scan", async (req, res) => {
  try {
    const { image, lang = "en" } = req.body;

    const languageNote = lang === "hi"
      ? "Respond in Hindi language."
      : "Respond in English language.";

    const prompt = `
You are a professional medical and product analysis expert.

TASK:
- Analyze the image carefully (read label, brand, ingredients)
- Only accept: medicine, skincare, cosmetic, supplement
- Reject other items (mouse, electronics, objects)

ACCURACY RULE:
- Do NOT guess blindly
- If unsure → say "Not clearly visible"
- Extract maximum real information

LANGUAGE:
${languageNote}

If NOT relevant return:
{
  "name": "NOT_HEALTH_PRODUCT",
  "category": "invalid",
  "type": "invalid",
  "sections": {}
}

If valid return JSON:

{
  "name": "",
  "category": "",
  "type": "",
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
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

    // ❌ INVALID ITEM
    if (parsed.name === "NOT_HEALTH_PRODUCT") {
      return res.json({
        name: lang === "hi" ? "अमान्य वस्तु" : "Invalid Item",
        category: "Not Supported",
        type: "Unknown",
        sections: {
          mainUse: lang === "hi"
            ? "यह चिकित्सा या स्किनकेयर उत्पाद नहीं है"
            : "This is not a health-related product",
          otherUses: "",
          composition: "",
          dosage: "",
          howToUse: "",
          sideEffects: "",
          safety: "",
          warnings: lang === "hi"
            ? "कृपया केवल दवाइयाँ या स्किनकेयर उत्पाद स्कैन करें"
            : "Scan only medicine or health products"
        }
      });
    }

    // 🔥 SAFE FALLBACK (SMART)
    parsed.name = parsed.name || (lang === "hi" ? "अज्ञात उत्पाद" : "Unknown Product");
    parsed.category = parsed.category || "General";
    parsed.type = parsed.type || "Product";

    if (!parsed.sections) parsed.sections = {};

    const defaultSections = lang === "hi"
      ? {
          mainUse: "यह उत्पाद स्वास्थ्य या स्किनकेयर उपयोग के लिए हो सकता है",
          otherUses: "अतिरिक्त उपयोग हो सकते हैं",
          composition: "संरचना स्पष्ट नहीं है",
          dosage: "लेबल के अनुसार उपयोग करें",
          howToUse: "निर्देश अनुसार उपयोग करें",
          sideEffects: "कुछ लोगों में हल्के साइड इफेक्ट हो सकते हैं",
          safety: "जरूरत हो तो डॉक्टर से सलाह लें",
          warnings: "गलत उपयोग से बचें"
        }
      : {
          mainUse: "Used for health or skincare benefits",
          otherUses: "May have additional uses",
          composition: "Ingredients not clearly visible",
          dosage: "Follow product instructions",
          howToUse: "Use as directed",
          sideEffects: "May cause mild side effects",
          safety: "Consult expert if needed",
          warnings: "Avoid misuse"
        };

    parsed.sections = { ...defaultSections, ...parsed.sections };

    res.json(parsed);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Scan failed" });
  }
});


// 🔥 2. SIDE EFFECTS (LANGUAGE SUPPORT)
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400
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
        sideEffects: lang === "hi"
          ? "डेटा उपलब्ध नहीं है"
          : "No data available"
      };
    }

    res.json(parsed);

  } catch {
    res.status(500).json({ error: "Side effect error" });
  }
});


// 🔥 3. COMPOSITION (LANGUAGE SUPPORT)
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
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


// 🔥 4. CHAT
app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 400
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
  console.log(`Server running on ${PORT} 🚀`);
});
