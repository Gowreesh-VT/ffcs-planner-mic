'use client';

/**
 * PREFERENCES PAGE — Multi-step wizard for timetable creation
 *
 * Flow: Landing → Login → Create New Timetable → **Preferences** → Courses → Timetable → Saved
 *
 * PURPOSE:
 * The user completes a 6-step wizard to set their preferences:
 *   1. Select Department (e.g., SCOPE, SENSE, SELECT, SMEC, SCHEME)
 *   2. Select Domain (course categories like Foundation Core, Discipline Core, etc.)
 *   3. Select Subject (specific courses from the selected domain)
 *   4. Select Slot (available time slots for the course)
 *   5. Select Faculty (professor for the course)
 *   6. Faculty Priority (set priority for faculty selection)
 *
 * DATABASE INTERACTIONS:
 * - No direct DB writes on this page
 * - Reads course catalog data from static data files
 * - Selected preferences are stored in PreferencesContext
 *
 * DATA FLOW:
 * - Input: Course catalog data (static imports from /data)
 * - Output: fullCourseData[] → passed to /courses page via context
 * - Uses: lib/PreferencesContext.tsx (state management)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePreferences } from '@/lib/PreferencesContext';
import { getCourseType } from '@/lib/course_codes_map';
import { fullCourseData } from '@/lib/type';

// Cookie utility functions
const setCookie = (name: string, value: string, days = 30) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
};

const deleteCookie = (name: string) => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

const getCookie = (name: string): string | null => {
    const nameEQ = name + '=';
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(nameEQ) === 0) {
            return decodeURIComponent(cookie.substring(nameEQ.length));
        }
    }
    return null;
};

const STEP_COLORS = ['#A0C4FF', '#FFB3D9', '#B5EAD7', '#A0C4FF', '#FFB3D9', '#B5EAD7'];
const STEP_LABELS = [
    'Select Department',
    'Select Domain',
    'Select Subject',
    'Select Slot',
    'Select Faculty',
    'Faculty Priority',
];

export default function PreferencesPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { selectedCourses, addCourse } = usePreferences();

    const [currentStep, setCurrentStep] = useState(1);
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
    const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
    const [selectedFaculties, setSelectedFaculties] = useState<string[]>([]);
    const [facultyPriority, setFacultyPriority] = useState<'slot' | 'faculty'>('slot');
    const [isVisible, setIsVisible] = useState(false);
    const [editingTimetableTitle, setEditingTimetableTitle] = useState<string | null>(null);

    // Load preferences from cookies on mount
    useEffect(() => {
        const savedStep = getCookie('preferenceStep');
        const savedDepartments = getCookie('preferenceDepartments');
        const savedDomains = getCookie('preferenceDomains');
        const savedSubjects = getCookie('preferenceSubjects');
        const savedSlots = getCookie('preferenceSlots');
        const savedFaculties = getCookie('preferenceMultipleFaculties');
        const savedPriority = getCookie('facultyPriority');

        if (savedStep) {
            const parsedStep = Number.parseInt(savedStep, 10);
            if (!Number.isNaN(parsedStep) && parsedStep >= 1 && parsedStep <= 6) {
                setCurrentStep(parsedStep);
            }
        }
        if (savedDepartments) setSelectedDepartments(JSON.parse(savedDepartments));
        if (savedDomains) setSelectedDomains(JSON.parse(savedDomains));
        if (savedSubjects) setSelectedSubjects(JSON.parse(savedSubjects));
        if (savedSlots) setSelectedSlots(JSON.parse(savedSlots));
        if (savedFaculties) setSelectedFaculties(JSON.parse(savedFaculties));
        if (savedPriority) setFacultyPriority(savedPriority as 'slot' | 'faculty');

        const editingTitle = getCookie('editingTimetableTitle');
        if (editingTitle) {
            setEditingTimetableTitle(editingTitle);
        }
    }, []);

    // Save preferences to cookies whenever they change
    useEffect(() => {
        setCookie('preferenceStep', currentStep.toString());
        setCookie('preferenceDepartments', JSON.stringify(selectedDepartments));
        setCookie('preferenceDomains', JSON.stringify(selectedDomains));
        setCookie('preferenceSubjects', JSON.stringify(selectedSubjects));
        setCookie('preferenceSlots', JSON.stringify(selectedSlots));
        setCookie('preferenceMultipleFaculties', JSON.stringify(selectedFaculties));
        setCookie('facultyPriority', facultyPriority);
    }, [currentStep, selectedDepartments, selectedDomains, selectedSubjects, selectedSlots, selectedFaculties, facultyPriority]);

    useEffect(() => {
        const timer = window.setTimeout(() => setIsVisible(true), 40);
        return () => window.clearTimeout(timer);
    }, []);

    const departments = [
        'SCOPE',
        'SENSE',
        'SELECT',
        'SMEC',
        'SCHEME',
        'SCORE',
        'SBST',
        'SCE',
        'SHINE',
        'SCOPE_F',
        'MTech_SCOPE',
        'MTech_SCORE',
    ];

    // Load department data dynamically
    const departmentData = useMemo(() => {
        if (selectedDepartments.length === 0) return null;
        try {
            const schemeMap: { [key: string]: any } = {
                SCOPE: require('@/data/SCOPE').SCOPE_LIST,
                SENSE: require('@/data/SENSE').SENSE_LIST,
                SELECT: require('@/data/SELECT').SELECT_LIST,
                SMEC: require('@/data/SMEC').SMEC_LIST,
                SCHEME: require('@/data/SCHEME').SCHEME_LIST,
                SCORE: require('@/data/SCORE').SCORE_LIST,
                SBST: require('@/data/SBST').SBST_LIST,
                SCE: require('@/data/SCE').SCE_LIST,
                SHINE: require('@/data/SHINE').SHINE_LIST,
                SCOPE_F: require('@/data/SCOPE_F').SCOPE_F,
                MTech_SCOPE: require('@/data/MTech_SCOPE').MTech_SCOPE,
                MTech_SCORE: require('@/data/MTech_SCORE').MIS_LIST,
            };
            let combinedMap: any = {};
            selectedDepartments.forEach(dept => {
                const data = schemeMap[dept] || {};
                Object.keys(data).forEach(domain => {
                    if (!combinedMap[domain]) combinedMap[domain] = {};
                    Object.keys(data[domain]).forEach(subject => {
                        if (!combinedMap[domain][subject]) {
                            combinedMap[domain][subject] = [];
                        }
                        combinedMap[domain][subject].push(...data[domain][subject]);
                    });
                });
            });
            return combinedMap;
        } catch (error) {
            console.error('Error loading department data:', error);
            return {};
        }
    }, [selectedDepartments]);

    // Get available domains (categories)
    const domains = useMemo(() => {
        return departmentData ? Object.keys(departmentData) : [];
    }, [departmentData]);

    // Get subjects in selected domain
    const subjects = useMemo(() => {
        if (selectedDomains.length === 0 || !departmentData) return [];
        let allSubjects: string[] = [];
        selectedDomains.forEach(domain => {
            if (departmentData[domain]) {
                allSubjects = [...allSubjects, ...Object.keys(departmentData[domain])];
            }
        });
        return [...new Set(allSubjects)];
    }, [selectedDomains, departmentData]);

    // Get slots for selected subject
    const slots = useMemo(() => {
        if (selectedSubjects.length === 0 || selectedDomains.length === 0 || !departmentData) return [];
        const slotSet = new Set<string>();
        selectedDomains.forEach(domain => {
            const domainData = departmentData[domain] || {};
            selectedSubjects.forEach(subject => {
                const subjectData = domainData[subject] || [];
                subjectData.forEach((item: any) => {
                    if (item.slot) slotSet.add(item.slot);
                });
            });
        });
        return Array.from(slotSet);
    }, [selectedSubjects, selectedDomains, departmentData]);

    // Get faculties for selected slot
    const faculties = useMemo<string[]>(() => {
        if (selectedSubjects.length === 0 || selectedDomains.length === 0 || selectedSlots.length === 0 || !departmentData) return [];
        const facultySet = new Set<string>();

        selectedDomains.forEach(domain => {
            const domainData = departmentData[domain] || {};
            selectedSubjects.forEach(subject => {
                const subjectData = domainData[subject] || [];
                subjectData.forEach((item: any) => {
                    if (selectedSlots.includes(item.slot)) {
                        if (item.faculty) facultySet.add(item.faculty);
                    }
                });
            });
        });

        return Array.from(facultySet);
    }, [selectedSubjects, selectedDomains, selectedSlots, departmentData]);

    const handleNext = () => {
        if (currentStep < 6) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleStepClick = (stepNum: number) => {
        if (stepNum >= 1 && stepNum <= 6) {
            setCurrentStep(stepNum);
        }
    };

    const handleAddAnotherProfessor = () => {
        setCurrentStep(5);
        setCookie('preferenceStep', '5');
    };

    const handleDepartmentSelect = (dept: string) => {
        setSelectedDepartments(prev =>
            prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
        );
        setSelectedDomains([]);
        setSelectedSubjects([]);
        setSelectedSlots([]);
        setSelectedFaculties([]);
    };

    const handleDomainSelect = (domain: string) => {
        setSelectedDomains(prev =>
            prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
        );
        setSelectedSubjects([]);
        setSelectedSlots([]);
        setSelectedFaculties([]);
    };

    const handleSubjectSelect = (subject: string) => {
        setSelectedSubjects(prev =>
            prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
        );
        setSelectedSlots([]);
        setSelectedFaculties([]);
    };

    const handleSlotSelect = (slot: string) => {
        setSelectedSlots(prev =>
            prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
        );
        setSelectedFaculties([]);
    };

    const handleFacultySelect = (faculty: string) => {
        setSelectedFaculties(prev =>
            prev.includes(faculty) ? prev.filter(f => f !== faculty) : [...prev, faculty]
        );
    };

    const saveCurrentSelection = () => {
        if (selectedSubjects.length > 0 && selectedSlots.length > 0 && selectedFaculties.length > 0) {
            let newCourses: fullCourseData[] = [];

            selectedDomains.forEach(domain => {
                const domainData = departmentData?.[domain] || {};
                selectedSubjects.forEach(subject => {
                    const subjectData = domainData[subject] || [];

                    const MathGroups = new Map<string, string[]>(); // slot -> faculty[]

                    subjectData.forEach((item: any) => {
                        if (selectedSlots.includes(item.slot) && selectedFaculties.includes(item.faculty)) {
                            if (!MathGroups.has(item.slot)) MathGroups.set(item.slot, []);
                            if (!MathGroups.get(item.slot)!.includes(item.faculty)) {
                                MathGroups.get(item.slot)!.push(item.faculty);
                            }
                        }
                    });

                    if (MathGroups.size > 0) {
                        const [code, ...nameParts] = subject.split(' - ');
                        const courseName = nameParts.join(' - ') || subject;
                        const courseType = getCourseType(code);

                        const slotsArr = Array.from(MathGroups.entries()).map(([slotName, faculties]) => ({
                            slotName,
                            slotFaculties: faculties.map(f => ({ facultyName: f }))
                        }));

                        const uniqueId = subject + '_' + slotsArr.map(s => s.slotName).join('_') + '_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9);
                        const course: fullCourseData = {
                            id: uniqueId,
                            courseType,
                            courseCode: code,
                            courseName,
                            courseSlots: slotsArr
                        };
                        newCourses.push(course);
                    }
                });
            });

            if (newCourses.length > 0) {
                newCourses.forEach(c => addCourse(c));

                try {
                    const existingCoursesRaw = getCookie('preferenceCourses');
                    let existingCourses: fullCourseData[] = existingCoursesRaw ? JSON.parse(existingCoursesRaw) : [];

                    newCourses.forEach(course => {
                        existingCourses = existingCourses.filter(existing => existing.id !== course.id);
                        existingCourses.push(course);
                    });

                    setCookie('preferenceCourses', JSON.stringify(existingCourses));
                } catch (error) {
                    console.error('Error saving preferenceCourses cookie:', error);
                    setCookie('preferenceCourses', JSON.stringify(newCourses));
                }
            }

            // Clear state after saving
            setSelectedSubjects([]);
            setSelectedSlots([]);
            setSelectedFaculties([]);
            setCurrentStep(1);
        }
    };

    const handleFinish = () => {
        router.push('/courses');
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return selectedDepartments.length > 0;
            case 2:
                return selectedDomains.length > 0;
            case 3:
                return selectedSubjects.length > 0;
            case 4:
                return selectedSlots.length > 0;
            case 5:
                return selectedFaculties.length > 0;
            case 6:
                return selectedFaculties.length > 0;
            default:
                return false;
        }
    };

    const canAddAnotherProfessor = faculties.some(faculty => !selectedFaculties.includes(faculty));

    return (
        <div className={`h-screen bg-[#F5E6D3] font-sans flex flex-col overflow-hidden transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            {/* Main Content */}
            <div className="flex-1 p-10 flex flex-col min-h-0 overflow-hidden">
                <div className="flex items-center gap-4 mb-8 shrink-0">
                    <h1 className="text-4xl font-bold text-black animate-lucid-fade-up">Select Your Preferences</h1>
                    {editingTimetableTitle && (
                        <div className="bg-blue-100 border-2 border-blue-400 rounded-lg px-4 py-2 flex items-center gap-2 animate-lucid-fade-up">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="text-blue-800 font-semibold text-sm">Editing: {editingTimetableTitle}</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-6 flex-1 min-h-0">
                    {/* Step Panels */}
                    {[1, 2, 3, 4, 5, 6].map(stepNum => (
                        <div
                            key={stepNum}
                            onClick={stepNum === currentStep ? undefined : () => handleStepClick(stepNum)}
                            className={`rounded-2xl flex items-center justify-center transition-all duration-300 overflow-hidden ${stepNum === currentStep ? 'flex-[3]' : 'flex-1'
                                } ${stepNum === currentStep ? 'shadow-xl cursor-default' : 'shadow-md cursor-pointer'}`}
                            style={{ backgroundColor: STEP_COLORS[stepNum - 1] }}
                        >
                            {stepNum === currentStep ? (
                                <div key={`active-step-${currentStep}`} className="w-full h-full p-8 flex flex-col animate-lucid-panel-in">
                                    <h2 className="text-2xl font-bold mb-10 text-black">
                                        {stepNum}. {STEP_LABELS[stepNum - 1]}
                                    </h2>

                                    <div className="flex-1 bg-white/40 rounded-lg p-6 overflow-y-auto custom-scrollbar">
                                        {/* Step 1: Department Selection */}
                                        {stepNum === 1 && (
                                            <div style={{ display: 'grid', gap: '10px' }}>
                                                {departments.map(dept => (
                                                    <button
                                                        key={dept}
                                                        onClick={() => handleDepartmentSelect(dept)}
                                                        className={`w-full p-4 rounded-lg text-left font-semibold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${selectedDepartments.includes(dept)
                                                            ? 'bg-white ring-2 ring-blue-500 shadow-md'
                                                            : 'bg-white/80 hover:bg-white hover:shadow-sm'
                                                            }`}
                                                    >
                                                        {dept}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Step 2: Domain Selection */}
                                        {stepNum === 2 && (
                                            <div style={{ display: 'grid', gap: '10px' }}>
                                                {domains.length > 0 ? domains.map(domain => (
                                                    <button
                                                        key={domain}
                                                        onClick={() => handleDomainSelect(domain)}
                                                        className={`w-full p-4 rounded-lg text-left font-semibold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${selectedDomains.includes(domain)
                                                            ? 'bg-white ring-2 ring-blue-500 shadow-md'
                                                            : 'bg-white/80 hover:bg-white hover:shadow-sm'
                                                            }`}
                                                    >
                                                        {domain}
                                                    </button>
                                                )) : (
                                                    <div className="text-center text-gray-700 py-8">
                                                        Please select a department first
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Step 3: Subject Selection */}
                                        {stepNum === 3 && (
                                            <div style={{ display: 'grid', gap: '10px' }}>
                                                {subjects.length > 0 ? subjects.map(subject => (
                                                    <button
                                                        key={subject}
                                                        onClick={() => handleSubjectSelect(subject)}
                                                        className={`w-full p-4 rounded-lg text-left transition-all duration-200 hover:-translate-y-0.5 ${selectedSubjects.includes(subject)
                                                            ? 'bg-white ring-2 ring-blue-500 shadow-md'
                                                            : 'bg-white/80 hover:bg-white hover:shadow-sm'
                                                            }`}
                                                    >
                                                        <div className="font-mono font-bold text-sm">
                                                            {subject.split(' - ')[0]}
                                                        </div>
                                                        <div className="text-xs text-gray-700 mt-1">
                                                            {subject.split(' - ').slice(1).join(' - ')}
                                                        </div>
                                                    </button>
                                                )) : (
                                                    <div className="text-center text-gray-700 py-8">
                                                        Please select a domain first
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Step 4: Slot Selection */}
                                        {stepNum === 4 && (
                                            <div style={{ display: 'grid', gap: '10px' }}>
                                                {slots.length > 0 ? slots.map(slot => (
                                                    <button
                                                        key={slot}
                                                        onClick={() => handleSlotSelect(slot)}
                                                        className={`w-full p-4 rounded-lg text-left font-semibold transition-all duration-200 hover:-translate-y-0.5 ${selectedSlots.includes(slot)
                                                            ? 'bg-white ring-2 ring-blue-500 shadow-md'
                                                            : 'bg-white/80 hover:bg-white hover:shadow-sm'
                                                            }`}
                                                    >
                                                        {slot}
                                                    </button>
                                                )) : (
                                                    <div className="text-center text-gray-700 py-8">
                                                        Please select a subject first
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Step 5: Faculty Selection */}
                                        {stepNum === 5 && (
                                            <div style={{ display: 'grid', gap: '10px' }}>
                                                {faculties.length > 0 ? faculties.map((faculty, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleFacultySelect(faculty)}
                                                        className={`w-full p-4 rounded-lg text-left font-semibold transition-all duration-200 hover:-translate-y-0.5 ${selectedFaculties.includes(faculty)
                                                            ? 'bg-white ring-2 ring-blue-500 shadow-md'
                                                            : 'bg-white/80 hover:bg-white hover:shadow-sm'
                                                            }`}
                                                    >
                                                        {faculty}
                                                    </button>
                                                )) : (
                                                    <div className="text-center text-gray-700 py-8">
                                                        Please select a slot first
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Step 6: Faculty Priority */}
                                        {stepNum === 6 && (
                                            <div className="flex flex-col h-full">
                                                <p className="text-gray-800 font-medium mb-3">
                                                    Professors selected in Step 5 are auto-added:
                                                </p>

                                                <div className="bg-gray-100 rounded-lg p-3">
                                                    <p className="text-sm font-bold text-gray-700 mb-2">Your Faculty Preferences:</p>
                                                    {selectedFaculties.length > 0 ? (
                                                        <div style={{ display: 'grid', gap: '8px' }}>
                                                            {selectedFaculties.map((faculty, idx) => (
                                                                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded">
                                                                    <span className="text-sm font-semibold">{faculty}</span>
                                                                    <button
                                                                        onClick={() => {
                                                                            const updated = selectedFaculties.filter((_, i) => i !== idx);
                                                                            setSelectedFaculties(updated);
                                                                        }}
                                                                        className="text-red-500 hover:text-red-700 font-bold"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-500">No faculty added yet</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}


                                    </div>

                                    {/* Navigation arrows within active panel */}
                                    <div className="flex justify-between mt-24 gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                                            disabled={currentStep === 1}
                                            className={`px-4 py-2 rounded-lg bg-white font-bold text-xl cursor-pointer ${currentStep === 1
                                                ? 'opacity-40 cursor-not-allowed'
                                                : 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200'
                                                }`}
                                        >
                                            ←
                                        </button>
                                        {currentStep === 6 ? (
                                            <div className="flex w-full gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleAddAnotherProfessor(); }}
                                                    title={'Reset to Step 5 and add another professor'}
                                                    className="flex-1 px-3 py-2 rounded-lg font-bold text-sm bg-[#FFF7ED] text-[#EA580C] hover:bg-[#FFEDD5] hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 border border-[#FDBA74] cursor-pointer"
                                                >
                                                    + Add another
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        saveCurrentSelection();
                                                        router.push('/courses');
                                                    }}
                                                    title={'Save current preference and view all courses'}
                                                    className="flex-1 px-4 py-2 rounded-lg font-bold text-sm bg-[#10B981] text-white hover:bg-[#059669] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                                                >
                                                    Save & Continue →
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                                disabled={!canProceed()}
                                                className={`px-4 py-2 rounded-lg bg-white font-bold text-xl cursor-pointer ${!canProceed()
                                                    ? 'opacity-40 cursor-not-allowed'
                                                    : 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200'
                                                    }`}
                                            >
                                                →
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center p-2">
                                    <div
                                        className="text-xl font-bold tracking-wide whitespace-nowrap"
                                        style={{
                                            writingMode: 'vertical-rl',
                                            textOrientation: 'mixed',
                                            transform: 'rotate(180deg)'
                                        }}
                                    >
                                        {STEP_LABELS[stepNum - 1]}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="bg-white border-t border-gray-300 py-6 px-8 shadow-lg animate-lucid-fade-up-delayed">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-3">
                        {session?.user?.image ? (
                            <img src={session.user.image} alt="User avatar" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                        )}
                        <span className="text-gray-700 text-sm">{session?.user?.name || "Guest"}</span>
                    </div>

                    <div className="flex items-center gap-3">
                        {[1, 2, 3, 4].map(num => (
                            <button
                                key={num}
                                onClick={() => {
                                    saveCurrentSelection();
                                    if (num === 1) router.push('/preferences');
                                    if (num === 2) router.push('/courses');
                                    if (num === 3) router.push('/timetable');
                                    if (num === 4) router.push('/saved');
                                }}
                                className={`px-5 py-2 rounded-lg font-semibold text-sm cursor-pointer ${num === 1
                                    ? 'bg-[#A0C4FF] text-black'
                                    : 'bg-[#A0C4FF]/40 text-gray-700'
                                    }`}
                            >
                                {num === 1 ? '1. Preferences' : num}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                saveCurrentSelection();
                                router.push('/');
                            }}
                            className="px-8 py-2.5 border-2 border-gray-400 rounded-lg font-semibold text-sm hover:bg-gray-50 text-black transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => {
                                saveCurrentSelection();
                                router.push('/courses');
                            }}
                            className="px-10 py-2.5 rounded-lg font-semibold text-sm bg-[#A0C4FF] hover:bg-[#90B4EF] text-black transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.3);
                }

                @keyframes lucidFadeUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes lucidPanelIn {
                    from { opacity: 0; transform: translateX(8px); }
                    to { opacity: 1; transform: translateX(0); }
                }

                .animate-lucid-fade-up {
                    animation: lucidFadeUp 420ms ease-out;
                }

                .animate-lucid-fade-up-delayed {
                    animation: lucidFadeUp 560ms ease-out;
                }

                .animate-lucid-panel-in {
                    animation: lucidPanelIn 280ms ease-out;
                }
            `}</style>
        </div >
    );
}
