import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, User, Phone, CreditCard, FileText, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { patientService } from '@/services/patient.service';
import { debounce } from '@/lib/utils';

interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  dateOfBirth: string;
  gender: string;
  phonePrimary: string;
  photoUrl?: string;
  nhisInfo?: {
    nhisNumber: string;
    expiryDate?: string;
  };
}

interface PatientSearchBarProps {
  onSelect?: (patient: Patient) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

type SearchType = 'mrn' | 'phone' | 'ghana_card' | 'nhis' | 'name';

function detectSearchType(query: string): SearchType {
  const trimmed = query.trim();

  // MRN format: XXX-YYYY-NNNNN
  if (/^[A-Za-z]{3}-[0-9]{4}-[0-9]{5}$/.test(trimmed)) {
    return 'mrn';
  }

  // Ghana Card format: GHA-XXXXXXXXX-X
  if (/^GHA-[0-9]{9}-[0-9]$/i.test(trimmed)) {
    return 'ghana_card';
  }

  // Phone number
  if (/^(\+233|233|0)[0-9]{9}$/.test(trimmed.replace(/[\s\-]/g, ''))) {
    return 'phone';
  }

  // NHIS (alphanumeric)
  if (/^[A-Z]{2,4}[0-9]+$/i.test(trimmed)) {
    return 'nhis';
  }

  return 'name';
}

function getSearchTypeIcon(type: SearchType) {
  switch (type) {
    case 'mrn':
      return <FileText className="w-4 h-4 text-blue-500" />;
    case 'phone':
      return <Phone className="w-4 h-4 text-green-500" />;
    case 'ghana_card':
      return <CreditCard className="w-4 h-4 text-purple-500" />;
    case 'nhis':
      return <FileText className="w-4 h-4 text-orange-500" />;
    default:
      return <User className="w-4 h-4 text-gray-500" />;
  }
}

function getSearchTypeLabel(type: SearchType): string {
  switch (type) {
    case 'mrn':
      return 'MRN';
    case 'phone':
      return 'Phone';
    case 'ghana_card':
      return 'Ghana Card';
    case 'nhis':
      return 'NHIS';
    default:
      return 'Name';
  }
}

function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function PatientSearchBar({ onSelect, placeholder = 'Search patients (MRN, Phone, Name)', autoFocus = false }: PatientSearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchType = query.length > 2 ? detectSearchType(query) : 'name';

  // Debounce the search query
  const debouncedSetQuery = useCallback(
    debounce((value: string) => {
      setDebouncedQuery(value);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSetQuery(query);
  }, [query, debouncedSetQuery]);

  // Search query
  const { data, isLoading } = useQuery({
    queryKey: ['patientSearch', debouncedQuery],
    queryFn: () => patientService.search({ q: debouncedQuery, limit: 10 }),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });

  const patients = data?.data?.patients || [];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, patients.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (patients[selectedIndex]) {
            handleSelect(patients[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, patients, selectedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut (Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleSelect = (patient: Patient) => {
    if (onSelect) {
      onSelect(patient);
    } else {
      navigate(`/patients/${patient.id}`);
    }
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-xl" ref={dropdownRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-20 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
        />
        
        {/* Search type badge */}
        {query.length > 2 && (
          <span className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
            {getSearchTypeIcon(searchType)}
            {getSearchTypeLabel(searchType)}
          </span>
        )}

        {/* Clear button */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Keyboard shortcut hint */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-gray-400">
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px]">⌘K</kbd>
      </div>

      {/* Dropdown Results */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-500">Searching...</span>
            </div>
          ) : patients.length > 0 ? (
            <ul>
              {patients.map((patient: Patient, index: number) => (
                <li
                  key={patient.id}
                  onClick={() => handleSelect(patient)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Photo */}
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {patient.photoUrl ? (
                      <img src={patient.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {patient.firstName} {patient.lastName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {calculateAge(patient.dateOfBirth)} yrs, {patient.gender}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="font-mono text-blue-600">{patient.mrn}</span>
                      <span>{patient.phonePrimary}</span>
                    </div>
                  </div>

                  {/* NHIS badge */}
                  {patient.nhisInfo?.nhisNumber && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                      NHIS
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No patients found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
