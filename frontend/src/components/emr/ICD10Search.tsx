import React, { useState, useEffect, useCallback } from 'react';
import { Search, Star, Clock, MapPin, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { emrService, ICD10Code } from '@/services/emr.service';
import { useDebounce } from '@/hooks/useDebounce';

interface ICD10SearchProps {
  onSelect: (code: ICD10Code) => void;
  chiefComplaint?: string;
  placeholder?: string;
}

export const ICD10Search: React.FC<ICD10SearchProps> = ({
  onSelect,
  chiefComplaint,
  placeholder = 'Search ICD-10 codes...',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ICD10Code[]>([]);
  const [ghanaCommon, setGhanaCommon] = useState<ICD10Code[]>([]);
  const [favorites, setFavorites] = useState<ICD10Code[]>([]);
  const [recent, setRecent] = useState<ICD10Code[]>([]);
  const [suggestions, setSuggestions] = useState<ICD10Code[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search');

  const debouncedQuery = useDebounce(query, 300);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [ghanaData, favData, recentData] = await Promise.all([
          emrService.getGhanaCommonDiagnoses(),
          emrService.getDoctorFavorites(),
          emrService.getDoctorRecentlyUsed(),
        ]);
        setGhanaCommon(ghanaData);
        setFavorites(favData);
        setRecent(recentData);
      } catch (error) {
        console.error('Error loading ICD-10 data:', error);
      }
    };
    loadInitialData();
  }, []);

  // Load suggestions based on chief complaint
  useEffect(() => {
    if (chiefComplaint && chiefComplaint.length > 3) {
      emrService.suggestDiagnoses(chiefComplaint)
        .then(setSuggestions)
        .catch(console.error);
    }
  }, [chiefComplaint]);

  // Search ICD-10 codes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const data = await emrService.searchICD10(debouncedQuery, { limit: 15 });
        setResults(data);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  const handleSelect = useCallback((code: ICD10Code) => {
    onSelect(code);
    setQuery('');
    setResults([]);
  }, [onSelect]);

  const renderCodeItem = (code: ICD10Code, showBadge = true) => (
    <button
      key={code.code}
      onClick={() => handleSelect(code)}
      className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-blue-600">
              {code.code}
            </span>
            {showBadge && code.isCommonGhana && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                <MapPin className="w-3 h-3 mr-1" />
                Ghana
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-700 mt-1 line-clamp-2">
            {code.description}
          </p>
          {code.category && (
            <p className="text-xs text-gray-500 mt-1">{code.category}</p>
          )}
        </div>
      </div>
    </button>
  );

  return (
    <div className="w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results */}
      {query.length >= 2 && (
        <div className="mt-2 border rounded-lg max-h-80 overflow-y-auto bg-white shadow-lg">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : results.length > 0 ? (
            results.map((code) => renderCodeItem(code))
          ) : (
            <div className="p-4 text-center text-gray-500">No results found</div>
          )}
        </div>
      )}

      {/* Tabs for quick access */}
      {!query && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="suggestions" className="text-xs">
              Suggested
            </TabsTrigger>
            <TabsTrigger value="recent" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Recent
            </TabsTrigger>
            <TabsTrigger value="favorites" className="text-xs">
              <Star className="w-3 h-3 mr-1" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="ghana" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              Ghana
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suggestions" className="mt-2">
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {suggestions.length > 0 ? (
                suggestions.map((code) => renderCodeItem(code))
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {chiefComplaint 
                    ? 'No suggestions for this complaint' 
                    : 'Enter chief complaint to see suggestions'}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-2">
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {recent.length > 0 ? (
                recent.map((code) => renderCodeItem(code))
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No recent diagnoses
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="mt-2">
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {favorites.length > 0 ? (
                favorites.map((code) => renderCodeItem(code))
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No favorite diagnoses yet
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ghana" className="mt-2">
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {ghanaCommon.map((code) => renderCodeItem(code, false))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ICD10Search;
