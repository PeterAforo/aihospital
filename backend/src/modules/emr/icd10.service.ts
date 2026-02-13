import { prisma } from '../../common/utils/prisma';

export interface ICD10SearchResult {
  code: string;
  description: string;
  chapter: number | null;
  category: string | null;
  isCommonGhana: boolean;
  synonyms: string[];
  relevanceScore?: number;
}

export interface ICD10SearchOptions {
  limit?: number;
  ghanaCommonOnly?: boolean;
  chapter?: number;
}

export class ICD10Service {
  /**
   * Search ICD-10 codes by query string
   * Searches code, description, and synonyms
   */
  async search(query: string, options: ICD10SearchOptions = {}): Promise<ICD10SearchResult[]> {
    const { limit = 10, ghanaCommonOnly = false, chapter } = options;

    if (!query || query.length < 2) {
      return [];
    }

    const searchQuery = query.toLowerCase().trim();

    // Check if it's a code search (starts with letter followed by digits)
    const isCodeSearch = /^[a-z]\d/i.test(searchQuery);

    if (isCodeSearch) {
      // Exact or prefix code match
      const results = await prisma.iCD10Code.findMany({
        where: {
          code: {
            startsWith: searchQuery.toUpperCase(),
          },
          ...(ghanaCommonOnly && { isCommonGhana: true }),
          ...(chapter && { chapter }),
        },
        take: limit,
        orderBy: [
          { isCommonGhana: 'desc' },
          { code: 'asc' },
        ],
      });

      return results.map(r => ({
        code: r.code,
        description: r.description,
        chapter: r.chapter,
        category: r.category,
        isCommonGhana: r.isCommonGhana,
        synonyms: r.synonyms,
        relevanceScore: 100,
      }));
    }

    // Text search on description and synonyms
    const results = await prisma.iCD10Code.findMany({
      where: {
        OR: [
          { description: { contains: searchQuery, mode: 'insensitive' } },
          { synonyms: { hasSome: [searchQuery] } },
          { category: { contains: searchQuery, mode: 'insensitive' } },
        ],
        ...(ghanaCommonOnly && { isCommonGhana: true }),
        ...(chapter && { chapter }),
      },
      take: limit * 2, // Get more to allow for scoring
      orderBy: [
        { isCommonGhana: 'desc' },
        { description: 'asc' },
      ],
    });

    // Score and sort results
    const scoredResults = results.map(r => {
      let score = 0;
      const descLower = r.description.toLowerCase();
      
      // Exact match in description
      if (descLower === searchQuery) {
        score = 100;
      }
      // Starts with query
      else if (descLower.startsWith(searchQuery)) {
        score = 90;
      }
      // Contains query as word
      else if (descLower.includes(` ${searchQuery}`) || descLower.includes(`${searchQuery} `)) {
        score = 80;
      }
      // Contains query
      else if (descLower.includes(searchQuery)) {
        score = 70;
      }
      // Match in synonyms
      else if (r.synonyms.some(s => s.toLowerCase().includes(searchQuery))) {
        score = 60;
      }
      // Match in category
      else if (r.category?.toLowerCase().includes(searchQuery)) {
        score = 50;
      }

      // Boost Ghana common codes
      if (r.isCommonGhana) {
        score += 10;
      }

      return {
        code: r.code,
        description: r.description,
        chapter: r.chapter,
        category: r.category,
        isCommonGhana: r.isCommonGhana,
        synonyms: r.synonyms,
        relevanceScore: score,
      };
    });

    // Sort by score and limit
    return scoredResults
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, limit);
  }

  /**
   * Get a specific ICD-10 code by code
   */
  async getByCode(code: string): Promise<ICD10SearchResult | null> {
    const result = await prisma.iCD10Code.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!result) return null;

    return {
      code: result.code,
      description: result.description,
      chapter: result.chapter,
      category: result.category,
      isCommonGhana: result.isCommonGhana,
      synonyms: result.synonyms,
    };
  }

  /**
   * Get Ghana common diagnoses (pre-curated list)
   */
  async getGhanaCommonDiagnoses(limit = 50): Promise<ICD10SearchResult[]> {
    const results = await prisma.iCD10Code.findMany({
      where: { isCommonGhana: true },
      take: limit,
      orderBy: { description: 'asc' },
    });

    return results.map(r => ({
      code: r.code,
      description: r.description,
      chapter: r.chapter,
      category: r.category,
      isCommonGhana: r.isCommonGhana,
      synonyms: r.synonyms,
    }));
  }

  /**
   * Get doctor's frequently used diagnoses
   */
  async getDoctorFavorites(doctorId: string, limit = 20): Promise<ICD10SearchResult[]> {
    // Query diagnoses grouped by ICD-10 code for this doctor
    const frequentCodes = await prisma.diagnosis.groupBy({
      by: ['icd10Code'],
      where: {
        encounter: {
          doctorId,
        },
      },
      _count: {
        icd10Code: true,
      },
      orderBy: {
        _count: {
          icd10Code: 'desc',
        },
      },
      take: limit,
    });

    if (frequentCodes.length === 0) {
      return [];
    }

    // Get full ICD-10 details
    const codes = frequentCodes.map(f => f.icd10Code);
    const icdDetails = await prisma.iCD10Code.findMany({
      where: { code: { in: codes } },
    });

    // Map to results maintaining frequency order
    return frequentCodes.map(fc => {
      const detail = icdDetails.find(d => d.code === fc.icd10Code);
      return {
        code: fc.icd10Code,
        description: detail?.description || fc.icd10Code,
        chapter: detail?.chapter || null,
        category: detail?.category || null,
        isCommonGhana: detail?.isCommonGhana || false,
        synonyms: detail?.synonyms || [],
      };
    });
  }

  /**
   * Get recently used diagnoses by doctor
   */
  async getDoctorRecentlyUsed(doctorId: string, limit = 20): Promise<ICD10SearchResult[]> {
    const recentDiagnoses = await prisma.diagnosis.findMany({
      where: {
        encounter: {
          doctorId,
        },
      },
      select: {
        icd10Code: true,
        icd10Description: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 2, // Get more to dedupe
    });

    // Dedupe by code, keeping most recent
    const seen = new Set<string>();
    const unique = recentDiagnoses.filter(d => {
      if (seen.has(d.icd10Code)) return false;
      seen.add(d.icd10Code);
      return true;
    }).slice(0, limit);

    // Get full ICD-10 details
    const codes = unique.map(d => d.icd10Code);
    const icdDetails = await prisma.iCD10Code.findMany({
      where: { code: { in: codes } },
    });

    return unique.map(d => {
      const detail = icdDetails.find(icd => icd.code === d.icd10Code);
      return {
        code: d.icd10Code,
        description: detail?.description || d.icd10Description,
        chapter: detail?.chapter || null,
        category: detail?.category || null,
        isCommonGhana: detail?.isCommonGhana || false,
        synonyms: detail?.synonyms || [],
      };
    });
  }

  /**
   * Suggest diagnoses based on chief complaint keywords
   */
  async suggestFromChiefComplaint(chiefComplaint: string): Promise<ICD10SearchResult[]> {
    const keywords: Record<string, string[]> = {
      'fever': ['B50.9', 'A01.0', 'J18.9', 'R50.9'],
      'malaria': ['B50.9', 'B51.9', 'B54'],
      'headache': ['G43.9', 'G44.2', 'R51'],
      'chest pain': ['I21.9', 'I20.9', 'R07.9'],
      'cough': ['J06.9', 'J20.9', 'J18.9', 'R05'],
      'diarrhea': ['A09', 'K59.1'],
      'vomiting': ['R11', 'A09'],
      'abdominal pain': ['R10.4', 'K29.7'],
      'hypertension': ['I10', 'I11.9'],
      'diabetes': ['E11.9', 'E10.9'],
      'back pain': ['M54.5'],
      'joint pain': ['M25.5'],
      'pregnancy': ['Z34.9', 'O80'],
      'anemia': ['D50.9', 'D64.9'],
      'sickle cell': ['D57.0', 'D57.1'],
      'asthma': ['J45.9'],
      'uti': ['N39.0'],
      'urinary': ['N39.0'],
    };

    const complaintLower = chiefComplaint.toLowerCase();
    const matchedCodes: string[] = [];

    for (const [keyword, codes] of Object.entries(keywords)) {
      if (complaintLower.includes(keyword)) {
        matchedCodes.push(...codes);
      }
    }

    if (matchedCodes.length === 0) {
      return [];
    }

    // Dedupe
    const uniqueCodes = [...new Set(matchedCodes)];

    const results = await prisma.iCD10Code.findMany({
      where: { code: { in: uniqueCodes } },
    });

    return results.map(r => ({
      code: r.code,
      description: r.description,
      chapter: r.chapter,
      category: r.category,
      isCommonGhana: r.isCommonGhana,
      synonyms: r.synonyms,
    }));
  }
}

export const icd10Service = new ICD10Service();
