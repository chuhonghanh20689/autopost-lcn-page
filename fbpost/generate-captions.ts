import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

/* =========================================================
   CONFIG
========================================================= */

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ Không tìm thấy GEMINI_API_KEY trong .env");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: API_KEY,
});

const TOTAL_CAPTIONS = 25;
const BATCH_SIZE = 5;
const MODEL = "gemini-3.6-flash";

/* =========================================================
   PATHS
========================================================= */

const CONFIG_DIR = path.join(
  __dirname,
  "config"
);

const CAMPAIGN_CONFIG_FILE = path.join(
  CONFIG_DIR,
  "campaign-config.json"
);

const CAMPAIGNS_DIR = path.join(
  __dirname,
  "campaigns"
);

const OUTPUT_DIR = path.join(
  __dirname,
  "data"
);

const OUTPUT_FILE = path.join(
  OUTPUT_DIR,
  "captions.json"
);

const HISTORY_FILE = path.join(
  OUTPUT_DIR,
  "captions-history.json"
);

/* =========================================================
   ETSY LINK
   Gemini KHÔNG được viết phần này.
========================================================= */

const FOOTER = `Love Coated Nail
Shop: https://www.etsy.com/shop/LoveCoatedNail?section_id=59451169`;

/* =========================================================
   TYPES
========================================================= */

interface CampaignConfig {
  currentCampaign: string;
  etsySectionUrl?: string;
}

interface CampaignData {
  name: string;
  mainKeyword: string;

  primaryKeywords: string[];

  productKeywords: string[];

  audienceKeywords: string[];

  angles: string[];

  hashtags: string[];

  secondaryOccasions: string[];

  instruction: string;
}

interface GeneratedCaption {
  keyword: string;
  content: string;
  hashtags: string[];
  fullCaption: string;
}

interface SavedCaptions {
  campaign: string;
  generatedAt: string;
  captions: GeneratedCaption[];
}

/* =========================================================
   LOAD CAMPAIGN CONFIG
========================================================= */

function loadCampaignConfig(): CampaignConfig {

  if (
    !fs.existsSync(
      CAMPAIGN_CONFIG_FILE
    )
  ) {
    throw new Error(
      `❌ Không tìm thấy file:

${CAMPAIGN_CONFIG_FILE}`
    );
  }

  try {

    const raw =
      fs.readFileSync(
        CAMPAIGN_CONFIG_FILE,
        "utf-8"
      );

    const config =
      JSON.parse(
        raw
      ) as CampaignConfig;

    if (
      !config.currentCampaign ||
      typeof config.currentCampaign !== "string"
    ) {
      throw new Error(
        'campaign-config.json phải có dạng: {"currentCampaign":"20-10"}'
      );
    }

    return config;

  } catch (error) {

    throw new Error(
      `❌ Không đọc được campaign-config.json.\n${error}`
    );
  }
}

/* =========================================================
   LOAD CAMPAIGN DATA
========================================================= */

function loadCampaignData(
  campaignId: string
): CampaignData {

  const campaignFile =
    path.join(
      CAMPAIGNS_DIR,
      `${campaignId}.json`
    );

  if (
    !fs.existsSync(
      campaignFile
    )
  ) {
    throw new Error(
      `❌ Không tìm thấy campaign:

${campaignFile}

Hãy kiểm tra currentCampaign trong:

${CAMPAIGN_CONFIG_FILE}`
    );
  }

  try {

    const raw =
      fs.readFileSync(
        campaignFile,
        "utf-8"
      );

    const campaign =
      JSON.parse(
        raw
      ) as CampaignData;

    if (
      !campaign.name
    ) {
      throw new Error(
        "Campaign thiếu field: name"
      );
    }

    if (
      !campaign.mainKeyword
    ) {
      throw new Error(
        "Campaign thiếu field: mainKeyword"
      );
    }

    if (
      !Array.isArray(
        campaign.primaryKeywords
      ) ||
      campaign.primaryKeywords.length === 0
    ) {
      throw new Error(
        "Campaign thiếu primaryKeywords."
      );
    }

    if (
      !Array.isArray(
        campaign.productKeywords
      ) ||
      campaign.productKeywords.length === 0
    ) {
      throw new Error(
        "Campaign thiếu productKeywords."
      );
    }

    if (
      !Array.isArray(
        campaign.audienceKeywords
      ) ||
      campaign.audienceKeywords.length === 0
    ) {
      throw new Error(
        "Campaign thiếu audienceKeywords."
      );
    }

    if (
      !Array.isArray(
        campaign.angles
      ) ||
      campaign.angles.length === 0
    ) {
      throw new Error(
        "Campaign thiếu angles."
      );
    }

    if (
      !Array.isArray(
        campaign.hashtags
      ) ||
      campaign.hashtags.length === 0
    ) {
      throw new Error(
        "Campaign thiếu hashtags."
      );
    }

    if (
      !Array.isArray(
        campaign.secondaryOccasions
      )
    ) {
      campaign.secondaryOccasions = [];
    }

    if (
      !campaign.instruction
    ) {
      campaign.instruction = "";
    }

    return campaign;

  } catch (error) {

    throw new Error(
      `❌ Không đọc được campaign ${campaignId}.json.\n${error}`
    );
  }
}

/* =========================================================
   LOAD HISTORY
========================================================= */

function loadHistory(): GeneratedCaption[] {

  if (
    !fs.existsSync(
      HISTORY_FILE
    )
  ) {
    return [];
  }

  try {

    const raw =
      fs.readFileSync(
        HISTORY_FILE,
        "utf-8"
      );

    const parsed =
      JSON.parse(
        raw
      );

    if (
      !Array.isArray(
        parsed
      )
    ) {
      return [];
    }

    return parsed;

  } catch {

    console.log(
      "⚠️ Không đọc được captions-history.json."
    );

    console.log(
      "⚠️ Sẽ bắt đầu history mới."
    );

    return [];
  }
}

/* =========================================================
   SAVE HISTORY
========================================================= */

function saveHistory(
  captions: GeneratedCaption[]
) {

  if (
    !fs.existsSync(
      OUTPUT_DIR
    )
  ) {
    fs.mkdirSync(
      OUTPUT_DIR,
      {
        recursive: true
      }
    );
  }

  /*
   * Giữ tối đa 100 caption gần nhất.
   */
  const limitedHistory =
    captions.slice(
      -100
    );

  fs.writeFileSync(
    HISTORY_FILE,
    JSON.stringify(
      limitedHistory,
      null,
      2
    ),
    "utf-8"
  );

  console.log(
    `💾 Đã lưu history: ${limitedHistory.length} caption`
  );
}

/* =========================================================
   JSON SCHEMA
========================================================= */

const responseSchema = {

  type: "object",

  properties: {

    captions: {

      type: "array",

      items: {

        type: "object",

        properties: {

          keyword: {
            type: "string",

            description:
              "Primary keyword hoặc keyword SEO chính được sử dụng trong caption."
          },

          content: {
            type: "string",

            description:
              "Natural English Facebook caption for a US audience, medium length, SEO-aware without keyword stuffing."
          },

          hashtags: {

            type: "array",

            items: {
              type: "string"
            },

            description:
              "3 đến 5 hashtag liên quan."
          }
        },

        required: [
          "keyword",
          "content",
          "hashtags"
        ]
      }
    }
  },

  required: [
    "captions"
  ]
};

/* =========================================================
   GENERATE BATCH
========================================================= */

async function generateBatch(
  batchNumber: number,
  count: number,
  campaign: CampaignData,
  existingCaptions: GeneratedCaption[]
): Promise<GeneratedCaption[]> {

  console.log(
    `\n🤖 Đang tạo batch ${batchNumber} — ${count} caption...`
  );

  const previousExamples =
    existingCaptions
      .slice(-30)
      .map(
        (item) =>
          `Keyword: ${item.keyword}
Content: ${item.content}
Hashtags: ${item.hashtags.join(" ")}`
      )
      .join("\n\n");

  const prompt = `

You are writing Facebook group marketing captions for Love Coated Nail, a handmade press-on nail brand targeting US customers.

Create ${count} different captions in natural English.

==================================================
CURRENT CAMPAIGN
==================================================

Campaign name:
${campaign.name}

Main keyword:
${campaign.mainKeyword}

==================================================
PRIMARY SEO KEYWORDS
==================================================

${campaign.primaryKeywords.map((keyword) => `- ${keyword}`).join("\n")}

These are the most important keywords.

Rules:
- Prioritize "Halloween Nails" and "Gothic Nails" as the main SEO themes when they are present in the campaign keywords.
- Use the exact keyword naturally in the caption.
- Prefer 1 primary keyword per caption, with occasional natural use of a second primary keyword.
- Do not stuff keywords or write keyword lists.

==================================================
PRODUCT KEYWORDS
==================================================

${campaign.productKeywords.map((keyword) => `- ${keyword}`).join("\n")}

Use 2–4 relevant product keywords when they fit naturally.

==================================================
AUDIENCE KEYWORDS
==================================================

${campaign.audienceKeywords.map((keyword) => `- ${keyword}`).join("\n")}

Use relevant audience keywords naturally when appropriate.

==================================================
CONTENT ANGLES
==================================================

${campaign.angles.map((angle) => `- ${angle}`).join("\n")}

==================================================
HASHTAGS
==================================================

${campaign.hashtags.map((hashtag) => `- ${hashtag}`).join("\n")}

==================================================
SECONDARY OCCASIONS
==================================================

${campaign.secondaryOccasions.length > 0 ? campaign.secondaryOccasions.map((occasion) => `- ${occasion}`).join("\n") : "- None"}

==================================================
CAMPAIGN INSTRUCTION
==================================================

${campaign.instruction}

==================================================
PRODUCT INFORMATION
==================================================

Love Coated Nail offers handmade press-on nails featuring:
- premium soft gel
- reusable press-on nails
- magnetic cat eye finishes
- silver chrome artwork
- blue moonstone-inspired accents
- gothic jewelry-inspired details
- glossy salon-quality finish
- complimentary Zodiac personalization
- initial personalization
- custom sizing, shape and length options

The current Halloween design is inspired by gothic cathedrals, moonlit nights, antique silver jewelry and Halloween magic.

==================================================
CURRENT HALLOWEEN PRODUCT
==================================================

The featured product is a luxury Halloween press-on nail set with:
- black cat eye effects
- luminous blue moonstone accents
- sculptural silver chrome
- gothic details
- black, silver, deep blue and icy moonlight tones

It is suitable for Halloween parties, spooky season, gothic fashion, witchcore, dark academia, alternative fashion, cosplay, photoshoots and fall fashion.

==================================================
WRITING STYLE
==================================================

Write in natural English for American Facebook users.

The captions should feel like a real small handmade nail brand posting in Facebook groups.

Tone:
- natural
- warm
- confident
- visually descriptive
- slightly conversational
- premium but not overly formal
- not corporate

Avoid exaggerated marketing language and generic inspirational phrases.

Do NOT write phrases such as:
- "a little sweetness"
- "send love"
- "made with love"
- "a gift from the heart"
- "more than just nails"
- "timeless elegance" unless genuinely relevant to the design
- brochure-style language

==================================================
LENGTH
==================================================

Each caption should be around 4–7 sentences or roughly 500–800 characters.

Vary the length and structure so the captions do not look templated.

==================================================
SEO
==================================================

SEO is important, but readability comes first.

The exact phrases "Halloween Nails" and "Gothic Nails" should be strongly prioritized across the batch because they are the main search themes for this campaign.

Naturally combine them with relevant phrases such as:
- Halloween Press On Nails
- Gothic Press On Nails
- Gothic Fake Nails
- Black Cat Eye Nails
- Luxury Halloween Nails
- Handmade Press On Nails

Do not create keyword lists.

Example of the desired style:
"Looking for Halloween Nails with a darker, more gothic feel? This handmade set combines black cat eye gel, icy blue moonstone accents and silver chrome details inspired by antique gothic jewelry. If you love Gothic Nails but still want something wearable and polished, this set brings the spooky details without looking costume-like..."

==================================================
ETSY LINK
==================================================

The Etsy section link is:
https://www.etsy.com/shop/LoveCoatedNail?section_id=59451169

Do NOT invent another Etsy URL.

The code will automatically append this exact Etsy link to every final caption, so you do not need to include the URL yourself in the generated content.

==================================================
CTA
==================================================

Use a natural CTA when appropriate, such as:
- "See the full set on Etsy"
- "Take a closer look on Etsy"
- "Shop the Halloween collection on Etsy"
- "If this is your style, the full set is on Etsy"

Do not use the Etsy URL inside the generated content because the code adds it automatically.

==================================================
PERSONALIZATION
==================================================

Mention personalization selectively, not in every caption.

Customers can choose:
- Zodiac sign
- initial A–Z
- nail size
- nail shape
- nail length
- additional customization when possible

==================================================
WHAT NOT TO INVENT
==================================================

Do not invent:
- discounts
- prices
- free shipping
- reviews
- stock quantities
- awards
- certifications
- ingredients not provided
- delivery promises beyond the supplied product information

==================================================
CAPTION HISTORY
==================================================

Do not copy or closely paraphrase these previous captions:

${previousExamples || "(No previous captions.)"}

==================================================
OUTPUT
==================================================

Return JSON matching the provided schema.

Create exactly ${count} captions.
`

  try {

    const response =
      await ai.interactions.create({

        model: MODEL,

        input: prompt,

        response_format: {

          type: "text",

          mime_type:
            "application/json",

          schema:
            responseSchema
        }
      });

    if (
      !response.output_text
    ) {
      throw new Error(
        "Gemini không trả về output_text."
      );
    }

    const parsed =
      JSON.parse(
        response.output_text
      );

    if (
      !parsed.captions ||
      !Array.isArray(
        parsed.captions
      )
    ) {
      throw new Error(
        "JSON trả về không có mảng captions."
      );
    }

    /*
     * Keyword hợp lệ bao gồm cả 3 nhóm.
     */
    const allowedKeywords =
      new Set([
        ...campaign.primaryKeywords,
        ...campaign.productKeywords,
        ...campaign.audienceKeywords
      ]);

    const result:
      GeneratedCaption[] =
      parsed.captions

        .map(
          (item: any) => {

            const keyword =
              String(
                item.keyword || ""
              ).trim();

            const content =
              String(
                item.content || ""
              ).trim();

            const hashtags =
              Array.isArray(
                item.hashtags
              )
                ? item.hashtags
                    .map(
                      (h: any) =>
                        String(h).trim()
                    )
                    .filter(
                      Boolean
                    )
                : [];

            return {
              keyword,
              content,
              hashtags,
              fullCaption: ""
            };
          }
        )

        .filter(
          (
            item: GeneratedCaption
          ) =>
            item.keyword &&
            item.content &&
            allowedKeywords.has(
              item.keyword
            )
        );

    return result;

  } catch (error) {

    console.error(
      `❌ Lỗi khi tạo batch ${batchNumber}:`
    );

    console.error(
      error
    );

    return [];
  }
}

/* =========================================================
   REMOVE DUPLICATES
========================================================= */

function removeDuplicates(
  captions: GeneratedCaption[]
): GeneratedCaption[] {

  const seen =
    new Set<string>();

  const result:
    GeneratedCaption[] = [];

  for (
    const caption of captions
  ) {

    const normalized =
      caption.content
        .toLowerCase()
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    if (
      seen.has(
        normalized
      )
    ) {
      continue;
    }

    seen.add(
      normalized
    );

    result.push(
      caption
    );
  }

  return result;
}

/* =========================================================
   REMOVE HISTORY DUPLICATES
========================================================= */

function removeHistoryDuplicates(
  captions: GeneratedCaption[],
  history: GeneratedCaption[]
): GeneratedCaption[] {

  const historySet =
    new Set(
      history.map(
        (item) =>
          item.content
            .toLowerCase()
            .replace(
              /\s+/g,
              " "
            )
            .trim()
      )
    );

  return captions.filter(
    (caption) => {

      const normalized =
        caption.content
          .toLowerCase()
          .replace(
            /\s+/g,
            " "
          )
          .trim();

      return !historySet.has(
        normalized
      );
    }
  );
}

/* =========================================================
   BUILD FULL CAPTION
========================================================= */

function buildFullCaption(
  caption: GeneratedCaption
): GeneratedCaption {

  const hashtagText =
    caption.hashtags.join(" ");

  const etsyLink =
    "https://www.etsy.com/shop/LoveCoatedNail?section_id=59451169";

  const fullCaption = `${caption.content}

${hashtagText}

${etsyLink}`;

  return {
    ...caption,
    fullCaption
  };
}

/* =========================================================
   SAVE CAPTIONS
========================================================= */

function saveCaptions(
  campaignId: string,
  captions: GeneratedCaption[]
) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(
      OUTPUT_DIR,
      {
        recursive: true
      }
    );
  }

  const output: SavedCaptions = {
    campaign: campaignId,
    generatedAt: new Date().toISOString(),
    captions
  };

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      output,
      null,
      2
    ),
    "utf-8"
  );

  console.log(
    `\n💾 Đã lưu captions cho campaign "${campaignId}":`
  );

  console.log(
    OUTPUT_FILE
  );
}

/* =========================================================
   MAIN
========================================================= */

async function main() {

  console.log(
    "\n============================================"
  );

  console.log(
    "       GEMINI CAPTION GENERATOR"
  );

  console.log(
    "============================================"
  );

  /*
   * 1. Đọc current campaign
   */

  const config =
    loadCampaignConfig();

  console.log(
    `🎯 Current campaign: ${config.currentCampaign}`
  );

  /*
   * 2. Đọc campaign JSON
   */

  const campaign =
    loadCampaignData(
      config.currentCampaign
    );

  console.log(
    `📢 Campaign: ${campaign.name}`
  );

  console.log(
    `⭐ Main keyword: ${campaign.mainKeyword}`
  );

  console.log(
    `🎯 Primary keywords: ${campaign.primaryKeywords.length}`
  );

  console.log(
    `📦 Product keywords: ${campaign.productKeywords.length}`
  );

  console.log(
    `👥 Audience keywords: ${campaign.audienceKeywords.length}`
  );

  console.log(
    `💡 Angles: ${campaign.angles.length}`
  );

  console.log(
    `#️⃣ Hashtags: ${campaign.hashtags.length}`
  );

  console.log(
    `\n📌 Caption mỗi lần chạy: ${TOTAL_CAPTIONS}`
  );

  /*
   * 3. Load history
   */

  const history =
    loadHistory();

  console.log(
    `📚 Caption trong history: ${history.length}`
  );

  /*
   * 4. Generate 25 captions
   */

  let captions:
    GeneratedCaption[] = [];

  let batchNumber = 1;

  while (
    captions.length <
    TOTAL_CAPTIONS
  ) {

    const remaining =
      TOTAL_CAPTIONS -
      captions.length;

    const count =
      Math.min(
        BATCH_SIZE,
        remaining
      );

    const previous = [
      ...history,
      ...captions
    ];

    const batch =
      await generateBatch(
        batchNumber,
        count,
        campaign,
        previous
      );

    if (
      batch.length === 0
    ) {

      console.log(
        `⚠️ Batch ${batchNumber} không tạo được caption.`
      );

      console.log(
        "🔄 Thử lại..."
      );

      batchNumber++;

      if (
        batchNumber > 20
      ) {

        console.log(
          "❌ Đã thử quá nhiều lần."
        );

        break;
      }

      continue;
    }

    /*
     * Loại caption trùng trong batch.
     */

    let cleanBatch =
      removeDuplicates(
        batch
      );

    /*
     * Loại caption đã có trong history.
     */

    cleanBatch =
      removeHistoryDuplicates(
        cleanBatch,
        [
          ...history,
          ...captions
        ]
      );

    captions.push(
      ...cleanBatch
    );

    console.log(
      `✅ Đã có ${captions.length}/${TOTAL_CAPTIONS} caption.`
    );

    batchNumber++;

    /*
     * Nghỉ giữa request.
     */

    if (
      captions.length <
      TOTAL_CAPTIONS
    ) {

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            1500
          )
      );
    }
  }

  /*
   * Chỉ lấy đúng 25.
   */

  captions =
    captions
      .slice(
        0,
        TOTAL_CAPTIONS
      )
      .map(
        buildFullCaption
      );

  /*
   * Không đủ 25 => không coi là thành công.
   */

  if (
    captions.length <
    TOTAL_CAPTIONS
  ) {

    console.log(
      `\n❌ Chỉ tạo được ${captions.length}/${TOTAL_CAPTIONS} caption.`
    );

    console.log(
      "❌ Không nên dùng batch này để đăng."
    );

    return;
  }

  /*
   * Save current batch.
   */

  saveCaptions(
    config.currentCampaign,
    captions
  );

  /*
   * Save history.
   */

  const updatedHistory = [
    ...history,
    ...captions
  ];

  saveHistory(
    updatedHistory
  );

  /*
   * Keyword statistics.
   */

  console.log(
    "\n📊 Phân bổ keyword:"
  );

  const keywordStats:
    Record<string, number> =
    {};

  for (
    const caption of captions
  ) {

    keywordStats[
      caption.keyword
    ] =
      (
        keywordStats[
          caption.keyword
        ] || 0
      ) + 1;
  }

  console.log(
    "\n--- PRIMARY ---"
  );

  for (
    const keyword of
    campaign.primaryKeywords
  ) {

    console.log(
      `- ${keyword}: ${
        keywordStats[
          keyword
        ] || 0
      }`
    );
  }

  console.log(
    "\n--- PRODUCT ---"
  );

  for (
    const keyword of
    campaign.productKeywords
  ) {

    console.log(
      `- ${keyword}: ${
        keywordStats[
          keyword
        ] || 0
      }`
    );
  }

  console.log(
    "\n--- AUDIENCE ---"
  );

  for (
    const keyword of
    campaign.audienceKeywords
  ) {

    console.log(
      `- ${keyword}: ${
        keywordStats[
          keyword
        ] || 0
      }`
    );
  }

  /*
   * Done.
   */

  console.log(
    "\n============================================"
  );

  console.log(
    "                 HOÀN TẤT"
  );

  console.log(
    "============================================"
  );

  console.log(
    `🎯 Campaign: ${campaign.name}`
  );

  console.log(
    `⭐ Main keyword: ${campaign.mainKeyword}`
  );

  console.log(
    `✅ Caption: ${captions.length}`
  );

  console.log(
    `💾 Output: ${OUTPUT_FILE}`
  );

  console.log(
    `📚 History: ${HISTORY_FILE}`
  );

  console.log(
    `\n👉 captions.json đã được gắn campaign: ${config.currentCampaign}`
  );

  console.log(
    "👉 Chưa đăng Facebook — chỉ mới tạo content."
  );
}

/* =========================================================
   RUN
========================================================= */

main().catch(
  (error) => {

    console.error(
      "\n❌ Lỗi không xử lý được:"
    );

    console.error(
      error
    );

    process.exit(1);
  }
);