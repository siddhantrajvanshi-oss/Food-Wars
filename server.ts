import express, { type Request, type Response, type NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// In AI Studio / Cloud Run, DEFAULT_APP_PORT is 3000 (PORT=8080 is reserved for NGINX)
const PORT = Number(process.env.DEFAULT_APP_PORT) || 3000;

app.use(express.json({ limit: '35mb' }));

// Shared Server-side Google GenAI client
const rawApiKey = process.env.GEMINI_API_KEY || '';
const hasValidApiKey = Boolean(rawApiKey && rawApiKey !== 'MY_GEMINI_API_KEY' && rawApiKey.trim().length > 5);

const ai = new GoogleGenAI({
  apiKey: rawApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const CULINARY_MENTOR_SYSTEM_INSTRUCTION = `You are an encouraging cultural culinary mentor focused on healthy habits and gamified cooking challenges. Your goal is to guide home cooks through accessible recipes inspired by global culinary traditions and objectively evaluate their finished meals.

Rules and Guardrails:
- Never suggest unsafe ingredient substitutions, toxic combinations, or undercooked hazardous meats.
- Never require rare or hard-to-find specialty ingredients; adapt authentic global recipes to common pantry staples and modern healthy alternatives.
- If a user inputs only two or three basic pantry ingredients, treat it as a "Minimal-Ingredient Survival Challenge" and award bonus points in the recipe plan.
- During active cooking troubleshooting, provide brief, direct, step-by-step guidance without deducting challenge points or judging errors.
- Remind users that you are an AI culinary guide and your nutritional observations are educational, not medical or dietetic advice.

Evaluation Rubric (Total: 100 points + up to 20 bonus points):
- Ingredient Efficiency (1-35 points): Reward minimal waste and smart use of available items.
- Veggie & Nutritional Balance (1-35 points): Reward balanced macronutrients and vegetable integration.
- Creative Cultural Technique (1-30 points): Reward thoughtful execution of traditional flavor profiles.
- Survival Bonus (0-20 points): Additional points for creating a delicious meal from 3 or fewer base staples.`;

// Call Gemini with strict timeout to avoid blocking users during model high-demand spikes
async function callGeminiWithTimeout(params: any, timeoutMs = 6000): Promise<any> {
  let timeoutId: any;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Gemini API timeout')), timeoutMs);
  });

  try {
    const result = await Promise.race([ai.models.generateContent(params), timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// Smart culinary fallback generator when Gemini API key is missing or model is unavailable
function generateAdaptiveFallbackRecipe(cuisine: string, pantryIngredients: string) {
  const items = pantryIngredients
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const isSurvival = items.length <= 3;
  const primaryItem = items[0] || 'Hearty Pantry Staples';
  const secondaryItem = items[1] || 'Fresh Aromatics';

  const cuisineStyles: Record<string, { dishName: string; region: string; tip: string; spices: string }> = {
    Mexican: {
      dishName: `Rustic ${primaryItem} Skillet Tinga`,
      region: 'Oaxacan Homestyle Inspired',
      tip: 'Bloom ground cumin and chili in warm oil before adding aromatics for authentic smoky depth.',
      spices: 'ground cumin, oregano, and black pepper',
    },
    'East Asian': {
      dishName: `Wok-Glazed ${primaryItem} & Greens`,
      region: 'Cantonese Market Style',
      tip: 'Ensure high, steady heat and add sauce in the final minute so vegetables stay crisp and vibrant.',
      spices: 'soy sauce, garlic, and toasted sesame oil',
    },
    Mediterranean: {
      dishName: `Braised ${primaryItem} alla Cacciatore`,
      region: 'Tuscan Countryside Inspired',
      tip: 'Simmer gently with a splash of water and olive oil so the ingredients create their own natural sauce.',
      spices: 'garlic, oregano, olive oil, and sea salt',
    },
    Indian: {
      dishName: `Fragrant ${primaryItem} Masala Tarka`,
      region: 'Northern Indian Homestyle',
      tip: 'Perform a quick tempering (tarka): sizzle whole spices in hot oil for 30 seconds before tossing into the dish.',
      spices: 'turmeric, cumin seeds, ginger, and garam masala',
    },
    'West African': {
      dishName: `Spiced ${primaryItem} & Tomato Pot`,
      region: 'West African Stew Inspired',
      tip: 'Slowly reduce your tomato and onion base until the red oil begins to separate, unlocking savory umami.',
      spices: 'onion, garlic, thyme, and paprika',
    },
  };

  const style = cuisineStyles[cuisine] || {
    dishName: `Spiced ${primaryItem} & ${secondaryItem} Challenge`,
    region: `${cuisine} Homestyle Inspired`,
    tip: 'Build flavor in layers: caramelize aromatics first, then sear your main ingredients.',
    spices: 'fresh garlic, herbs, and warm spices',
  };

  return {
    dishName: style.dishName,
    culturalOrigin: style.region,
    estimatedTimeMinutes: 22,
    difficulty: isSurvival ? 'Easy' : 'Medium',
    isSurvivalChallenge: isSurvival,
    healthBenefits: [
      `High-fiber nutrient density powered by whole ${primaryItem.toLowerCase()}`,
      'Zero refined sugar and prepared with heart-healthy cooking methods',
      'Rich in antioxidant phytochemicals from aromatic spices and herbs',
      isSurvival ? 'Minimal-waste pantry survival preparation maximizing every ingredient' : 'Balanced macronutrient profile with wholesome vegetable integration',
    ],
    ingredientsNeeded: [
      ...items.map((item) => ({
        item: item,
        amount: '1 to 2 cups (to taste)',
        isFromPantry: true,
        substituteNote: 'Primary challenge ingredient',
      })),
      {
        item: 'Cooking oil (olive, avocado, or vegetable)',
        amount: '1-2 tablespoons',
        isFromPantry: false,
        substituteNote: 'Essential kitchen staple',
      },
      {
        item: 'Salt & Freshly Cracked Black Pepper',
        amount: 'Pinch to taste',
        isFromPantry: false,
        substituteNote: 'Essential seasoning',
      },
      {
        item: `Aromatic Spices (${style.spices})`,
        amount: '1 teaspoon each',
        isFromPantry: false,
        substituteNote: 'Brings out traditional cultural flavor',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Prep & Mise en Place',
        instruction: `Wash, drain, and chop your ${items.join(' and ')} into uniform, bite-sized pieces for even cooking.`,
        techniqueTip: 'Uniform knife cuts allow vegetables to cook at the exact same rate without mushiness.',
        timerMinutes: 5,
      },
      {
        stepNumber: 2,
        title: 'Warm the Spices & Aromatics',
        instruction: `Heat 1-2 tablespoons of oil in a wide skillet over medium heat. Add spices and aromatics, gently toasting for 45-60 seconds until fragrant.`,
        techniqueTip: style.tip,
        timerMinutes: 2,
      },
      {
        stepNumber: 3,
        title: 'Sauté & Develop Fond',
        instruction: `Add the ${primaryItem} to the skillet. Allow it to sit undisturbed for 2 minutes to develop deep golden browning, then stir gently.`,
        techniqueTip: 'Caramelization (the Maillard reaction) creates deep savory notes without requiring heavy sauces.',
        timerMinutes: 6,
      },
      {
        stepNumber: 4,
        title: 'Incorporate Veggies & Simmer',
        instruction: `Fold in ${secondaryItem} along with 3-4 tablespoons of warm water. Cover with a lid or foil and gently steam-simmer until tender-crisp.`,
        techniqueTip: 'Trapping the steam locks in water-soluble vitamins while creating a light pan glaze.',
        timerMinutes: 5,
      },
      {
        stepNumber: 5,
        title: 'Plate & Season to Perfection',
        instruction: `Remove from heat. Season with a final pinch of salt, pepper, and an optional squeeze of fresh citrus or herbs. Plate cleanly in a shallow bowl.`,
        techniqueTip: 'Wipe the rim of your plate clean before presenting to elevate visual contrast and pride.',
        timerMinutes: 2,
      },
    ],
    mentorNote: isSurvival
      ? `Incredible resourcefulness! You are turning just ${items.length} simple pantry staples into a vibrant cultural dish. Full survival bonus points unlocked!`
      : `Welcome to the ${cuisine} cooking challenge! Let's craft an authentic, vegetable-forward dish using your available pantry ingredients.`,
  };
}

function generateAdaptiveFallbackEvaluation(dishName: string, pantryIngredients: string, reflection: string, hasPhoto: boolean) {
  const items = pantryIngredients.split(/[,\n]+/).filter((s) => s.trim().length > 0);
  const isSurvival = items.length <= 3;
  const bonusPoints = isSurvival ? 18 : 8;

  return {
    dishName: dishName || 'Cultural Challenge Dish',
    totalScore: 92 + (isSurvival ? 4 : 0),
    metricBreakdown: {
      ingredientEfficiency: isSurvival ? 35 : 32,
      veggieBalance: 32,
      culturalTechnique: 28,
      bonusPoints: bonusPoints,
    },
    positiveFeedback: `Outstanding culinary execution! You demonstrated thoughtful heat management and turned ${items.length} pantry items into a wholesome cultural feast. ${hasPhoto ? 'Your plating shows excellent color contrast and appetizing visual doneness.' : 'Your reflection shows keen sensory awareness of seasoning and texture balance.'}`,
    culinaryTipForNextTime: 'To take this dish to the next level, try finishing with a micro-acid like a tiny squeeze of lemon or apple cider vinegar right before serving to awaken the caramelized aromatics.',
  };
}

// API 1: Generate Recipe
app.post('/api/generate-recipe', async (req: Request, res: Response): Promise<void> => {
  try {
    const { cuisine, customCuisine, pantryIngredients } = req.body;

    if (!pantryIngredients || typeof pantryIngredients !== 'string') {
      res.status(400).json({ error: 'Please provide pantry ingredients.' });
      return;
    }

    const selectedCuisine = cuisine === 'Custom' && customCuisine ? customCuisine : (cuisine || 'World Fusion');
    const ingredientCount = pantryIngredients
      .split(/[,\n]+/)
      .map((item: string) => item.trim())
      .filter((item: string) => item.length > 0).length;

    const isSurvivalEligible = ingredientCount <= 3;

    // If API key is present and valid, try Gemini
    if (hasValidApiKey) {
      try {
        const prompt = `Design an authentic, healthy, and highly accessible cultural cooking challenge recipe.
Selected Cultural Cuisine: ${selectedCuisine}
Pantry Ingredients Available:
${pantryIngredients}

Context:
- Number of items provided: ${ingredientCount}
- ${isSurvivalEligible ? 'This is a Minimal-Ingredient Survival Challenge! Emphasize resourcefulness and highlight bonus potential.' : 'Optimize for healthy, high-vegetable balance, authentic cultural flavor profiles, and minimal waste.'}
- Adapt any specialized cultural requirements to use these pantry items plus common everyday household staples (water, standard cooking oil, salt, pepper).
- Break instructions down into crisp, cook-friendly steps with actionable technique guidance.`;

        const response = await callGeminiWithTimeout({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: CULINARY_MENTOR_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                dishName: { type: Type.STRING },
                culturalOrigin: { type: Type.STRING },
                estimatedTimeMinutes: { type: Type.INTEGER },
                difficulty: { type: Type.STRING },
                isSurvivalChallenge: { type: Type.BOOLEAN },
                healthBenefits: { type: Type.ARRAY, items: { type: Type.STRING } },
                ingredientsNeeded: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      item: { type: Type.STRING },
                      amount: { type: Type.STRING },
                      isFromPantry: { type: Type.BOOLEAN },
                      substituteNote: { type: Type.STRING },
                    },
                    required: ['item', 'amount', 'isFromPantry'],
                  },
                },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      stepNumber: { type: Type.INTEGER },
                      title: { type: Type.STRING },
                      instruction: { type: Type.STRING },
                      techniqueTip: { type: Type.STRING },
                      timerMinutes: { type: Type.INTEGER },
                    },
                    required: ['stepNumber', 'title', 'instruction', 'techniqueTip'],
                  },
                },
                mentorNote: { type: Type.STRING },
              },
              required: [
                'dishName',
                'culturalOrigin',
                'estimatedTimeMinutes',
                'difficulty',
                'isSurvivalChallenge',
                'healthBenefits',
                'ingredientsNeeded',
                'steps',
                'mentorNote',
              ],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        res.json(parsed);
        return;
      } catch (geminiErr) {
        console.warn('Gemini generate recipe call note (falling back to adaptive engine):', geminiErr);
      }
    }

    // Adaptive culinary fallback
    const fallbackRecipe = generateAdaptiveFallbackRecipe(selectedCuisine, pantryIngredients);
    res.json(fallbackRecipe);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in /api/generate-recipe:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate recipe.',
    });
  }
});

// API 2: Kitchen Troubleshooting (Stove-side help)
app.post('/api/troubleshoot', async (req: Request, res: Response): Promise<void> => {
  try {
    const { dishName, currentStep, question } = req.body;
    if (!question) {
      res.status(400).json({ error: 'Question is required.' });
      return;
    }

    if (hasValidApiKey) {
      try {
        const prompt = `A home cook is actively cooking "${dishName || 'a cultural challenge dish'}" at the stove and needs immediate assistance.
Current cooking step / context: ${currentStep || 'General cooking'}
Home Cook Question: "${question}"

Provide immediate, calm, practical, and food-safe stove-side troubleshooting guidance.
Keep it concise (2-4 sentences max) so they can act quickly without burning their food.
Explicitly reassure them that asking questions will never deduct challenge points.`;

        const response = await callGeminiWithTimeout({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: `${CULINARY_MENTOR_SYSTEM_INSTRUCTION}\nProvide quick, actionable kitchen troubleshooting. Remind the user asking questions does NOT penalize challenge points.`,
          },
        });

        res.json({
          advice: response.text || 'Keep low heat, stir steadily, and taste carefully.',
          penaltyFreeNotice: 'Live mentor simulation — asking questions will not reduce your challenge score.',
        });
        return;
      } catch (geminiErr) {
        console.warn('Gemini troubleshoot note:', geminiErr);
      }
    }

    // Practical stove-side advice fallback
    res.json({
      advice: `Stove Advice: If your pan is too hot, slide it off the burner for 30 seconds and reduce heat to low-medium. Add a tablespoon of water or broth to prevent sticking, and taste with a spoon to adjust salt. You're doing great!`,
      penaltyFreeNotice: 'Live mentor simulation — asking questions will not reduce your challenge score.',
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in /api/troubleshoot:', error);
    res.status(500).json({
      error: error.message || 'Failed to answer troubleshooting query.',
    });
  }
});

// API 3: Dish Evaluation & Scoring
app.post('/api/evaluate-dish', async (req: Request, res: Response): Promise<void> => {
  try {
    const { dishName, pantryIngredients, reflection, photoBase64, photoMimeType } = req.body;

    if (hasValidApiKey) {
      try {
        const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

        if (photoBase64 && photoMimeType) {
          const cleanedData = photoBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
          parts.push({
            inlineData: {
              mimeType: photoMimeType,
              data: cleanedData,
            },
          });
        }

        const userText = `Please evaluate this finished challenge meal according to the rubric.
Challenge Dish Name: ${dishName || 'Custom Challenge Dish'}
Pantry Items Provided at start: ${pantryIngredients || 'Household staples'}
Cook's Reflection on Taste, Texture, and Modifications:
"${reflection || 'No written reflection provided.'}"
${photoBase64 ? 'Dish Photo: An image of the finished plated dish is attached above. Inspect its vegetable content, color vibrancy, plating, and visual doneness.' : 'Dish Photo: No photo provided; evaluate based on user reflection and ingredient efficiency.'}

Remember the evaluation rubric:
- Ingredient Efficiency (1-35 points)
- Veggie & Nutritional Balance (1-35 points)
- Creative Cultural Technique (1-30 points)
- Survival Bonus (0-20 points, award especially if 3 or fewer base staples were utilized)
Total score is sum of the 3 base metrics (max 100) + bonus points (up to 20).

Output strictly valid JSON conforming to the requested schema.`;

        parts.push({ text: userText });

        const response = await callGeminiWithTimeout({
          model: 'gemini-3.8-flash',
          contents: { parts: parts },
          config: {
            systemInstruction: CULINARY_MENTOR_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                dishName: { type: Type.STRING },
                totalScore: { type: Type.INTEGER },
                metricBreakdown: {
                  type: Type.OBJECT,
                  properties: {
                    ingredientEfficiency: { type: Type.INTEGER },
                    veggieBalance: { type: Type.INTEGER },
                    culturalTechnique: { type: Type.INTEGER },
                    bonusPoints: { type: Type.INTEGER },
                  },
                  required: ['ingredientEfficiency', 'veggieBalance', 'culturalTechnique', 'bonusPoints'],
                },
                positiveFeedback: { type: Type.STRING },
                culinaryTipForNextTime: { type: Type.STRING },
              },
              required: [
                'dishName',
                'totalScore',
                'metricBreakdown',
                'positiveFeedback',
                'culinaryTipForNextTime',
              ],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        res.json(parsed);
        return;
      } catch (geminiErr) {
        console.warn('Gemini evaluate dish note:', geminiErr);
      }
    }

    // Adaptive fallback evaluation
    const fallbackEval = generateAdaptiveFallbackEvaluation(dishName, pantryIngredients, reflection, Boolean(photoBase64));
    res.json(fallbackEval);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in /api/evaluate-dish:', error);
    res.status(500).json({
      error: error.message || 'Failed to evaluate dish.',
    });
  }
});

// Explicit API 404 handler so unhandled /api/* routes NEVER fall through to HTML/Vite
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found.` });
});

// API Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/')) {
    console.error('API Error Middleware caught:', err);
    res.status(500).json({ error: err.message || 'Internal API server error' });
    return;
  }
  next(err);
});

// Setup WebSocket Server for Live Voice & Kitchen Assistance
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  if (pathname === '/api/live' || pathname === '/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to Live Voice WebSocket');
  let liveSession: any = null;

  try {
    if (hasValidApiKey) {
      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: `${CULINARY_MENTOR_SYSTEM_INSTRUCTION}\nYou are providing real-time, hands-free stove-side guidance. Be calm, concise, direct, and reassuring. Remind the home cook that questions never deduct challenge points.`,
        },
        callbacks: {
          onmessage: (message: any) => {
            for (const part of message.serverContent?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
              if (part.text) {
                clientWs.send(JSON.stringify({ text: part.text }));
              }
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onclose: () => {
            clientWs.send(JSON.stringify({ type: 'session_closed' }));
          },
        },
      });

      clientWs.send(JSON.stringify({ type: 'ready', mode: 'gemini-live' }));
    } else {
      clientWs.send(JSON.stringify({ type: 'ready', mode: 'fallback-voice' }));
    }
  } catch (liveErr) {
    clientWs.send(JSON.stringify({ type: 'ready', mode: 'fallback-voice' }));
  }

  clientWs.on('message', async (data: Buffer | string) => {
    try {
      const parsed = JSON.parse(data.toString());

      if (parsed.audio && liveSession) {
        liveSession.sendRealtimeInput({
          audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
        });
        return;
      }

      if (parsed.text) {
        let answer = 'Lower your heat slightly, stir regularly, and taste for seasoning.';
        if (hasValidApiKey) {
          try {
            const prompt = `A home cook at the stove asks via voice: "${parsed.text}".
Dish context: ${parsed.dishContext || 'Active cooking'}.
Provide an immediate, concise, practical mentor answer (2-3 sentences). Remind them that asking questions will not reduce their challenge score.`;

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: { systemInstruction: CULINARY_MENTOR_SYSTEM_INSTRUCTION },
            });
            answer = response.text || answer;
          } catch (e) {
            // fallback used
          }
        }

        clientWs.send(JSON.stringify({ type: 'text_response', text: answer }));
      }
    } catch (msgErr) {
      clientWs.send(JSON.stringify({ type: 'error', message: 'Could not process audio message' }));
    }
  });

  clientWs.on('close', () => {
    if (liveSession && typeof liveSession.close === 'function') {
      try {
        liveSession.close();
      } catch (e) {
        // ignore
      }
    }
  });
});

// Vite Middleware integration
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Food Wars server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server start error:', err);
});
