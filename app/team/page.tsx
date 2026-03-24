"use client";
import React, { useState } from "react";
import Image from "next/image";
import "../landing.css"; // Ensure standard normal CSS is imported
import LoginModal from "../../components/loginPopup"
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { clearPlannerClientCache } from "@/lib/clientCache";

export default function TeamPage() {
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

  return (
    <div className="landing-page">
      {/* Top Banner and Hero */}
      <div className="white-container">
        <nav className="navbar">
          <div className="logo cursor-pointer" onClick={() => router.push('/')}>FFCS</div>
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
            <button className="login-btn" onClick={() => setShowLogin(true)}>Login with Google</button>
          )}
        </nav>
        {showLogin && (
          <LoginModal onClose={() => setShowLogin(false)} />
        )}

        <section className="hero-section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="hero-text" style={{ textAlign: 'center', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '40px', color: '#111827' }}>Meet Our Team</h1>
            
            <div className="team-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '24px',
              padding: '0 20px'
            }}>
              <div className="team-card bg-[#FAFAFA] rounded-2xl p-8 shadow-[4px_4px_10px_rgba(0,0,0,0.05)] border border-gray-100 transition-transform hover:-translate-y-1">
                <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center text-blue-600 text-2xl font-bold">
                  R
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Rahul</h3>
                <p className="text-gray-500 font-medium">Developer</p>
              </div>

              <div className="team-card bg-[#FAFAFA] rounded-2xl p-8 shadow-[4px_4px_10px_rgba(0,0,0,0.05)] border border-gray-100 transition-transform hover:-translate-y-1">
                <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center text-green-600 text-2xl font-bold">
                  T
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Team Member 2</h3>
                <p className="text-gray-500 font-medium">Role</p>
              </div>

              <div className="team-card bg-[#FAFAFA] rounded-2xl p-8 shadow-[4px_4px_10px_rgba(0,0,0,0.05)] border border-gray-100 transition-transform hover:-translate-y-1">
                <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center text-purple-600 text-2xl font-bold">
                  T
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Team Member 3</h3>
                <p className="text-gray-500 font-medium">Role</p>
              </div>
              <div className="team-card bg-[#FAFAFA] rounded-2xl p-8 shadow-[4px_4px_10px_rgba(0,0,0,0.05)] border border-gray-100 transition-transform hover:-translate-y-1">
                <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center text-purple-600 text-2xl font-bold">
                  T
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Team Member 3</h3>
                <p className="text-gray-500 font-medium">Role</p>
              </div>
              <div className="team-card bg-[#FAFAFA] rounded-2xl p-8 shadow-[4px_4px_10px_rgba(0,0,0,0.05)] border border-gray-100 transition-transform hover:-translate-y-1">
                <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center text-purple-600 text-2xl font-bold">
                  T
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Team Member 3</h3>
                <p className="text-gray-500 font-medium">Role</p>
              </div>
              <div className="team-card bg-[#FAFAFA] rounded-2xl p-8 shadow-[4px_4px_10px_rgba(0,0,0,0.05)] border border-gray-100 transition-transform hover:-translate-y-1">
                <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center text-purple-600 text-2xl font-bold">
                  T
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Team Member 3</h3>
                <p className="text-gray-500 font-medium">Role</p>
              </div>
            </div>
          </div>
        </section>
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
              <button className="f-btn f-btn-team" onClick={() => router.push('/team')}>
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
