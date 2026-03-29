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
import { getPlannerStoredValue, setPlannerStoredValue } from '@/lib/plannerStorage';

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

const keepFirst = (arr: string[]): string[] => (arr.length > 0 ? [arr[0]] : []);

const STEP_COLORS = ['#9bc0f6', '#eedaff', '#d1fae5', '#9bc0f6', '#eedaff', '#d1fae5'];
const STEP_BORDER_COLORS = ['#759fdf', '#bfa1eb', '#9dcbb5', '#759fdf', '#bfa1eb', '#9dcbb5'];
const STEP_LABELS = [
    'Select Department',
    'Select Domain',
    'Select Subject',
    'Select Slot',
    'Select Faculty',
    'Faculty Priority',
];

const selectionButtonClass = 'w-full p-3 lg:p-4 rounded-lg text-left font-semibold transition-all duration-200 hover:-translate-y-0.5';
const selectionButtonSelectedClass = 'bg-white ring-2 ring-blue-500 shadow-md';
const selectionButtonUnselectedClass = 'bg-white/80 hover:bg-white hover:shadow-sm';

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
    const [savedFacultyPreferences, setSavedFacultyPreferences] = useState<string[]>([]);
    const [facultyPriority, setFacultyPriority] = useState<'slot' | 'faculty'>('slot');
    const [isVisible, setIsVisible] = useState(false);
    const [selectionError, setSelectionError] = useState('');

    const moveFacultyUp = (index: number) => {
        if (index === 0) return;
        const updated = [...savedFacultyPreferences];
        [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
        setSavedFacultyPreferences(updated);
    };

    const moveFacultyDown = (index: number) => {
        if (index === savedFacultyPreferences.length - 1) return;
        const updated = [...savedFacultyPreferences];
        [updated[index + 1], updated[index]] = [updated[index], updated[index + 1]];
        setSavedFacultyPreferences(updated);
    };
    // Load preferences from cookies on mount
    useEffect(() => {
        const savedStep = getCookie('preferenceStep');
        const savedDepartments = getCookie('preferenceDepartments');
        const savedDomains = getCookie('preferenceDomains');
        const savedSubjects = getCookie('preferenceSubjects');
        const savedSlots = getCookie('preferenceSlots');
        const savedFaculties = getPlannerStoredValue('preferenceMultipleFaculties');
        const savedPriority = getCookie('facultyPriority');

        if (savedStep) {
            const parsedStep = Number.parseInt(savedStep, 10);
            if (!Number.isNaN(parsedStep) && parsedStep >= 1 && parsedStep <= 6) {
                setCurrentStep(parsedStep);
            }
        }
        if (savedDepartments) {
            const parsed = JSON.parse(savedDepartments);
            setSelectedDepartments(keepFirst(Array.isArray(parsed) ? parsed : []));
        }
        if (savedDomains) {
            const parsed = JSON.parse(savedDomains);
            setSelectedDomains(keepFirst(Array.isArray(parsed) ? parsed : []));
        }
        if (savedSubjects) {
            const parsed = JSON.parse(savedSubjects);
            setSelectedSubjects(keepFirst(Array.isArray(parsed) ? parsed : []));
        }
        if (savedSlots) setSelectedSlots(JSON.parse(savedSlots));
        if (savedFaculties) setSavedFacultyPreferences(JSON.parse(savedFaculties));
        if (savedPriority) setFacultyPriority(savedPriority as 'slot' | 'faculty');


    }, []);

    // Save preferences to cookies whenever they change
    useEffect(() => {
        setCookie('preferenceStep', currentStep.toString());
        setCookie('preferenceDepartments', JSON.stringify(selectedDepartments));
        setCookie('preferenceDomains', JSON.stringify(selectedDomains));
        setCookie('preferenceSubjects', JSON.stringify(selectedSubjects));
        setCookie('preferenceSlots', JSON.stringify(selectedSlots));
        setCookie('facultyPriority', facultyPriority);
    }, [currentStep, selectedDepartments, selectedDomains, selectedSubjects, selectedSlots, facultyPriority]);

    useEffect(() => {
        setPlannerStoredValue('preferenceMultipleFaculties', JSON.stringify(savedFacultyPreferences));
    }, [savedFacultyPreferences]);

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
        'SBST_F',
        'SCORE_F',
        'SENSE_F',
        'SELECT_F',
        'SHINE_F',
        'SMEC_F',
        'MTech_SCOPE',
        'MTech_SCORE',
    ];

    const deptDisplayName = (dept: string) => dept.endsWith('_F') ? dept.replace('_F', '_Freshers') : dept;

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
                SBST_F: require('@/data/SBST_F').SBST_F,
                SCORE_F: require('@/data/SCORE_F').SCORE_F,
                SENSE_F: require('@/data/SENSE_F').SENSE_F,
                SELECT_F: require('@/data/SELECT_F').SELECT_F,
                SHINE_F: require('@/data/SHINE_F').SHINE_F,
                SMEC_F: require('@/data/SMEC_F').SMEC_F,
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
        if (currentStep === 5) {
            const persisted = persistCurrentSelection(false);
            if (persisted) {
                setCurrentStep(6);
            }
            return;
        }

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
        setSelectionError('');
        setSelectedSubjects([]);
        setSelectedSlots([]);
        setSelectedFaculties([]);
        setCurrentStep(3);
        setCookie('preferenceStep', '3');
    };

    const handleDepartmentSelect = (dept: string) => {
        setSelectionError('');
        setSelectedDepartments(prev => (prev[0] === dept ? [] : [dept]));
        setSelectedDomains([]);
        setSelectedSubjects([]);
        setSelectedSlots([]);
        setSelectedFaculties([]);
    };

    const handleDomainSelect = (domain: string) => {
        setSelectionError('');
        setSelectedDomains(prev => (prev[0] === domain ? [] : [domain]));
        setSelectedSubjects([]);
        setSelectedSlots([]);
        setSelectedFaculties([]);
    };

    const handleSubjectSelect = (subject: string) => {
        setSelectionError('');
        setSelectedSubjects(prev => (prev[0] === subject ? [] : [subject]));
        setSelectedSlots([]);
        setSelectedFaculties([]);
    };

    const handleSlotSelect = (slot: string) => {
        setSelectionError('');
        setSelectedSlots(prev =>
            prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
        );
    };

    const handleFacultySelect = (faculty: string) => {
        setSelectionError('');
        setSelectedFaculties(prev =>
            prev.includes(faculty) ? prev.filter(f => f !== faculty) : [...prev, faculty]
        );
    };

    const persistCurrentSelection = (resetWizard = true) => {
        if (selectedSubjects.length > 0 && selectedSlots.length > 0 && selectedFaculties.length > 0) {
            setSelectionError('');
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
                let existingCourses: fullCourseData[] = [];

                try {
                    const existingCoursesRaw = getPlannerStoredValue('preferenceCourses');
                    existingCourses = existingCoursesRaw ? JSON.parse(existingCoursesRaw) : [];
                } catch (error) {
                    console.error('Error reading preferenceCourses cookie:', error);
                }

                const existingEntries = new Set(
                    existingCourses.flatMap(course =>
                        course.courseSlots.flatMap(courseSlot =>
                            courseSlot.slotFaculties.map(faculty => `${course.courseCode}||${courseSlot.slotName}||${faculty.facultyName}`)
                        )
                    )
                );

                const duplicateEntry = newCourses.flatMap(course =>
                    course.courseSlots.flatMap(courseSlot =>
                        courseSlot.slotFaculties.map(faculty => ({
                            key: `${course.courseCode}||${courseSlot.slotName}||${faculty.facultyName}`,
                            courseCode: course.courseCode,
                            courseName: course.courseName,
                            slotName: courseSlot.slotName,
                            facultyName: faculty.facultyName,
                        }))
                    )
                ).find(entry => existingEntries.has(entry.key));

                if (duplicateEntry) {
                    setSelectionError(
                        `${duplicateEntry.facultyName} is already added for ${duplicateEntry.courseCode} (${duplicateEntry.slotName}).`
                    );
                    return false;
                }

                newCourses.forEach(c => addCourse(c));

                try {
                    let updatedExistingCourses = [...existingCourses];

                    newCourses.forEach(course => {
                        updatedExistingCourses = updatedExistingCourses.filter(existing => existing.id !== course.id);
                        updatedExistingCourses.push(course);
                    });

                    setPlannerStoredValue('preferenceCourses', JSON.stringify(updatedExistingCourses));
                } catch (error) {
                    console.error('Error saving preferenceCourses cookie:', error);
                    setPlannerStoredValue('preferenceCourses', JSON.stringify(newCourses));
                }

                setSavedFacultyPreferences(prev => {
                    const merged = [...prev];
                    selectedFaculties.forEach(faculty => {
                        if (!merged.includes(faculty)) {
                            merged.push(faculty);
                        }
                    });
                    return merged;
                });
            }

            if (resetWizard) {
                setSelectedSubjects([]);
                setSelectedSlots([]);
                setSelectedFaculties([]);
                setCurrentStep(1);
            } else {
                setSelectedFaculties([]);
            }

            return true;
        }

        return false;
    };

    const saveCurrentSelection = () => {
        persistCurrentSelection(true);
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
                return savedFacultyPreferences.length > 0;
            default:
                return false;
        }
    };

    const canAddAnotherProfessor = faculties.some(faculty => !selectedFaculties.includes(faculty));

    return (
        <>
        <div className={`h-screen bg-[#F5E6D3] font-sans overflow-hidden transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <div className="h-full px-[clamp(12px,1.5vw,24px)] pt-[clamp(10px,1vh,18px)] pb-29">
                <div className="w-full max-w-450 h-full mx-auto flex flex-col min-h-0">
                    <div className="flex items-center gap-4 px-2 pt-6 pb-3 shrink-0">
                        <h1 className="text-[26px] lg:text-3xl font-bold text-black animate-lucid-fade-up">Select Your Preferences</h1>
                    </div>

                    <div className="flex-1 min-h-0 bg-white rounded-[18px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-white overflow-hidden px-4 py-4 lg:px-6 lg:py-5 animate-lucid-fade-up-delayed">
                            <div className="flex items-stretch gap-[clamp(8px,0.9vw,16px)] h-full min-h-0 min-w-0 overflow-hidden" style={{ scrollBehavior: 'smooth' }}>
                        {/* Step Panels */}
                        {[1, 2, 3, 4, 5, 6].map(stepNum => (
                            <div
                                key={stepNum}
                                onClick={stepNum === currentStep ? undefined : () => handleStepClick(stepNum)}
                                className={`rounded-2xl flex items-center justify-center transition-all duration-300 overflow-hidden shrink-0 ${
  stepNum === currentStep
    ? 'flex-[2.8] min-w-70 max-w-117.5'
    : 'flex-1 min-w-14.5'
}`}
                                style={{ backgroundColor: STEP_COLORS[stepNum - 1] }}
                            >
                            {stepNum === currentStep ? (
                                <div key={`active-step-${currentStep}`} className="w-full h-full flex flex-col px-2 lg:px-4 pt-4 pb-3 overflow-hidden bg-white/10 backdrop-blur-sm rounded-2xl animate-lucid-panel-in">
                                    <div 
                                        className="flex items-center justify-center shrink-0 border-b-4 pb-3 mb-3 px-2 lg:-mx-4 lg:px-4"
                                        style={{ borderBottomColor: STEP_BORDER_COLORS[stepNum - 1] }}
                                    >
                                        <h2 className="text-[16px] lg:text-[28px] font-bold text-black m-0 leading-none text-center">
                                            {stepNum}. {STEP_LABELS[stepNum - 1]}
                                        </h2>
                                    </div>

                                    <div className="flex-1 bg-transparent p-1 lg:p-3 overflow-y-auto custom-scrollbar flex flex-col">
                                        {selectionError && (
                                            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                                {selectionError}
                                            </div>
                                        )}
                                        {/* Step 1: Department Selection */}
                                        {stepNum === 1 && (
                                            <div style={{ display: 'grid', gap: '10px' }}>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-1">
                                                    Select one option
                                                </p>
                                                {departments.map(dept => (
                                                    <button
                                                        key={dept}
                                                        onClick={() => handleDepartmentSelect(dept)}
                                                        className={`${selectionButtonClass} cursor-pointer ${selectedDepartments.includes(dept)
                                                            ? selectionButtonSelectedClass
                                                            : selectionButtonUnselectedClass
                                                            }`}
                                                    >
                                                        {deptDisplayName(dept)}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Step 2: Domain Selection */}
                                        {stepNum === 2 && (
                                            <div style={{ display: 'grid', gap: '10px' }}>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-1">
                                                    Select one option
                                                </p>
                                                {domains.length > 0 ? domains.map(domain => (
                                                    <button
                                                        key={domain}
                                                        onClick={() => handleDomainSelect(domain)}
                                                        className={`${selectionButtonClass} cursor-pointer ${selectedDomains.includes(domain)
                                                            ? selectionButtonSelectedClass
                                                            : selectionButtonUnselectedClass
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
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-1">
                                                    Select one option
                                                </p>
                                                {subjects.length > 0 ? subjects.map(subject => (
                                                    <button
                                                        key={subject}
                                                        onClick={() => handleSubjectSelect(subject)}
                                                        className={`${selectionButtonClass} ${selectedSubjects.includes(subject)
                                                            ? selectionButtonSelectedClass
                                                            : selectionButtonUnselectedClass
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
                                                        className={`w-full p-3 lg:p-4 rounded-lg text-left font-semibold transition-all duration-200 hover:-translate-y-0.5 ${selectedSlots.includes(slot)
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
                                                <p className={`text-xs font-semibold uppercase tracking-wide text-gray-700 mb-1 ${selectionError ? 'mt-1' : ''}`}>
                                                    Select one or more options
                                                </p>
                                                {faculties.length > 0 ? faculties.map((faculty, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleFacultySelect(faculty)}
                                                        className={`${selectionButtonClass} ${selectedFaculties.includes(faculty)
                                                            ? selectionButtonSelectedClass
                                                            : selectionButtonUnselectedClass
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

                                                <div className="bg-white/50 rounded-lg p-4 shadow-sm border border-white/60">
                                                    <p className="text-sm font-bold text-gray-800 mb-3">Your Faculty Preferences:</p>
                                                    {savedFacultyPreferences.length > 0 ? (
                                                        <div style={{ display: 'grid', gap: '8px' }}>
                                                            {savedFacultyPreferences.map((faculty, idx) => (
                                                                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                                                                    <span className="text-sm font-bold text-gray-900">{faculty}</span>
                                                                    <div className="flex gap-2 items-center">
                                                                        <button
                                                                            onClick={() => moveFacultyUp(idx)}
                                                                            disabled={idx === 0}
                                                                            className={`px-2 py-1 rounded border ${idx === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-100"}`}
                                                                        >
                                                                            ↑
                                                                        </button>
                                                                        <button
                                                                            onClick={() => moveFacultyDown(idx)}
                                                                            disabled={idx === savedFacultyPreferences.length - 1}
                                                                            className={`px-2 py-1 rounded border ${idx === savedFacultyPreferences.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-100"}`}
                                                                        >
                                                                            ↓
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                const updated = savedFacultyPreferences.filter((_, i) => i !== idx);
                                                                                setSavedFacultyPreferences(updated);
                                                                            }}
                                                                            className="text-red-500 hover:text-red-700 font-bold ml-2 text-lg hover:bg-red-50 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </div>
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
                                     <div className="flex justify-between mt-auto pt-3 shrink-0 px-1 pb-1">
                                         <button
                                             onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                                             disabled={currentStep === 1}
                                             className={`w-10 h-10 flex items-center justify-center rounded-[10px] bg-white text-gray-900 shadow-sm transition-all duration-200 ${currentStep === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}`}
                                         >
                                             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                                         </button>
                                         
                                         {currentStep === 6 ? (
                                             <div className="flex w-full gap-2 px-2">
                                                 <button
                                                     onClick={(e) => { e.stopPropagation(); handleAddAnotherProfessor(); }}
                                                     title={'Reset to Step 3 and select another subject'}
                                                     className="flex-1 px-3 py-2 rounded-lg font-bold text-sm bg-white text-blue-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                                                 >
                                                     + Add another
                                                 </button>
                                                 <button
                                                     onClick={(e) => {
                                                         e.stopPropagation();
                                                         router.push('/courses');
                                                     }}
                                                     title={'Save current preference and view all courses'}
                                                     className="flex-1 px-4 py-2 rounded-lg font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                                                 >
                                                     Save & Continue →
                                                 </button>
                                             </div>
                                         ) : (
                                             <button
                                                 onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                                 disabled={!canProceed()}
                                                 className={`w-10 h-10 flex items-center justify-center rounded-[10px] bg-white text-gray-900 shadow-sm transition-all duration-200 cursor-pointer ${!canProceed() ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-md'}`}
                                             >
                                                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                             </button>
                                         )}
                                     </div>
                                 </div>
                             ) : (
                                 <div className="h-full flex flex-col items-center justify-center px-1 lg:px-2 py-5 lg:py-6">
                                     <span className="text-[1.9rem] font-bold text-black mb-3">{stepNum}</span>
                                     <div
                                         className="text-base lg:text-[18px] font-bold tracking-wide flex-1 flex items-center justify-center whitespace-nowrap"
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
            </div>
        </div>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#F5E6D3] py-6 px-[clamp(16px,2vw,32px)] w-full flex justify-center">
            <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4 w-full max-w-7xl">
                {/* LEFT - USER BOX */}
                <div className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                    {session?.user?.image ? (
                        <img src={session.user.image} alt="User avatar" className="w-9 h-9 rounded-lg border border-gray-100 shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                        <div className="w-9 h-9 bg-gray-300 rounded-lg flex items-center justify-center font-bold text-white text-sm shrink-0">
                            {session?.user?.name?.[0] || "?"}
                        </div>
                    )}
                    <span className="text-gray-800 text-sm font-bold truncate max-w-50 pr-2">
                        {session?.user?.name || "Guest"}
                    </span>
                </div>

                {/* CENTER - STEPS BOX */}
                <div className="bg-white rounded-xl p-2 shadow-sm flex flex-wrap justify-center items-center gap-2 w-full sm:w-auto order-last md:order-0 mt-2 md:mt-0">
                    {[1, 2, 3, 4].map((num) => (
                        <button
                            key={num}
                            onClick={() => {
                                if (num === 1) router.push('/preferences');
                                if (num === 2) router.push('/courses');
                                if (num === 3) router.push('/timetable');
                                if (num === 4) router.push('/saved');
                            }}
                            className={`h-9.5 flex items-center justify-center rounded-md font-bold text-sm cursor-pointer transition-colors border-none ${
                                num === 1
                                    ? 'bg-[#A0C4FF] text-black px-4 min-w-9.5'
                                    : 'bg-[#A0C4FF]/40 text-black min-w-9.5'
                            }`}
                        >
                            {num === 1 ? '1. Preferences' : num}
                        </button>
                    ))}
                </div>

                {/* RIGHT - ACTION BOX */}
                <div className="flex gap-3 justify-end shrink-0 ml-auto mr-auto sm:mr-0 mt-2 sm:mt-0">
                    <button
                        onClick={() => {
                            deleteCookie('editingTimetableId');
                            router.push('/');
                        }}
                        className="px-8 py-3 bg-[#f1eacb] hover:bg-[#E8DDB8] border-2 border-[#A0C4FF] rounded-[10px] font-bold text-sm text-black transition-all duration-200"
                    >
                        Previous
                    </button>
                    <button
                        onClick={handleNext}
                        className="px-10 py-3 bg-[#A0C4FF] hover:bg-[#90B4EF] rounded-[10px] font-bold text-sm text-black transition-all duration-200 cursor-pointer"
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
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.5);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #ffffff;
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
        </>
    );
}
