"use client";
import React, { useState } from "react";
import Image from "next/image";
import "./landing.css"; // Ensure standard normal CSS is imported
import LoginModal from "../components/loginPopup"
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { clearPlannerClientCache } from "@/lib/clientCache";

export default function LandingPage() {
  const [open, setOpen] = useState(false);
  const [isCalendarAnimating, setIsCalendarAnimating] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [showLogin, setShowLogin] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = React.useCallback(() => {
    clearPlannerClientCache({ includeEditingState: true });
    signOut({ callbackUrl: "/" });
  }, []);

  // Inactivity Logout Logic (e.g., 30 minutes of inactivity)
  React.useEffect(() => {
    if (!session) return;

    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        handleLogout();
      }, 30 * 60 * 1000); // 30 minutes
    };

    // Track user activity
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);
    window.addEventListener("scroll", resetTimer);

    resetTimer(); // Initialize timer

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("scroll", resetTimer);
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, [session, handleLogout]);

  const handleCalendarClick = () => {
    setIsCalendarAnimating(true);
    setTimeout(() => {
      setIsCalendarAnimating(false);
    }, 1000);
  };

  return (
    <div className="landing-page">
      {/* Top Banner and Hero */}
      <div className="white-container">
        <nav className="navbar">
          <div className="logo">FFCS</div>
          {session ? (
            <div className="relative">
              <div
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {session.user?.image && (
                  <img src={session.user.image} alt="avatar" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                )}
                <span className="font-semibold text-black pr-8">{session.user?.name}</span>
                <span className={`text-black transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} style={{ marginLeft: '-25px', position: 'relative', top: '2px' }}>⌄</span>
              </div>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2 animate-lucid-fade-up">
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-red-600 font-bold hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer"
                      onClick={handleLogout}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button className="login-btn" onClick={() => setShowLogin(true)}>Login</button>
          )}
        </nav>
        {showLogin && (
          <LoginModal onClose={() => setShowLogin(false)} />
        )}

        <section className="hero-section">
          <div className="hero-text">
            <h1>Build Your<br />Timetable</h1>
            <p>
              Plan your perfect timetable with our intuitive<br />
              course selection and slot management tools
            </p>
            <div className="hero-buttons">
              <button className="btn-primary" onClick={() => setOpen(true)}>Get Started</button>
              {open && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
                  <div className="flex items-center justify-center w-[949px] h-[511px] bg-[#FFFCEE] rounded-[20px] shadow-xl p-8 relative">
                    <div className="relative bg-[#FAFAFA] w-[900px] h-[459px] flex flex-col items-center rounded-[20px] p-10 shadow-[4px_4px_4px_rgba(191,191,191,0.25)]">
                      <button onClick={() => setOpen(false)} className="absolute top-6 right-6 text-gray-500 hover:text-black text-[28px]">✕</button>
                      <h2 className="text-[32px] font-semibold text-center mb-2 absolute top-[50px]">
                        Welcome {session?.user?.name ? `back, ${session.user.name}` : "to FFCS"}!
                      </h2>
                      <div className="w-[700px] h-[1px] bg-gray-300 mb-4 absolute top-[90px]"></div>
                      <p className="text-center text-[20px] mb-12 absolute top-[110px]">Choose what you&apos;d like to do next</p>
                      <div className="flex gap-14 absolute top-[180px]">
                        <button className="flex flex-col items-center justify-center bg-[#E9F3E8] border-[5px] border-[#D4F4E6] rounded-[16px] p-6 w-[290px] h-[200px] shadow hover:bg-green-200 transition text-black" onClick={() => { setOpen(false); router.push('/preferences'); }}>
                          <Image src="/create_new.png" alt="create" width={167} height={101} />
                          <p className="font-medium text-center">Create a new one</p>
                        </button>
                        <button
                          className="flex flex-col items-center justify-center bg-[#E9D5FF] border-[#F2D8FE] border-[5px] rounded-[16px] p-6 w-[290px] h-[200px] shadow hover:bg-purple-300 transition text-black"
                          onClick={() => {
                            if (!session) {
                              setOpen(false);
                              setShowLogin(true);
                            } else {
                              setOpen(false);
                              router.push("/saved");
                            }
                          }}
                        >
                          <Image src="/savedTimetable.png" alt="saved" width={167} height={101} unoptimized />
                          <p className="mt-4 font-medium text-center">
                            {session ? "View saved timetables" : "Log in to view saved timetables"}
                          </p>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <button className="btn-secondary" onClick={() => router.push('/slots')}>Slot View</button>
            </div>
          </div>
          <div className="hero-graphic">
            {/* Calendar pure CSS drawing */}
            <div className={`calendar-graphic ${isCalendarAnimating ? 'cal-fade-animation' : ''}`} onClick={handleCalendarClick} style={{ cursor: 'pointer' }}>
              <div className="cal-top">
                <div className="cal-tab" style={{ background: '#fbcfe8' }}></div>
                <div className="cal-tab" style={{ background: '#bfdbfe' }}></div>
                <div className="cal-tab" style={{ background: '#a7f3d0' }}></div>
                <div className="cal-tab" style={{ background: '#fde047' }}></div>
                <div className="cal-tab" style={{ background: '#c4b5fd' }}></div>
                <div className="cal-tab" style={{ background: '#bbf7d0' }}></div>
                <div className="cal-tab" style={{ background: '#fbcfe8' }}></div>
              </div>
              <div className="cal-grid">
                <div className="cal-box" style={{ background: '#93c5fd' }}></div>
                <div className="cal-box" style={{ background: '#fde047' }}></div>
                <div className="cal-box" style={{ background: '#bbf7d0' }}></div>
                <div className="cal-box" style={{ background: '#f3e8ff' }}></div>
                <div className="cal-box" style={{ background: '#fde047' }}></div>
                <div className="cal-box" style={{ background: '#fbcfe8' }}></div>

                <div className="cal-box" style={{ background: '#93c5fd' }}></div>
                <div className="cal-box" style={{ background: '#bbf7d0' }}></div>
                <div className="cal-box" style={{ background: '#fde047' }}></div>
                <div className="cal-box" style={{ background: '#bbf7d0' }}></div>
                <div className="cal-box" style={{ background: '#c4b5fd' }}></div>
                <div className="cal-box" style={{ background: '#fde047' }}></div>

                <div className="cal-box" style={{ background: '#93c5fd' }}></div>
                <div className="cal-box" style={{ background: '#bbf7d0' }}></div>
                <div className="cal-box" style={{ background: '#fde047' }}></div>
                <div className="cal-box" style={{ background: '#bbf7d0' }}></div>
                <div className="cal-box" style={{ background: '#c4b5fd' }}></div>
                <div className="cal-box" style={{ background: '#93c5fd' }}></div>

                <div className="cal-box" style={{ background: '#d8b4e2' }}></div>
                <div className="cal-box" style={{ background: '#fde047' }}></div>
                <div className="cal-box" style={{ background: '#bbf7d0' }}></div>
                <div className="cal-box" style={{ background: '#c4b5fd' }}></div>
                <div className="cal-box" style={{ background: '#bbf7d0' }}></div>
                <div className="cal-box" style={{ background: '#fde047' }}></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Middle Sections */}
      <div className="middle-section">
        {/* How It Works */}
        <div className="how-it-works-card">
          <h2>How This Site Works?</h2>

          <div className="video-box">
            <Image src="/section1-preview.png" alt="Demo" fill />
            <div className="play-icon"></div>
          </div>

          <div className="steps-list">
            <div className="step-item">
              <div className="step-number">1</div>
              <p className="step-text">
                Select your courses and preferences. Choose from available courses based on your specialization and academic requirements.
              </p>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <p className="step-text">
                View available time slots for each course and build your timetable without conflicts. Our tool helps you avoid scheduling overlaps.
              </p>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <p className="step-text">
                Save your timetable and share it with classmates. Export your final schedule for reference during FFCS registration.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="faq-card">
          <h2>Frequently asked questions:</h2>
          <div className="faq-list">
            {[
              {
                q: "Why to use this site?",
                a: "Our FFCS planner helps you make informed decisions before registering for courses. Plan ahead, avoid schedule conflicts, and save time during the actual FFCS registration process. It's designed specifically for VIT's course system."
              },
              {
                q: "Will it help me in my\nFFCS",
                a: "Yes, it helps you organize and plan your timetable seamlessly before the actual FFCS process begins."
              },
              {
                q: "Do I need to be a VIT student to use\nthis site?",
                a: "This tool is specifically designed for the FFCS system at VIT Chennai. However, anyone can try it out!"
              },
              {
                q: "Can I change my timetable\nafter saving?",
                a: "Yes, you can edit your saved timetables anytime. Make adjustments to your course selections and slot preferences before the FFCS registration deadline."
              }
            ].map((faq, index) => (
              <div
                key={index}
                className="faq-item"
                style={activeFaq === index ? { background: 'transparent', transition: 'background 0.3s ease' } : { cursor: 'pointer', transition: 'background 0.3s ease' }}
              >
                <div className="faq-question" onClick={() => setActiveFaq(activeFaq === index ? null : index)}>
                  <span>{faq.q.split('\n').map((line, i) => <React.Fragment key={i}>{line}{i === 0 && faq.q.includes('\n') ? <br /> : null}</React.Fragment>)}</span>
                  <span className="faq-icon" style={{ transform: activeFaq === index ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.4s ease' }}>⌄</span>
                </div>
                <div
                  style={{
                    maxHeight: activeFaq === index ? '200px' : '0px',
                    opacity: activeFaq === index ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'all 0.4s ease-in-out'
                  }}
                >
                  <div className="faq-answer">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer-container">
        <div className="footer-top">
          <div className="binding-rings">
            <div className="ring" style={{ background: '#fbcfe8' }}></div>
            <div className="ring" style={{ background: '#bfdbfe' }}></div>
            <div className="ring" style={{ background: '#a7f3d0' }}></div>
            <div className="ring" style={{ background: '#fde047' }}></div>
            <div className="ring" style={{ background: '#c4b5fd' }}></div>
            <div className="ring" style={{ background: '#bbf7d0' }}></div>
            <div className="ring" style={{ background: '#fbcfe8' }}></div>
          </div>
        </div>

        <div className="footer-main">
          <div className="footer-grid">
            <div className="f-block f-about">
              <h3>FFCS</h3>
              <p>
                The Flexible Fast Customized Schedule (FFCS) planning tool helps VIT Chennai students organize their course selections before registration. Create multiple timetables, compare schedules, and prepare for seamless FFCS registration with our intelligent course and slot management system.
              </p>
            </div>

            <div className="f-block f-buttons">
              <button className="f-btn f-btn-gen" onClick={() => router.push('/preferences')}>
                <Image src="/calendar_icon2.png" alt="calendar" width={32} height={32} />
                <span>Generate<br />timetable</span>
              </button>
              <button
                className="f-btn f-btn-saved"
                onClick={() => {
                  if (!session) {
                    setShowLogin(true);
                  } else {
                    router.push('/saved');
                  }
                }}
              >
                <Image src="/Clock.png" alt="clock" width={32} height={32} />
                <span>View saved<br />timetables</span>
              </button>
              <button className="f-btn f-btn-slots" onClick={() => router.push('/slots')}>
                <Image src="/slot_icon.png" alt="slot" width={32} height={32} />
                <span>View slots</span>
              </button>
              <button className="f-btn f-btn-team">
                <Image src="/team_icon.png" alt="team" width={32} height={32} />
                <span>View team</span>
              </button>
            </div>

            <div className="f-block f-graphics">
              <div className="floating-tile" style={{ background: '#f3e8ff', top: '15px', left: '15px', transform: 'rotate(-12deg)' }}>C</div>
              <div className="floating-tile" style={{ background: '#fef3c7', top: '55px', left: '45px', transform: 'rotate(8deg)' }}>D</div>
              <div className="floating-tile" style={{ background: '#d1fae5', top: '20px', left: '75px', transform: 'rotate(15deg)' }}>G</div>
              <div className="floating-tile" style={{ background: '#a7f3d0', top: '30px', right: '25px', transform: 'rotate(25deg)' }}>E</div>
              <div className="floating-tile" style={{ background: '#bfdbfe', top: '65px', right: '65px', transform: 'rotate(-18deg)' }}>B</div>
              <div className="floating-tile" style={{ background: '#fef08a', top: '85px', right: '15px', transform: 'rotate(-6deg)' }}>A</div>
              <div className="floating-tile" style={{ background: '#e9d5ff', top: '95px', left: '110px', transform: 'rotate(22deg)' }}>F</div>
            </div>

            <div className="f-block f-credits">
              Built with ❤️ by Microsoft Innovations Club
            </div>

            <div className="f-block f-updates">
              <input type="text" placeholder="Get updates" />
              <button>
                <Image src="/Vector.png" alt="bell" width={16} height={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
