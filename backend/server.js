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


// 🔥 1. IMAGE SCAN (composition + prescription)
app.post("/scan", async (req, res) => {
  try {
    const { image } = req.body;

    const prompt = `
Analyze this medicine image and return ONLY JSON:

{
  "name": "",
  "composition": [],
  "uses": [],
  "side_effects": [],
  "precautions": [],
  "confidence": ""
}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze medicine image" },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image}`
                }
              }
            ]
          }
        ],
        max_tokens: 800
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No response";
res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Scan failed" });
  }
});


// 🔥 2. SIDE EFFECT CHECK
app.post("/sideeffects", async (req, res) => {
  try {
    const { medicine } = req.body;

    const prompt = `
Tell side effects of ${medicine} in simple bullet points.
Return JSON:
{
  "name": "",
  "side_effects": []
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
        max_tokens: 300
      })
    });

    const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || "No response";
res.json({ reply });

  } catch (err) {
    res.status(500).json({ error: "Side effect error" });
  }
});


// 🔥 3. COMPOSITION SEARCH (text input)
app.post("/composition", async (req, res) => {
  try {
    const { medicine } = req.body;

    const prompt = `
Give composition, uses and precautions of ${medicine}.
Return JSON:
{
  "name": "",
  "composition": [],
  "uses": [],
  "precautions": []
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
    const reply = data.choices?.[0]?.message?.content || "No response";
res.json({ reply });

  } catch (err) {
    res.status(500).json({ error: "Composition error" });
  }
});


// 🔥 4. CHAT AI
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
        max_tokens: 300
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
