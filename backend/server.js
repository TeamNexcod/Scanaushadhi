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


// 🔥 1. PRO IMAGE SCAN (SMART + FILTERED)
app.post("/scan", async (req, res) => {
  try {
    const { image } = req.body;

    const prompt = `
You are an expert in medicines, skincare, cosmetics, and health products.

STRICT RULES:
- Only analyze if the image contains a medicine, skincare, cosmetic, or health-related product
- If NOT related (like electronics, mouse, laptop, random objects), then REJECT it
- Do NOT guess wrong

If NOT relevant, return:
{
  "name": "NOT_HEALTH_PRODUCT",
  "category": "invalid",
  "type": "invalid",
  "sections": {}
}

If relevant, return ONLY JSON:
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

IMPORTANT:
- Only return accurate info
- If unsure, write "Not clearly visible"
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
              { type: "text", text: "Identify this product" },
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
    });

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "{}";

    // 🔥 CLEAN JSON
    reply = reply.replace(/```json|```/g, "").trim();

    let parsed;

    try {
      parsed = JSON.parse(reply);
    } catch {
      parsed = {};
    }

    // 🔥 INVALID PRODUCT FILTER
    if (parsed.name === "NOT_HEALTH_PRODUCT") {
      return res.json({
        name: "Invalid Item",
        category: "Not Supported",
        type: "Unknown",
        sections: {
          mainUse: "This item is not a medicine or skincare product.",
          otherUses: "",
          composition: "",
          dosage: "",
          howToUse: "",
          sideEffects: "",
          safety: "",
          warnings: "Please scan only medicine, cosmetic, or healthcare products."
        }
      });
    }

    // 🔥 FALLBACK SAFE DATA
    parsed.name = parsed.name || "Unknown Product";
    parsed.category = parsed.category || "General";
    parsed.type = parsed.type || "Product";

    if (!parsed.sections) parsed.sections = {};

    const defaultSections = {
      mainUse: "Not clearly visible",
      otherUses: "Not clearly visible",
      composition: "Not clearly visible",
      dosage: "Follow product label",
      howToUse: "Use as directed",
      sideEffects: "Check product label",
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


// 🔥 2. SIDE EFFECTS
app.post("/sideeffects", async (req, res) => {
  try {
    const { medicine } = req.body;

    const prompt = `
Tell side effects of ${medicine} clearly.

Return ONLY JSON:
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
      parsed = { name: medicine, sideEffects: "No clear data available." };
    }

    res.json(parsed);

  } catch (err) {
    res.status(500).json({ error: "Side effect error" });
  }
});


// 🔥 3. COMPOSITION
app.post("/composition", async (req, res) => {
  try {
    const { medicine } = req.body;

    const prompt = `
Give composition, uses and precautions of ${medicine}.

Return ONLY JSON:
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
        composition: "Not available",
        uses: "General use",
        precautions: "Consult doctor"
      };
    }

    res.json(parsed);

  } catch (err) {
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

  } catch (err) {
    res.status(500).json({ error: "Chat error" });
  }
});


// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT} 🚀`);
});
