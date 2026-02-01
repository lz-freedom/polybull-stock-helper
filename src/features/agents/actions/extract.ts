'use server';

import { generateObject } from 'ai';
import { getModel, MODELS } from '@/features/mastra';
import { z } from 'zod';

const extractSchema = z.object({
  symbol: z.string().nullable().describe('The stock symbol (e.g., AAPL, TSLA) or null if none found'),
  exchange: z.string().optional().describe('The exchange acronym (e.g., NASDAQ, NYSE)'),
  isCrypto: z.boolean().optional().describe('Whether it is a cryptocurrency'),
});

export async function extractStockInfoFromText(text: string) {
  try {
    const { object } = await generateObject({
      model: getModel(MODELS.DEFAULT),
      schema: extractSchema,
      system: `You are a financial entity extractor. Your goal is to identify the primary stock symbol or cryptocurrency mentioned in the user's text.
      
      Rules:
      1. If a stock symbol is mentioned (e.g., "Apple", "AAPL"), extract it as the symbol (e.g., "AAPL").
      2. If an exchange is mentioned or implied, extract it. Default to 'NASDAQ' or 'NYSE' for major US stocks if not specified.
      3. If it's a crypto (e.g., "Bitcoin", "BTC"), set isCrypto to true.
      4. If NO stock/crypto is found, return null for symbol.`,
      prompt: text,
      providerOptions: {
        openai: {
          store: false,
        },
      },
    });
    
    return object;
  } catch (error) {
    console.error('Extraction error:', error);
    // Fallback: simple regex for common tickers (3-5 uppercase letters)
    const match = text.match(/\b[A-Z]{3,5}\b/);
    if (match) {
        return { symbol: match[0], exchange: 'NASDAQ', isCrypto: false };
    }
    return { symbol: null, exchange: null };
  }
}
