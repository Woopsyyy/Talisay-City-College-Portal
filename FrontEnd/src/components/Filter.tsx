import React, { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { AdminAPI } from '../services/api';

export default function LevelSectionFilter() {
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [yearLevels, setYearLevels] = useState<Array<{ id: string; label: string }>>([]);
  const [sections, setSections] = useState<Array<{ id: string; label: string }>>([]);
  const [allSectionsData, setAllSectionsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const data = await AdminAPI.getSections();
        const rows: any[] = Array.isArray(data) ? data : [];
        setAllSectionsData(rows);
        
        
        const uniqueYears: any[] = [...new Set(rows.map((item: any) => item.year))].sort();
        
        const formattedYears = uniqueYears.map((year: any) => ({
          id: year.toString(),
          label: Number.isNaN(Number(year)) ? String(year) : `Year ${year}`
        }));
        setYearLevels(formattedYears);

        
        const uniqueSections: string[] = [...new Set(rows.map((item: any) => String(item.name || "")))]
          .filter(Boolean)
          .sort();
        setSections(uniqueSections.map(name => ({ id: name, label: name })));
      } catch (error) {
        console.error("Failed to fetch filter data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFilters();
  }, []);

  
  useEffect(() => {
    if (loading) return;
    
    let relevantSections = allSectionsData;
    if (selectedLevel !== 'all') {
      relevantSections = allSectionsData.filter((item: any) => String(item.year) === selectedLevel);
    }

    const uniqueSectionNames: string[] = [...new Set(relevantSections.map((item: any) => String(item.name || "")))]
      .filter(Boolean)
      .sort();
    setSections(uniqueSectionNames.map(name => ({ id: name, label: name })));

    
    if (selectedSection !== 'all' && !uniqueSectionNames.includes(selectedSection)) {
      setSelectedSection('all');
    }
  }, [selectedLevel, allSectionsData, loading]);

  const handleLevelChange = (levelId) => {
    setSelectedLevel(levelId);
    console.log('Filter changed:', { level: levelId, section: selectedSection });
  };

  const handleSectionChange = (sectionId) => {
    setSelectedSection(sectionId);
    console.log('Filter changed:', { level: selectedLevel, section: sectionId });
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading filters...</div>;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl">
        {}
        <div className="flex items-start gap-3 mb-8 pb-6 border-b border-gray-200">
          <Filter className="text-blue-600 mt-1" size={24} />
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Filter by Level & Section</h2>
            <p className="text-sm text-gray-600">Focus the overview by academic year or section.</p>
          </div>
        </div>

        {}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">YEAR LEVEL</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleLevelChange('all')}
              className={`px-6 py-2 text-sm font-medium rounded-full border-2 transition-all ${
                selectedLevel === 'all'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              All Years
            </button>
            {yearLevels.map((level) => (
              <button
                key={level.id}
                onClick={() => handleLevelChange(level.id)}
                className={`px-6 py-2 text-sm font-medium rounded-full border-2 transition-all ${
                  selectedLevel === level.id
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>

        {}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">SECTION</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleSectionChange('all')}
              className={`px-6 py-2 text-sm font-medium rounded-full border-2 transition-all ${
                selectedSection === 'all'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              All Sections
            </button>
            {sections.length > 0 ? sections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionChange(section.id)}
                className={`px-6 py-2 text-sm font-medium rounded-full border-2 transition-all ${
                  selectedSection === section.id
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {section.label}
              </button>
            )) : (
              <span className="text-sm text-gray-500 italic py-2">No sections available for this level</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
